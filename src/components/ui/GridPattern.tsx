import React from "react";
import { cn } from "@/utils/cn";
import { motion } from "motion/react";

export function GridPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white" />
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,rgba(255,255,255,0),rgba(255,255,255,0.8))]"
      />
    </div>
  );
}
