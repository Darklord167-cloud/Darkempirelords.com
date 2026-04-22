"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TerminalSquare } from "lucide-react";
import { motion } from "motion/react";

export default function OraclePage() {
  const [messages, setMessages] = useState<{ role: "user" | "oracle"; content: string }[]>([
    { role: "oracle", content: "I am the Oracle of Dark Empire Holdings. State your query." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessages((prev) => [...prev, { role: "oracle", content: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "oracle", content: err.message || "Communication disrupted." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-24 bg-background relative overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      <div className="container px-6 max-w-3xl mx-auto relative z-10 flex-1 flex flex-col">
        <div className="text-center mb-8">
          <TerminalSquare className="h-12 w-12 text-primary mx-auto mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white uppercase tracking-widest text-glow">
            The Oracle
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto mb-6 p-6 bg-white/5 border border-white/10 rounded-xl space-y-6 max-h-[60vh] custom-scrollbar">
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <span className="text-xs text-muted-foreground font-mono mb-1 uppercase tracking-wider">
                {msg.role === "user" ? "Operative" : "Oracle"}
              </span>
              <div
                className={`max-w-[85%] p-4 rounded-xl font-sans ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-black/50 border border-primary/50 text-white/90 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex flex-col items-start">
              <span className="text-xs text-primary font-mono mb-1 uppercase tracking-wider animate-pulse">
                Oracle Processing...
              </span>
              <div className="p-4 rounded-xl bg-black/50 border border-primary/50 text-white/90">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex gap-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Awaiting query..."
            className="flex-1 bg-white/5 border border-white/10 text-white focus:border-primary/50 h-14 text-lg placeholder:text-white/20 font-mono"
            disabled={loading}
          />
          <Button
            type="submit"
            className="h-14 px-8 bg-primary hover:bg-primary/80 font-bold uppercase tracking-widest"
            disabled={loading}
          >
            Transmit
          </Button>
        </form>
      </div>
    </div>
  );
}
