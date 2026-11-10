"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, List } from "lucide-react";

export interface GuideTocItem {
  id: string;
  title: string;
}

interface GuideTocProps {
  items: GuideTocItem[];
  /** "desktop" = kolom kanan menempel (xl ke atas); "mobile" = bar horizontal menempel di atas */
  variant: "desktop" | "mobile";
}

/** Menandai bagian yang sedang dibaca berdasarkan posisi scroll */
function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState<string>(ids[0] || "");
  const key = ids.join("|");

  useEffect(() => {
    const sectionIds = key.split("|").filter(Boolean);
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        if (visible.size > 0) {
          // Bagian teratas yang masuk area baca
          const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActiveId(top);
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 }
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);

  return [activeId, setActiveId] as const;
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
}

export function GuideToc({ items, variant }: GuideTocProps) {
  const [activeId, setActiveId] = useActiveSection(items.map((i) => i.id));
  const barRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, items.findIndex((i) => i.id === activeId));

  // Bar HP: geser chip aktif ke tengah tanpa ikut menggulir halaman
  useEffect(() => {
    if (variant !== "mobile") return;
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`);
    if (!bar || !chip) return;
    bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [activeId, variant]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActiveId(id);
    scrollToSection(id);
  };

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Daftar isi"
        className="xl:hidden sticky top-[57px] md:top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 py-2 bg-[#F9F9F8]/95 dark:bg-[#09090b]/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
            <List className="w-3.5 h-3.5" />
            {activeIndex + 1}/{items.length}
          </span>
          <div ref={barRef} className="flex gap-1.5 overflow-x-auto no-scrollbar [scrollbar-width:none]">
            {items.map((item, i) => {
              const active = item.id === activeId;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  data-toc-id={item.id}
                  onClick={(e) => handleClick(e, item.id)}
                  aria-current={active ? "true" : undefined}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-[#B22234] border-[#B22234] text-white"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {i + 1}. {item.title}
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <aside aria-label="Daftar isi" className="hidden xl:block sticky top-6 self-start">
      <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 shadow-xs max-h-[calc(100vh-3rem)] overflow-y-auto">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          <List className="w-3.5 h-3.5" /> Daftar Tutorial
        </p>
        <ol className="space-y-0.5">
          {items.map((item, i) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleClick(e, item.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex gap-2 pl-2.5 pr-2 py-1.5 rounded-md border-l-2 text-xs leading-snug transition-colors ${
                    active
                      ? "border-[#B22234] bg-[#FCF2F3] dark:bg-rose-950/30 text-[#B22234] dark:text-rose-400 font-semibold"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <span className="font-mono text-[11px] opacity-70 shrink-0">{i + 1}.</span>
                  <span>{item.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setActiveId(items[0]?.id || "");
          }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ArrowUp className="w-3 h-3" /> Kembali ke atas
        </button>
      </div>
    </aside>
  );
}
