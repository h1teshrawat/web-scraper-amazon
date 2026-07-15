"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { FiArrowRight, FiChevronRight, FiLink, FiShield, FiZap } from "react-icons/fi";

import { LoadingIndicator } from "@/components/loading-indicator";
import { ResultsCards } from "@/components/results-cards";
import { SearchHistory } from "@/components/search-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { getApiErrorMessage, scrapeProduct, type ProductResult } from "@/lib/api";
import { clearSearchHistory, getSearchHistory, saveSearchHistory, type SearchHistoryItem } from "@/lib/search-history";

type Theme = "dark" | "light";

function isAmazonProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^([a-z0-9-]+\.)*amazon\.[a-z.]+$/i.test(url.hostname) && /\/(dp|gp\/product|gp\/aw\/d)\/[a-z0-9]{10}/i.test(url.pathname);
  } catch {
    return false;
  }
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sociomonkey-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.body.dataset.theme = savedTheme;
    }
    setHistory(getSearchHistory());
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.body.dataset.theme = nextTheme;
    window.localStorage.setItem("sociomonkey-theme", nextTheme);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAmazonProductUrl(url)) {
      setError("Enter a valid Amazon product URL to continue.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);
    try {
      const scrapedProduct = await scrapeProduct(url);
      setResult(scrapedProduct);
      setHistory(saveSearchHistory(scrapedProduct));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  const selectHistoryItem = (item: SearchHistoryItem) => {
    setUrl(item.result.product_url);
    setResult(item.result);
    setError("");
  };

  const removeSearchHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <main className="app-shell relative min-h-screen overflow-hidden px-5 py-5 sm:px-8 sm:py-8">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="flex items-center justify-between" aria-label="Main navigation">
          <a href="#top" className="flex items-center gap-3 text-white dark-mode-light:text-slate-900">
            <span className="grid h-10 w-10 place-items-center" aria-hidden="true">
              <Image src="/images/sociomoneky.webp" alt="" width={40} height={40} priority />
            </span>
            <span className="text-base font-bold tracking-tight">SocioMonkey</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 dark-mode-light:text-slate-600 sm:block">Product intelligence</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </nav>

        <section id="top" className="grid items-center gap-14 pb-16 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-28">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="glass-badge"><FiZap className="text-amber" />Amazon product intelligence</div>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-white dark-mode-light:text-slate-900 sm:text-6xl lg:text-7xl">Product research,<br /><span className="text-gradient">beautifully distilled.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 dark-mode-light:text-slate-600 sm:text-lg">Transform one Amazon listing into the product details that matter. Clear, focused, and built for fast decisions.</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-400 dark-mode-light:text-slate-600">
              <span className="inline-flex items-center gap-2"><FiShield className="text-emerald-400" />One product at a time</span>
              <span className="inline-flex items-center gap-1 text-slate-500 dark-mode-light:text-slate-500">Clean data <FiChevronRight size={14} /> no clutter</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.08 }} className="glass-panel relative overflow-hidden p-5 sm:p-7">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-amber/10 blur-3xl" />
            <p className="relative text-sm font-semibold text-white dark-mode-light:text-slate-900">Start with a product link</p>
            <p className="relative mt-2 text-sm leading-6 text-slate-400 dark-mode-light:text-slate-600">Paste any supported Amazon product URL and let the workspace do the organizing.</p>
            <form onSubmit={handleSubmit} className="relative mt-7" noValidate>
              <label htmlFor="product-url" className="sr-only">Amazon product URL</label>
              <div className="glass-input flex items-center gap-3 p-2 pl-4">
                <FiLink className="shrink-0 text-amber" aria-hidden="true" />
                <input id="product-url" value={url} onChange={(event) => { setUrl(event.target.value); setError(""); }} type="url" placeholder="amazon.com/dp/..." className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-500 dark-mode-light:text-slate-900" aria-invalid={Boolean(error)} />
                <button type="submit" disabled={isLoading} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber disabled:cursor-wait disabled:opacity-70 sm:px-5">
                  {isLoading ? "Scraping" : "Scrape product"}<FiArrowRight aria-hidden="true" />
                </button>
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-red-300 dark-mode-light:text-red-600">{error}</p>}
            </form>
            <div className="relative mt-6 flex items-center gap-2 text-xs text-slate-500 dark-mode-light:text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Built for a single public Amazon product page</div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-5xl pb-12" aria-label="Product results">
          <SearchHistory history={history} onSelect={selectHistoryItem} onClear={removeSearchHistory} />
          {isLoading ? <LoadingIndicator /> : <ResultsCards result={result ?? undefined} />}
        </section>
      </div>
    </main>
  );
}
