import Link from "next/link";
import { getDeanInstructorStats } from "../fetch";
import type { AppUser } from "../fetch";
import { cn } from "@/lib/utils";

type PropsType = {
  user: AppUser | null;
  selectedDepartmentId?: string;
  selectedInstructorId?: string;
};

function buildInstructorUrl(
  instructorId: string,
  selectedDepartmentId?: string
): string {
  const params = new URLSearchParams({ selected_alert: "all", instructor: instructorId });
  if (selectedDepartmentId) params.set("department", selectedDepartmentId);
  return `/?${params.toString()}`;
}

export async function DeanInstructorStats({
  user,
  selectedDepartmentId,
  selectedInstructorId,
}: PropsType) {
  if (!user || user.role !== "dean") return null;

  const stats = await getDeanInstructorStats(user.faculty_id ?? null, {
    ...(selectedInstructorId
      ? { instructorIds: [selectedInstructorId] }
      : selectedDepartmentId
        ? { departmentIds: [selectedDepartmentId] }
        : {}),
  });
  if (!stats.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((i) => (
        <Link
          key={i.instructorId}
          href={buildInstructorUrl(i.instructorId, selectedDepartmentId)}
          className={cn(
            "inline-flex bg-white flex-col rounded-lg border border-stroke px-4 py-3 shadow-1 dark:bg-gray-dark transition hover:border-primary/50 hover:shadow dark:border-stroke-dark dark:hover:border-primary/50",
            "min-w-[160px]"
          )}
        >
          <span className="text-body-sm font-semibold text-dark dark:text-white">
            {i.instructorName}{" "}
            <span className="text-body-base dark:text-dark-5">({i.total})</span>
          </span>
          <span className="text-body-base text-dark-6 space-x-2 dark:text-dark-5">
            Att:{" "}
            <span className={cn("text-amber-500 dark:text-amber-500 font-bold", i.yellowAttendance > 0 ? "text-amber-500 dark:text-amber-500" : "text-gray-600 dark:text-gray-400")}>
              {i.yellowAttendance}
            </span>
            {" | "}
            <span className={cn("text-red-500 font-bold", i.redAttendance > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>{i.redAttendance}</span>
            {" · "}
            GPA:{" "}
            <span className={cn("text-amber-500 dark:text-amber-500 font-bold", i.yellowGpa > 0 ? "text-amber-500 dark:text-amber-500" : "text-gray-600 dark:text-gray-400")}>
              {i.yellowGpa}
            </span>
            {" | "}
            <span className={cn("text-red-500 font-bold", i.redGpa > 0 ? "text-red-500" : "text-gray-600 dark:text-gray-400")}>{i.redGpa}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
