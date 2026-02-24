"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

type Props = { children: ReactNode };

/**
 * Wraps the student list so that when a <details> summary is clicked,
 * we update the URL ?expanded= param. Each details must have data-section-id set.
 */
export function ExpandableListUrlSync({ children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "SUMMARY") return;
      const details = target.closest("details");
      const id = details?.getAttribute("data-section-id");
      if (!id) return;
      e.preventDefault();
      const current = searchParams.get("expanded")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
      const isOpen = details?.getAttribute("open") != null;
      const next = isOpen ? current.filter((x) => x !== id) : [...current, id];
      const nextParams = new URLSearchParams(searchParams);
      if (next.length) nextParams.set("expanded", next.join(","));
      else nextParams.delete("expanded");
      router.push(`/?${nextParams.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("click", handleClick as EventListener);
    return () => el.removeEventListener("click", handleClick as EventListener);
  }, [handleClick]);

  return <div ref={ref}>{children}</div>;
}
