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

  const stats = await getDeanDepartmentStats(user.faculty_id, {
    ...(selectedDepartmentId ? { departmentIds: [selectedDepartmentId] } : {}),
  });
  if (!stats.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((d) => (
        <Link
          key={d.departmentId}
          href={buildDepartmentUrl(d.departmentId)}
          className={cn(
            "inline-flex bg-white flex-col rounded-lg border border-stroke px-4 py-3 shadow-1 dark:bg-gray-dark transition hover:border-primary/50 hover:shadow dark:border-stroke-dark dark:hover:border-primary/50",
            "min-w-[160px]"
          )}
        >
          <span className="text-body-sm font-semibold text-dark dark:text-white">
            {d.departmentName} <span className="text-body-base dark:text-dark-5">({d.total})</span>
          </span>
          <span className="text-body-base text-dark-6 space-x-2 dark:text-dark-5">
            Att: <span className="text-amber-500 dark:text-amber-500 font-bold">{d.yellowAttendance}</span>
            {" | "}
            <span className="text-red-500 font-bold">{d.redAttendance}</span>
            {" · "}
            GPA: <span className="text-amber-500 dark:text-amber-500 font-bold">{d.yellowGpa}</span>
            {" | "}
            <span className="text-red-500 font-bold">{d.redGpa}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
