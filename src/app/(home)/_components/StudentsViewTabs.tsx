"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { saveScrollBeforeFilterNav } from "./FilterScrollPreserve";

type ViewMode = "table" | "nested";

type Props = {
  currentView: ViewMode;
  className?: string;
};

export function StudentsViewTabs({ currentView, className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view: ViewMode) => {
    const next = new URLSearchParams(searchParams);
    if (view === "table") {
      next.delete("view");
    } else {
      next.set("view", view);
    }
    saveScrollBeforeFilterNav();
    router.replace(`/?${next.toString()}`, { scroll: false });
  };

  return (
    <div
      className={cn(
        "flex rounded-lg border border-stroke bg-gray-50 p-1 dark:border-dark-3 dark:bg-dark-2",
        className,
      )}
      role="tablist"
      aria-label="Students list view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={currentView === "table"}
        onClick={() => setView("table")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-colors",
          currentView === "table"
            ? "bg-white text-primary shadow-sm dark:bg-gray-dark dark:text-primary"
            : "text-dark-6 hover:text-dark dark:text-dark-5 dark:hover:text-white",
        )}
      >
        Table view
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={currentView === "nested"}
        onClick={() => setView("nested")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-colors",
          currentView === "nested"
            ? "bg-white text-primary shadow-sm dark:bg-gray-dark dark:text-primary"
            : "text-dark-6 hover:text-dark dark:text-dark-5 dark:hover:text-white",
        )}
      >
        Nested view
      </button>
    </div>
  );
}
