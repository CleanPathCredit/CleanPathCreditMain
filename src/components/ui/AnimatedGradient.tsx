import React from "react";
import { motion } from "motion/react";

export function AnimatedGradient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-100/40 via-blue-100/40 to-purple-100/40 blur-3xl mix-blend-multiply"
      />
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.4, 0.2],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-1/2 right-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-rose-100/30 via-orange-100/30 to-yellow-100/30 blur-3xl mix-blend-multiply"
      />
    </div>
  );
}
