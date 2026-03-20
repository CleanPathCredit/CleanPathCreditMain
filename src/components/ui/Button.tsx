import { HTMLMotionProps, motion } from "motion/react";
import { cn } from "@/utils/cn";
import React, { ReactNode } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-900",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-100",
    outline: "border border-zinc-200 bg-transparent text-zinc-900 hover:bg-zinc-50 focus:ring-zinc-200",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {variant === "primary" && (
        <span className="absolute inset-0 z-0 overflow-hidden rounded-full">
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-20"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </span>
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
