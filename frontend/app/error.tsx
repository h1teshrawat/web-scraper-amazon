"use client";

import { useEffect } from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default function ErrorPage({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-shell grid min-h-screen place-items-center p-6">
      <section className="glass-panel max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-400/15 text-2xl text-red-300"><FiAlertTriangle /></div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-amber">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-bold text-white">The workspace hit an unexpected issue.</h1>
        <p className="mt-4 leading-7 text-slate-400">Your product data has not been changed. Try loading this page again.</p>
        <button type="button" onClick={reset} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-amber"><FiRefreshCw />Try again</button>
      </section>
    </main>
  );
}
