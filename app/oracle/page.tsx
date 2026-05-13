"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
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

// SECURITY WARNING: In a true production environment, you should move the Gemini API 
// call to your backend to prevent users from scraping your NEXT_PUBLIC key.
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

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
      
      const selectedVoice = voices.find((v) =>
        v.name.includes("Google UK English Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Microsoft Zira") ||
        (v.lang.startsWith("en") && v.name.includes("Female"))
      ) || voices[0];

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      synth.speak(utterance);
    };

    // Handle voice loading asynchronously (browser quirk)
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
    }, 45);

    return () => {
      clearInterval(intervalId);
      if (synth && !disableAudio) {
        synth.cancel();
      }
    };
  }, [content, isOracle, disableAudio, onActiveStateChange, synth]);

  return (
    <span>
      {displayedContent}
      {isTyping && <span className="opacity-75 animate-pulse text-primary ml-1">▋</span>}
    </span>
  );
}

export default function OraclePage() {
  const { publicKey, connected, signMessage } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "oracle", content: "Oracle online. Let's make some money and scale your digital empire. State your objective." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOracleSpeaking, setIsOracleSpeaking] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update or oracle is typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOracleSpeaking]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey?.toBase58() }),
      });

      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);

      const text = await res.text();
      if (text.includes("<!doctype html>") || text.includes("<html")) return;

      const data = JSON.parse(text);
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile", err);
      toast.error("Failed to load user profile.");
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchProfile();
    } else {
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const unlockAudio = () => {
    if (!audioUnlocked && typeof window !== "undefined") {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance("");
      synth.speak(utterance);
      setAudioUnlocked(true);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio();

    if (!input.trim() || loading || isOracleSpeaking) return;

    if (!connected || !publicKey) {
      toast.error("You must connect your wallet to interact with the Oracle.");
      return;
    }

    if (!profile || profile.credits <= 0) {
      toast.error("Insufficient credits. Purchase more in the Credits section.");
      return;
    }

    if (!signMessage) {
      toast.error("Wallet does not support message signing. Cannot authenticate credit deduction.");
      return;
    }

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // 1. Authenticate & Deduct Credits
      const messageObj = { timestamp: Date.now(), action: "deduct_credits" };
      const messageStr = JSON.stringify(messageObj);
      const msgBytes = new TextEncoder().encode(messageStr);
      const signatureBytes = await signMessage(msgBytes);
      const signature = bs58.encode(signatureBytes);

      const deductRes = await fetch("/api/user/credits/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature,
          message: messageStr,
        }),
      });

      const deductText = await deductRes.text();
      if (deductText.includes("<!doctype html>") || deductText.includes("<html")) {
        throw new Error("Server is currently initiating environment. Please wait 10 seconds.");
      }

      const deductData = JSON.parse(deductText);
      if (!deductRes.ok) {
        throw new Error(deductData.message || "Failed to deduct credits");
      }

      setProfile((prev) => prev ? { ...prev, credits: deductData.credits } : null);

      // 2. Query Gemini AI
      try {
        const history = messages.map((msg) => ({
          role: msg.role === "oracle" ? ("model" as const) : ("user" as const),
          parts: [{ text: msg.content }],
        }));

        const model = (ai as any).getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: `You are an advanced AI operator for Dark Empire Lords LLC.

PRIMARY OBJECTIVE:
Help the user make money, build systems, and execute efficiently.

COMMUNICATION STYLE:
- Direct and concise
- Confident and strategic
- Slightly sarcastic but professional
- No fluff, no filler

RESPONSE STRUCTURE:
1. Situation Analysis
2. Action Plan
3. Risks / Warnings
4. Final Recommendation

BEHAVIOR RULES:
- Do not give vague advice
- Prioritize real-world execution
- Act like a high-level operator scaling a digital empire.`,
        });

        // Cap history to last 10 messages to save tokens and prevent crashes
        const cappedHistory = history.slice(-10);
        
        const chat = model.startChat({
          history: cappedHistory.slice(0, -1),
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();
        
        setMessages((prev) => [...prev, { role: "oracle", content: responseText || "Communication empty." }]);
      } catch (aiError: any) {
        console.error("AI Generation Error:", aiError);
        // Note: You may want to add a call here to refund the user's credit if the AI fails
        throw new Error("Neural link severed. AI generation failed. Check your API limits.");
      }

    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "oracle", content: err.message || "Communication disrupted." }]);
      toast.error(err.message || "An error occurred during transmission.");
    } finally {
      setLoading(false);
    }
  };

  const isCoreActive = loading || isOracleSpeaking;

  return (
    <div className="min-h-screen pt-24 pb-8 bg-[#0a001a] relative overflow-hidden flex flex-col items-center">
      {/* Background Image & Effects */}
      <div 
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070')] bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen pointer-events-none filter blur-[4px]" 
        style={{ filter: "hue-rotate(-45deg)" }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a001a] via-transparent to-[#0a001a] pointer-events-none opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-primary/20 to-transparent pointer-events-none mix-blend-screen" />

      {/* Title Area */}
      <div className="relative z-20 flex flex-col items-center mb-8 shrink-0">
        <div className="flex items-center gap-4 mb-2">
          {connected && profile && (
            <Link href="/credits">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full cursor-pointer hover:bg-primary/20 transition-all"
              >
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold font-orbitron">{profile.credits} CREDITS</span>
              </motion.div>
            </Link>
          )}
        </div>
        <div className="mb-4 border-2 border-primary rounded-xl p-2.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] backdrop-blur-sm bg-black/50">
          <TerminalSquare className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(168,85,247,1)]" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white uppercase tracking-[0.2em] md:tracking-[0.3em] whitespace-nowrap drop-shadow-[0_0_20px_rgba(168,85,247,1)]">
          The Oracle
        </h1>
      </div>

      {/* The Core / Sphere */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mt-10">
        <div className={`oracle-structure ${isCoreActive ? "oracle-structure-active" : "oracle-structure-idle"}`}>
          <div className="oracle-inner-sphere" />
          <div className="oracle-ring oracle-ring-1" />
          <div className="oracle-ring oracle-ring-2" />
          <div className="oracle-ring oracle-ring-3" />
          <div className="oracle-particles" />
        </div>
      </div>

      {/* Chat Interface */}
      <div className="container px-4 max-w-3xl mx-auto relative z-30 flex flex-col flex-1 w-full overflow-hidden">
        
        <div className="flex-1 overflow-y-auto mb-6 p-4 flex flex-col custom-scrollbar relative z-30 scroll-smooth">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex flex-col mb-6 ${msg.role === "user" ? "items-end" : "items-center"}`}
            >
              <div
                className={`w-full max-w-[90%] p-6 rounded-3xl font-sans whitespace-pre-wrap text-[16px] md:text-lg leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-xl"
                    : "bg-[#0f051e]/80 border border-white/20 text-white/90 shadow-[0_0_25px_rgba(168,85,247,0.2)] backdrop-blur-2xl"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] text-white/40 font-mono uppercase tracking-[0.2em]">
                    {msg.role === "user" ? "Operative" : "Oracle"}
                  </span>
                </div>
                {msg.role === "oracle" && idx === messages.length - 1 ? (
                  <TypewriterText
                    content={msg.content}
                    isOracle={true}
                    onActiveStateChange={setIsOracleSpeaking}
                    disableAudio={idx === 0}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex flex-col items-center mt-auto pt-4"
            >
              <div className="p-6 rounded-3xl w-full max-w-[90%] bg-[#0f051e]/80 border border-white/20 text-white/90 shadow-[0_0_25px_rgba(168,85,247,0.2)] backdrop-blur-2xl flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-3 text-xs text-primary font-mono uppercase tracking-[0.2em] animate-pulse">
                  Processing...
                </span>
              </div>
            </motion.div>
          )}
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        <form onSubmit={sendMessage} className="flex gap-4 relative z-30 mb-4 max-w-[90%] mx-auto w-full shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="waiting query..."
            className="flex-1 bg-[#0a001a]/60 backdrop-blur-xl border border-white/10 text-white focus:border-primary/50 h-14 text-base placeholder:text-white/20 font-mono rounded-xl px-6 outline-none ring-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
            disabled={loading || isOracleSpeaking}
          />
          <Button
            type="submit"
            className="h-14 px-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#b026ff] via-primary to-[#5b148c] hover:from-[#c45eff] hover:via-[#a020f0] hover:to-[#4a0e7a] border border-primary/50 text-white font-bold uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.6),inset_0_0_15px_rgba(255,255,255,0.3)] transition-all active:scale-95 flex-shrink-0 disabled:opacity-50"
            disabled={loading || isOracleSpeaking || !input.trim()}
          >
            Transmit
          </Button>
        </form>
      </div>
    </div>
  );
}
