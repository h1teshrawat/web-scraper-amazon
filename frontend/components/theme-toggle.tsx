"use client";

import { motion } from "framer-motion";
import { FiMoon, FiSun } from "react-icons/fi";

interface ThemeToggleProps {
  theme: "dark" | "light";
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative flex h-10 w-[74px] items-center rounded-full border border-white/10 bg-white/5 p-1 text-slate-300 backdrop-blur-xl transition hover:border-white/20 dark-mode-light:border-slate-300/70 dark-mode-light:bg-white/70 dark-mode-light:text-slate-700"
    >
      <motion.span
        animate={{ x: isDark ? 32 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-950 shadow-lg"
      >
        {isDark ? <FiMoon size={15} /> : <FiSun size={15} />}
      </motion.span>
      <span className="sr-only">Theme toggle</span>
    </button>
  );
}
