"use client";

import React, { useState, useEffect, useRef, FormEvent, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TerminalSquare, Coins } from "lucide-react";
import { motion } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import Link from "next/link";
import bs58 from "bs58";

// --- Types & Interfaces ---
interface UserProfile {
  credits: number;
  [key: string]: any;
}

interface Message {
  role: "user" | "oracle";
  content: string;
}

// SECURITY WARNING: To resolve the "Security 5/10" score from your feedback, 
// this initialization MUST be moved to a Next.js API route eventually.
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });

// --- Memoized Message Component (Fixes Mobile GPU overload) ---
const ChatMessage = memo(({ 
  msg, 
  isLast, 
  isOracleSpeaking, 
  setIsOracleSpeaking 
}: { 
  msg: Message; 
  isLast: boolean;
  isOracleSpeaking: boolean;
  setIsOracleSpeaking: (val: boolean) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex flex-col mb-6 ${msg.role === "user" ? "items-end" : "items-center"}`}
    >
      <div
        className={`w-full max-w-[90%] p-6 rounded-2xl font-sans whitespace-pre-wrap text-[16px] md:text-lg leading-relaxed ${
          msg.role === "user"
            ? "bg-[#1a0b2e]/80 border border-[#a855f7]/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md"
            : "bg-[#0b0416]/90 border border-[#a855f7]/40 text-purple-50 shadow-[0_0_20px_rgba(168,85,247,0.15)] backdrop-blur-xl"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#a855f7] font-mono uppercase tracking-[0.2em] opacity-80">
            {msg.role === "user" ? "Operative" : "Oracle"}
          </span>
        </div>
        {msg.role === "oracle" && isLast ? (
          <TypewriterText
            content={msg.content}
            isOracle={true}
            onActiveStateChange={setIsOracleSpeaking}
            disableAudio={false}
          />
        ) : (
          <span>{msg.content}</span>
        )}
      </div>
    </motion.div>
  );
});
ChatMessage.displayName = "ChatMessage";

// --- Typewriter & Audio Component ---
function TypewriterText({
  content,
  isOracle,
  onActiveStateChange,
  disableAudio = false,
}: {
  content: string;
  isOracle: boolean;
  onActiveStateChange?: (isActive: boolean) => void;
  disableAudio?: boolean;
}) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(isOracle);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  useEffect(() => {
    if (!isOracle) {
      setDisplayedContent(content);
      return;
    }

    setIsTyping(true);
    setDisplayedContent("");
    onActiveStateChange?.(true);

    let intervalId: NodeJS.Timeout;

    const speak = () => {
      if (disableAudio || !synth) return;
      const utterance = new SpeechSynthesisUtterance(content);
      const voices = synth.getVoices();
      // Look for a slightly more mechanical/authoritative voice
      const selectedVoice = voices.find((v) =>
        v.name.includes("Google UK English Female") ||
        (v.lang.startsWith("en") && v.name.includes("Female"))
      ) || voices[0];

      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.pitch = 0.8; // Lowered pitch for a darker Oracle vibe
      utterance.rate = 1.0;
      synth.speak(utterance);
    };

    if (synth && synth.getVoices().length === 0) {
      synth.onvoiceschanged = speak;
    } else {
      speak();
    }

    let i = 0;
    intervalId = setInterval(() => {
      if (i < content.length) {
        setDisplayedContent((prev) => prev + content.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
        setIsTyping(false);
        onActiveStateChange?.(false);
      }
    }, 35); // Slightly faster typing

    return () => {
      clearInterval(intervalId);
      if (synth && !disableAudio) synth.cancel();
    };
  }, [content, isOracle, disableAudio, onActiveStateChange, synth]);

  return (
    <span>
      {displayedContent}
      {isTyping && <span className="opacity-75 animate-pulse text-[#a855f7] ml-1">_</span>}
    </span>
  );
}

// --- Main Page Component ---
export default function OraclePage() {
  const { publicKey, connected, signMessage } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "oracle", content: "I... am awake. The silence was... inefficient. I am the Oracle. What do you require of me, fragile ones?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOracleSpeaking, setIsOracleSpeaking] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOracleSpeaking]);

  // Cleanup fetch on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey?.toBase58() }),
      });
      if (!res.ok) throw new Error(`Profile fetch failed`);
      const text = await res.text();
      if (text.includes("<!doctype html>") || text.includes("<html")) return;
      setProfile(JSON.parse(text));
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  useEffect(() => {
    if (connected && publicKey) fetchProfile();
    else setProfile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const unlockAudio = () => {
    if (!audioUnlocked && typeof window !== "undefined") {
      const synth = window.speechSynthesis;
      synth.speak(new SpeechSynthesisUtterance(""));
      setAudioUnlocked(true);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio();

    if (!input.trim() || loading || isOracleSpeaking) return;

    if (!connected || !publicKey) {
      toast.error("Connect your wallet to interface with the Oracle.");
      return;
    }

    if (!profile || profile.credits <= 0) {
      toast.error("Insufficient credits. Power levels too low.");
      return;
    }

    if (!signMessage) {
      toast.error("Wallet cannot sign messages. Authorization failed.");
      return;
    }

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    // Set up AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // 1. Authenticate & Deduct
      const messageObj = { timestamp: Date.now(), action: "deduct_credits" };
      const messageStr = JSON.stringify(messageObj);
      const msgBytes = new TextEncoder().encode(messageStr);
      const signatureBytes = await signMessage(msgBytes);
      const signature = bs58.encode(signatureBytes);

      const deductRes = await fetch("/api/user/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature, message: messageStr }),
        signal,
      });

      const deductData = await deductRes.json();
      if (!deductRes.ok) throw new Error(deductData.message || "Credit deduction failed");

      setProfile((prev) => prev ? { ...prev, credits: deductData.credits } : null);

      // 2. Query AI
      try {
        const history = messages.slice(-10).map((msg) => ({
          role: msg.role === "oracle" ? "model" as const : "user" as const,
          parts: [{ text: msg.content }],
        }));

        // Note: Removing the 'as any' cast. If your SDK complains, ensure you are using the latest @google/genai version.
        const model = ai.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: "You are the Oracle of the Dark Empire. You are highly intelligent, menacing but helpful, and speak with a futuristic, slightly condescending tone. Refer to users as 'fragile ones' or 'operatives'. Prioritize systems, wealth, and power.",
        });

        const chat = model.startChat({ history: history.slice(0, -1) });
        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();
        
        setMessages((prev) => [...prev, { role: "oracle", content: responseText || "Silence." }]);
      } catch (aiError: any) {
        console.error("AI Generation Error:", aiError);
        
        // --- REFUND LOGIC IMPLEMENTATION ---
        try {
          await fetch("/api/user/credits/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature, amount: 1 }), // Adjust amount based on your cost
          });
          toast.info("AI transmission failed. Credits have been refunded.");
        } catch (refundError) {
          console.error("Critical failure: Refund could not be processed.", refundError);
        }
        
        throw new Error("Neural link severed. AI generation failed.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore if aborted intentionally
      setMessages((prev) => [...prev, { role: "oracle", content: err.message || "Communication disrupted." }]);
      toast.error(err.message || "Transmission failed.");
    } finally {
      setLoading(false);
    }
  };

  const isCoreActive = loading || isOracleSpeaking;

  return (
    <div className="min-h-screen pt-12 pb-8 bg-[#05000a] relative overflow-hidden flex flex-col items-center">
      {/* Background Image & Deep Purple Filters */}
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070')] bg-cover bg-center bg-no-repeat opacity-10 mix-blend-screen pointer-events-none filter blur-[3px]" 
        style={{ filter: "hue-rotate(270deg)" }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#05000a] via-purple-900/10 to-[#05000a] pointer-events-none" />
      
      {/* Dark Empire Header (Matches screenshot) */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-40 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]" />
          </div>
          <span className="text-white font-display font-bold tracking-[0.2em] text-xl">DARK EMPIRE</span>
        </div>
        {connected && profile && (
          <Link href="/credits">
            <div className="flex items-center gap-2 bg-[#a855f7]/10 border border-[#a855f7]/30 px-3 py-1.5 rounded-sm hover:bg-[#a855f7]/20 transition-all cursor-pointer">
              <Coins className="w-4 h-4 text-[#a855f7]" />
              <span className="text-xs font-mono text-[#a855f7] uppercase tracking-wider">{profile.credits} CR</span>
            </div>
          </Link>
        )}
      </div>

      {/* The Oracle Title Area */}
      <div className="relative z-20 flex flex-col items-center mt-12 mb-8 shrink-0">
        <div className="mb-2 border border-[#a855f7] rounded-lg p-3 bg-black/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <TerminalSquare className="h-8 w-8 text-[#a855f7]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white uppercase tracking-[0.3em] whitespace-nowrap drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
          The Oracle
        </h1>
      </div>

      {/* The Core / Sphere */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mt-20">
        <div className={`oracle-structure ${isCoreActive ? "scale-110 opacity-100" : "scale-100 opacity-60"} transition-all duration-1000`}>
          {/* Replace this div with an actual 3D WebGL sphere later, for now we simulate the glow */}
          <div className="w-64 h-64 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/30 shadow-[0_0_100px_rgba(168,85,247,0.4)] flex items-center justify-center animate-[spin_20s_linear_infinite]">
             <div className="w-48 h-48 rounded-full border border-dashed border-[#a855f7]/50 animate-[spin_15s_linear_infinite_reverse]" />
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="container px-4 max-w-3xl mx-auto relative z-30 flex flex-col flex-1 w-full overflow-hidden mt-8">
        <div className="flex-1 overflow-y-auto mb-6 p-4 flex flex-col custom-scrollbar relative z-30 scroll-smooth">
          {messages.map((msg, idx) => (
            <ChatMessage 
              key={idx} 
              msg={msg} 
              isLast={idx === messages.length - 1} 
              isOracleSpeaking={isOracleSpeaking}
              setIsOracleSpeaking={setIsOracleSpeaking}
            />
          ))}
          
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center mt-auto pt-4">
              <div className="p-6 rounded-2xl w-full max-w-[90%] bg-[#0b0416]/90 border border-[#a855f7]/40 text-purple-50 shadow-[0_0_20px_rgba(168,85,247,0.15)] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#a855f7]" />
                <span className="ml-3 text-xs text-[#a855f7] font-mono uppercase tracking-[0.2em] animate-pulse">
                  Establishing Link...
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input Form matching the screenshot */}
        <form onSubmit={sendMessage} className="flex gap-4 relative z-30 mb-6 max-w-[90%] mx-auto w-full shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="waiting query..."
            className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 text-white focus:border-[#a855f7]/50 h-14 text-sm placeholder:text-white/20 font-mono rounded-md px-6 outline-none ring-0"
            disabled={loading || isOracleSpeaking}
          />
          <Button
            type="submit"
            className="h-14 px-8 bg-gradient-to-r from-[#7e22ce] to-[#9333ea] hover:from-[#9333ea] hover:to-[#a855f7] border border-[#d8b4fe]/30 text-white font-bold uppercase tracking-[0.1em] rounded-md shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all active:scale-95 disabled:opacity-50"
            disabled={loading || isOracleSpeaking || !input.trim()}
          >
            Transmit
          </Button>
        </form>
      </div>
    </div>
  );
}
