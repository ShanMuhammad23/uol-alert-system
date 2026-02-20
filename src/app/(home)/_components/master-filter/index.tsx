"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { MasterFilterOptions, AlertDimensionFilter } from "../../fetch";

export type MasterFilterCurrent = {
  department_id?: string;
  program?: string;
  instructor_id?: string;
  course_id?: string;
};

const GPA_ATTENDANCE_OPTIONS: { value: AlertDimensionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "red", label: "Red alert" },
  { value: "yellow", label: "Yellow alert" },
  { value: "good", label: "Good standing" },
];

type PropsType = {
  options: MasterFilterOptions;
  current: MasterFilterCurrent;
  role: "dean" | "hod" | "teacher" | undefined;
  selectedAlert: string;
  gpaFilter: AlertDimensionFilter;
  attendanceFilter: AlertDimensionFilter;
  className?: string;
};

function FilterSelect({
  label,
  value,
  items,
  onChange,
  "data-testid": testId,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
  "data-testid"?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-body-sm font-medium text-dark dark:text-white">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className={cn(
          "rounded-lg border border-stroke bg-white px-3 py-2.5 text-sm outline-none transition",
          "focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:focus:border-primary",
          "min-w-[140px]"
        )}
      >
        <option value="">All</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MasterFilter({
  options,
  current,
  role,
  selectedAlert,
  gpaFilter,
  attendanceFilter,
  className,
}: PropsType) {
  const router = useRouter();

  const buildUrl = (
    updates: Partial<MasterFilterCurrent> & {
      gpa_filter?: AlertDimensionFilter;
      attendance_filter?: AlertDimensionFilter;
    }
  ) => {
    const params = new URLSearchParams();
    if (selectedAlert && selectedAlert !== "all") params.set("selected_alert", selectedAlert);
    const nextDept = { ...current, ...updates };
    if (nextDept.department_id) params.set("department", nextDept.department_id);
    if (nextDept.program) params.set("program", nextDept.program);
    if (nextDept.instructor_id) params.set("instructor", nextDept.instructor_id);
    if (nextDept.course_id) params.set("course", nextDept.course_id);
    const gpa = updates.gpa_filter !== undefined ? updates.gpa_filter : gpaFilter;
    const att = updates.attendance_filter !== undefined ? updates.attendance_filter : attendanceFilter;
    if (gpa && gpa !== "all") params.set("gpa_filter", gpa);
    if (att && att !== "all") params.set("attendance_filter", att);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const handleDepartment = (value: string) =>
    router.push(buildUrl({ department_id: value || undefined }));
  const handleProgram = (value: string) =>
    router.push(buildUrl({ program: value || undefined }));
  const handleInstructor = (value: string) =>
    router.push(buildUrl({ instructor_id: value || undefined }));
  const handleCourse = (value: string) =>
    router.push(buildUrl({ course_id: value || undefined }));
  const handleGpaFilter = (value: string) =>
    router.push(buildUrl({ gpa_filter: (value || "all") as AlertDimensionFilter }));
  const handleAttendanceFilter = (value: string) =>
    router.push(buildUrl({ attendance_filter: (value || "all") as AlertDimensionFilter }));

  if (!role) return null;

  const showDepartment = role === "dean" || role === "hod";
  const showProgram = role === "dean" || role === "hod";
  const showInstructor = role === "dean" || role === "hod";
  const showCourse = true;

  const hasAnyOption =
    options.departments.length > 0 ||
    options.programs.length > 0 ||
    options.instructors.length > 0 ||
    options.courses.length > 0;

  const hasActiveFilter =
    !!current.department_id ||
    !!current.program ||
    !!current.instructor_id ||
    !!current.course_id ||
    (gpaFilter && gpaFilter !== "all") ||
    (attendanceFilter && attendanceFilter !== "all");

  const handleClearAll = () => router.push("/");

  return (
    <div
      className={cn(
        " relative flex flex-wrap items-end gap-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className
      )}
    >
      <h3 className="text-body-sm font-semibold text-dark dark:text-white w-full mb-1">
        Filter by
      </h3>
      
      {showDepartment && options.departments.length > 0 && (
        <FilterSelect
          label="Department"
          value={current.department_id ?? ""}
          items={options.departments}
          onChange={handleDepartment}
          data-testid="filter-department"
        />
      )}
      {showProgram && options.programs.length > 0 && (
        <FilterSelect
          label="Program"
          value={current.program ?? ""}
          items={options.programs}
          onChange={handleProgram}
          data-testid="filter-program"
        />
      )}
     
      {showCourse && options.courses.length > 0 && (
        <FilterSelect
          label="Course"
          value={current.course_id ?? ""}
          items={options.courses}
          onChange={handleCourse}
          data-testid="filter-course"
        />
      )}
       {showInstructor && options.instructors.length > 0 && (
        <FilterSelect
          label="Instructor"
          value={current.instructor_id ?? ""}
          items={options.instructors}
          onChange={handleInstructor}
          data-testid="filter-instructor"
        />
      )}
     
      <FilterSelect
        label="Attendance"
        value={attendanceFilter ?? "all"}
        items={GPA_ATTENDANCE_OPTIONS}
        onChange={handleAttendanceFilter}
        data-testid="filter-attendance"
      />
       <FilterSelect
        label="GPA"
        value={gpaFilter ?? "all"}
        items={GPA_ATTENDANCE_OPTIONS}
        onChange={handleGpaFilter}
        data-testid="filter-gpa"
      />
      <div className="flex flex-col gap-1.5 absolute right-4 top-0">
        <span className="text-body-sm font-medium text-transparent select-none">
          Clear
        </span>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={!hasActiveFilter}
          className={cn(
            "rounded-lg border px-4 py-2.5 text-sm font-medium outline-none transition",
            "min-w-[100px]",
            hasActiveFilter
              ? "border-stroke bg-red-600 text-white hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3"
              : "cursor-not-allowed border-stroke/50  text-white dark:border-dark-3 dark:bg-dark-2 dark:text-dark-5 bg-red-600"
          )}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
