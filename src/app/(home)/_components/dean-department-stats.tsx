import Link from "next/link";
import { getDeanDepartmentStats } from "../fetch";
import type { AppUser } from "../fetch";
import { cn } from "@/lib/utils";

type PropsType = {
  user: AppUser | null;
};

export async function DeanDepartmentStats({ user }: PropsType) {
  if (!user || user.role !== "dean") return null;

  const stats = await getDeanDepartmentStats(user.faculty_id);
  if (!stats.length) return null;

  return (
    <div className="mt-4 border-t border-gray-3 pt-4">
    
      <div className="flex flex-wrap gap-2">
        {stats.map((d) => (
          <Link
            key={d.departmentId}
            href={`/?selected_alert=all&department=${encodeURIComponent(d.departmentId)}`}
            className={cn(
              "inline-flex flex-col rounded-lg border border-stroke px-4 py-3 shadow-sm bg-amber-50 dark:bg-gray-dark transition hover:border-primary/50 hover:shadow dark:border-stroke-dark dark:hover:border-primary/50",
              "min-w-[140px]"
            )}
          >
            <span className="text-body-sm font-semibold text-dark dark:text-white">
              {d.departmentName}
            </span>
           
            <span className="text-body-sm text-dark-6 dark:text-dark-5">
              GPA: <span className="text-amber-600 dark:text-amber-400">{d.yellowGpa}</span>
              {" | "}
              <span className="text-red">{d.redGpa}</span>
              {" · "}
              Att: <span className="text-amber-600 dark:text-amber-400">{d.yellowAttendance}</span>
              {" | "}
              <span className="text-red">{d.redAttendance}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
