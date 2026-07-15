import Link from "next/link";
import { FiArrowLeft, FiSearch } from "react-icons/fi";

export default function NotFound() {
  return (
    <main className="app-shell grid min-h-screen place-items-center p-6">
      <section className="glass-panel max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber/15 text-2xl text-amber"><FiSearch /></div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-amber">404 · Not found</p>
        <h1 className="mt-3 text-3xl font-bold text-white">This page is not in the catalogue.</h1>
        <p className="mt-4 leading-7 text-slate-400">The link may be outdated, or the page may have moved.</p>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-amber"><FiArrowLeft />Back to workspace</Link>
      </section>
    </main>
  );
}
