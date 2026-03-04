"use client";

import Link from "next/link";
import type { DepartmentStats, DeanStatsUser } from "@/lib/enrollment";
import { cn } from "@/lib/utils";

type PropsType = {
  user: DeanStatsUser | null;
  selectedDepartmentId?: string;
  /** When set, these departments are shown as selected (bordered) from MasterFilter. */
  masterFilterDepartmentIds?: string[];
  /** Stats from enrollment or server; when empty, nothing is rendered. */
  stats?: DepartmentStats[] | null;
};

function buildDepartmentUrl(departmentId: string): string {
  return `/?selected_alert=all&department=${encodeURIComponent(departmentId)}`;
}

export function DeanDepartmentStats({
  user,
  selectedDepartmentId,
  masterFilterDepartmentIds,
  stats = null,
}: PropsType) {
  if (!user || user.role !== "dean") return null;

  const list = stats ?? [];
  if (!list.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((d) => {
        const isSelected =
          (masterFilterDepartmentIds?.length
            ? masterFilterDepartmentIds.includes(d.departmentId)
            : selectedDepartmentId === d.departmentId);
        return (
          <Link
            key={d.departmentId}
            href={buildDepartmentUrl(d.departmentId)}
            className={cn(
              "inline-flex bg-white flex-col rounded-lg border px-4 py-3 shadow-1 dark:bg-gray-dark transition hover:border-primary/50 hover:shadow dark:border-stroke-dark dark:hover:border-primary/50",
              "min-w-[160px]",
              isSelected
                ? "border-2 border-primary dark:border-primary"
                : "border-stroke"
            )}
          >
            <span className="text-body-sm font-semibold text-dark dark:text-white">
              {d.departmentName}{" "}
              <span className="text-body-base dark:text-dark-5">({d.total})</span>
            </span>
            <span className="text-body-base text-dark-6 space-x-2 dark:text-dark-5">
              Att:{" "}
              <span className={cn("text-amber-500 dark:text-amber-500 font-bold", d.yellowAttendance > 0 ? "text-amber-500 dark:text-amber-500" : "text-gray-600 dark:text-gray-400")}>
                {d.yellowAttendance}
              </span>
              {" | "}
              <span className={cn("text-red-500 font-bold", d.redAttendance > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>
                {d.redAttendance}
              </span>
              {" · "}
              GPA:{" "}
              <span className={cn("text-amber-500 dark:text-amber-500 font-bold", d.yellowGpa > 0 ? "text-amber-500 dark:text-amber-500" : "text-gray-600 dark:text-gray-400")}>
                {d.yellowGpa}
              </span>
              {" | "}
              <span className={cn("text-red-500 font-bold", d.redGpa > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>
                {d.redGpa}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
