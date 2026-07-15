import { motion } from "framer-motion";

export function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400" role="status" aria-live="polite">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.13 }}
          className="h-2 w-2 rounded-full bg-amber"
        />
      ))}
      <span className="ml-2">Scraping product details</span>
    </div>
  );
}
