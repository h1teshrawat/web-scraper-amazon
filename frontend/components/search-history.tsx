"use client";

import { FiClock, FiTrash2 } from "react-icons/fi";

import type { SearchHistoryItem } from "@/lib/search-history";

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

export function SearchHistory({ history, onSelect, onClear }: SearchHistoryProps) {
  if (!history.length) {
    return null;
  }

  return (
    <aside className="mx-auto mb-8 max-w-5xl rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl dark-mode-light:border-slate-200 dark-mode-light:bg-white/60 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white dark-mode-light:text-slate-900"><FiClock className="text-amber" />Recent searches</div>
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition hover:text-red-300 dark-mode-light:text-slate-600 dark-mode-light:hover:text-red-600"><FiTrash2 />Clear</button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {history.map((item) => (
          <button type="button" key={`${item.result.product_url}-${item.saved_at}`} onClick={() => onSelect(item)} className="min-w-52 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-left transition hover:border-amber/50 hover:bg-white/[0.07] dark-mode-light:border-slate-200 dark-mode-light:bg-white/80 dark-mode-light:hover:bg-amber/10">
            <span className="block truncate text-sm font-medium text-white dark-mode-light:text-slate-900">{item.result.title}</span>
            <span className="mt-1 block text-xs text-slate-400 dark-mode-light:text-slate-600">{item.result.asin} &middot; {new Date(item.saved_at).toLocaleDateString()}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
