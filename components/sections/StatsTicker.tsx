"use client";

import { motion } from "motion/react";

export function StatsTicker() {
  const stats = [
    { label: "CIRCULATING SUPPLY", value: "1,000,000,000 DEMP" },
    { label: "NETWORK", value: "SOLANA" },
    { label: "DEMP PRICE", value: "TBA" },
    { label: "MARKET CAP", value: "TBA" },
    { label: "LIQUIDITY STATUS", value: "LOCKED" },
    { label: "CONTRACT STATUS", value: "SOL VERIFIED" },
  ];

  return (
    <div className="w-full bg-primary/10 border-y border-primary/20 overflow-hidden py-3 backdrop-blur-sm relative z-30">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 25,
        }}
      >
        {[...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center mx-8 gap-3">
            <span className="text-primary font-mono text-xs font-bold tracking-widest opacity-70">
              {stat.label}
            </span>
            <span className="text-white font-heading font-bold text-lg">
              {stat.value}
            </span>
            <span className="text-white/20">{"///"}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
