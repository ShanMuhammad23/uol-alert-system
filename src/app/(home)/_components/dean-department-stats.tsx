import Link from "next/link";
import { getDeanDepartmentStats } from "../fetch";
import type { AppUser } from "../fetch";
import { cn } from "@/lib/utils";

type PropsType = {
  user: AppUser | null;
  selectedDepartmentId?: string;
};

function buildDepartmentUrl(departmentId: string): string {
  return `/?selected_alert=all&department=${encodeURIComponent(departmentId)}`;
}

export async function DeanDepartmentStats({
  user,
  selectedDepartmentId,
}: PropsType) {
  if (!user || user.role !== "dean") return null;

  const stats = await getDeanDepartmentStats(user.faculty_id, {});
  if (!stats.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((d) => {
        const isSelected = selectedDepartmentId === d.departmentId;
        return (
        <Link
          key={d.departmentId}
          href={buildDepartmentUrl(d.departmentId)}
          className={cn(
            "inline-flex bg-white flex-col rounded-lg border px-4 py-3 shadow-1 dark:bg-gray-dark transition hover:border-primary/50 hover:shadow dark:border-stroke-dark dark:hover:border-primary/50",
            "min-w-[160px]",
            isSelected
              ? "border-primary bg-primary/10 ring-2 ring-primary/30 dark:bg-primary/15 dark:ring-primary/40"
              : "border-stroke"
          )}
        >
          <span className="text-body-sm font-semibold text-dark dark:text-white">
            {d.departmentName} <span className="text-body-base dark:text-dark-5">({d.total})</span>
          </span>
          <span className="text-body-base text-dark-6 space-x-2 dark:text-dark-5">
            Att: <span className={cn("text-amber-500 dark:text-amber-500 font-bold", d.yellowAttendance > 0 ? "text-amber-500 dark:text-amber-500" : "text-gray-600 dark:text-gray-400")}>{d.yellowAttendance}</span>
            {" | "}
            <span className={cn("text-red-500 font-bold", d.redAttendance > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>{d.redAttendance}</span>
            {" · "}
            GPA: <span className="text-amber-500 dark:text-amber-500 font-bold">{d.yellowGpa}</span>
            {" | "}
            <span className={cn("text-red-500 font-bold", d.redGpa > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>{d.redGpa}</span>
          </span>
        </Link>
        );
      })}
    </div>
  );
}
