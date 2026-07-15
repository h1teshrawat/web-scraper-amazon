"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FiAward, FiCheck, FiClock, FiCopy, FiDownload, FiExternalLink, FiFileText, FiHash, FiShoppingBag, FiStar, FiTag } from "react-icons/fi";

import type { ProductResult } from "@/lib/api";
import { copyText, exportProduct } from "@/lib/product-tools";

interface ResultsCardsProps {
  result?: ProductResult;
}

const details = [
  { key: "price", label: "Price", icon: FiTag },
  { key: "seller", label: "Seller", icon: FiShoppingBag },
  { key: "asin", label: "ASIN", icon: FiHash },
  { key: "rating", label: "Rating", icon: FiStar },
  { key: "ratings_count", label: "Ratings", icon: FiStar },
  { key: "best_sellers_rank", label: "Best Sellers Rank", icon: FiAward },
] as const;

export function ResultsCards({ result }: ResultsCardsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: string) => {
    if (await copyText(value)) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  if (!result) {
    return (
      <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.025] p-7 text-center backdrop-blur-sm dark-mode-light:border-slate-400/50 dark-mode-light:bg-white/40 sm:p-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg text-amber dark-mode-light:border-slate-300 dark-mode-light:bg-white"><FiStar /></div>
        <h2 className="mt-5 text-xl font-semibold text-white dark-mode-light:text-slate-900">Your product results will appear here</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400 dark-mode-light:text-slate-600">Paste a supported Amazon product URL above to reveal its key listing details.</p>
      </section>
    );
  }

  const copyAll = () => handleCopy("all", JSON.stringify(result, null, 2));

  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-card backdrop-blur-2xl dark-mode-light:border-slate-200 dark-mode-light:bg-white/70 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber">Product intelligence</p>
          <h2 className="text-2xl font-bold leading-tight text-white dark-mode-light:text-slate-900">{result.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportProduct(result, "csv")} className="result-action"><FiDownload />CSV</button>
          <button type="button" onClick={() => exportProduct(result, "json")} className="result-action"><FiFileText />JSON</button>
          <button type="button" onClick={copyAll} className="result-action">{copiedKey === "all" ? <FiCheck className="text-emerald-400" /> : <FiCopy />}Copy all</button>
        </div>
      </div>
      <div className="mt-7 grid overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,2fr)] dark-mode-light:border-slate-200">
        <div className="flex min-h-64 items-center justify-center bg-white p-5 dark-mode-light:bg-slate-50">
          {result.image_url !== "Not Found" ? (
            <img src={result.image_url} alt={result.title} className="max-h-72 w-full object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-center text-sm text-slate-500"><FiShoppingBag className="mx-auto mb-3 text-3xl text-slate-400" />Product image unavailable</div>
          )}
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3 dark-mode-light:bg-slate-200">
          {details.map(({ key, label, icon: Icon }) => (
            <div key={key} className="min-h-28 bg-[#111722]/80 p-5 dark-mode-light:bg-white/85">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark-mode-light:text-slate-500"><span className="flex items-center gap-2"><Icon />{label}</span><button type="button" onClick={() => handleCopy(key, result[key])} aria-label={`Copy ${label}`} className="rounded p-1 transition hover:bg-white/10 hover:text-white dark-mode-light:hover:bg-slate-100">{copiedKey === key ? <FiCheck className="text-emerald-400" /> : <FiCopy />}</button></div>
              <p className="mt-3 break-words font-medium text-white dark-mode-light:text-slate-900">{result[key]}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 dark-mode-light:border-slate-200 dark-mode-light:text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2"><FiClock />Scraped {new Date(result.scraped_at).toLocaleString()}</span>
        <a href={result.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-white transition hover:text-amber dark-mode-light:text-slate-900">View product <FiExternalLink /></a>
      </div>
    </motion.section>
  );
}
