"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import type { MasterFilterParams, MasterFilterOptions, AlertDimensionFilter } from "../../fetch";

const GPA_ATTENDANCE_OPTIONS: { value: AlertDimensionFilter; label: string }[] = [
  { value: "red", label: "Red alert" },
  { value: "yellow", label: "Yellow alert" },
  { value: "good", label: "Good standing" },
];

const INTERVENTION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "initiated", label: "Initiated" },
  { value: "in_progress", label: "In-Progress" },
  { value: "referred", label: "Referred" },
  { value: "resolved", label: "Resolved" },
];

type PropsType = {
  options: MasterFilterOptions;
  current: MasterFilterParams;
  role: "dean" | "hod" | "teacher" | undefined;
  selectedAlert: string;
  gpaFilters: AlertDimensionFilter[];
  attendanceFilters: AlertDimensionFilter[];
  interventionFilters: string[];
  className?: string;
};

type FilterKey = "department" | "program" | "course" | "instructor" | "attendance" | "gpa" | "intervention";

function FilterMultiSelect({
  label,
  selected,
  items,
  onChange,
  isOpen,
  onOpenChange,
  "data-testid": testId,
}: {
  label: string;
  selected: string[];
  items: { value: string; label: string }[];
  onChange: (values: string[]) => void;
  isOpen: boolean;
  onOpenChange: () => void;
  "data-testid"?: string;
}) {
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  const displayLabel =
    selected.length === 0
      ? "All"
      : selected.length <= 2
        ? selected.map((v) => items.find((i) => i.value === v)?.label ?? v).join(", ")
        : `${selected.length} selected`;

  const labelWithCount =
    selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div className="flex flex-col gap-1.5 relative" data-testid={testId}>
      <label className="text-body-sm font-medium text-dark dark:text-white">
        {labelWithCount}
      </label>
      <button
        type="button"
        onClick={onOpenChange}
        className={cn(
          "rounded-lg border border-stroke bg-white px-3 py-2.5 text-sm text-left outline-none transition flex items-center justify-between gap-2",
          "focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:focus:border-primary dark:text-white",
          "min-w-[140px] max-w-[200px]"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={cn("w-4 h-4 shrink-0 transition", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-[280px] w-full min-w-[200px] overflow-y-auto rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-stroke-dark dark:bg-gray-dark"
        >
          {items.map((item) => (
            <label
              key={item.value}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-gray-2 dark:hover:bg-dark-3",
                selected.includes(item.value) && "bg-primary/10 dark:bg-primary/20"
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => toggle(item.value)}
                className="rounded border-stroke text-primary focus:ring-primary dark:border-dark-3 dark:bg-gray-dark"
              />
              <span className="text-dark dark:text-white">{item.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function MasterFilter({
  options,
  current,
  role,
  selectedAlert,
  gpaFilters,
  attendanceFilters,
  interventionFilters,
  className,
}: PropsType) {
  const router = useRouter();
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const filterPanelRef = useClickOutside<HTMLDivElement>(() => setOpenFilter(null));

  const buildUrl = (updates: {
    department_ids?: string[];
    programs?: string[];
    instructor_ids?: string[];
    course_ids?: string[];
    gpa_filters?: AlertDimensionFilter[];
    attendance_filters?: AlertDimensionFilter[];
    intervention_filters?: string[];
  }) => {
    const params = new URLSearchParams();
    if (selectedAlert && selectedAlert !== "all") params.set("selected_alert", selectedAlert);

    const depts = updates.department_ids !== undefined ? updates.department_ids : (current.department_ids ?? []);
    const progs = updates.programs !== undefined ? updates.programs : (current.programs ?? []);
    const inst = updates.instructor_ids !== undefined ? updates.instructor_ids : (current.instructor_ids ?? []);
    const crs = updates.course_ids !== undefined ? updates.course_ids : (current.course_ids ?? []);
    const gpa = updates.gpa_filters !== undefined ? updates.gpa_filters : (gpaFilters ?? []);
    const att = updates.attendance_filters !== undefined ? updates.attendance_filters : (attendanceFilters ?? []);
    const intervention = updates.intervention_filters !== undefined ? updates.intervention_filters : (interventionFilters ?? []);

    if (depts.length) params.set("department", depts.join(","));
    if (progs.length) params.set("program", progs.join(","));
    if (inst.length) params.set("instructor", inst.join(","));
    if (crs.length) params.set("course", crs.join(","));
    if (gpa.length) params.set("gpa_filter", gpa.join(","));
    if (att.length) params.set("attendance_filter", att.join(","));
    if (intervention.length) params.set("intervention_filter", intervention.join(","));

    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const navigate = (url: string) => router.push(url, { scroll: false });

  // When parent filter changes, clear child selections so options stay in sync
  const handleDepartment = (values: string[]) =>
    navigate(buildUrl({ department_ids: values, programs: [], course_ids: [], instructor_ids: [] }));
  const handleProgram = (values: string[]) =>
    navigate(buildUrl({ programs: values, course_ids: [], instructor_ids: [] }));
  const handleCourse = (values: string[]) =>
    navigate(buildUrl({ course_ids: values, instructor_ids: [] }));
  const handleInstructor = (values: string[]) =>
    navigate(buildUrl({ instructor_ids: values }));
  const handleGpaFilters = (values: string[]) =>
    navigate(buildUrl({ gpa_filters: values as AlertDimensionFilter[] }));
  const handleAttendanceFilters = (values: string[]) =>
    navigate(buildUrl({ attendance_filters: values as AlertDimensionFilter[] }));
  const handleInterventionFilters = (values: string[]) =>
    navigate(buildUrl({ intervention_filters: values }));

  if (!role) return null;

  const showDepartment = role === "dean" || role === "hod";
  const showProgram = role === "dean" || role === "hod";
  const showInstructor = role === "dean" || role === "hod";
  const showCourse = true;

  const hasActiveFilter =
    (current.department_ids?.length ?? 0) > 0 ||
    (current.programs?.length ?? 0) > 0 ||
    (current.instructor_ids?.length ?? 0) > 0 ||
    (current.course_ids?.length ?? 0) > 0 ||
    (gpaFilters?.length ?? 0) > 0 ||
    (attendanceFilters?.length ?? 0) > 0 ||
    (interventionFilters?.length ?? 0) > 0;

  const handleClearAll = () => navigate("/");

  const toggleFilter = (key: FilterKey) => () =>
    setOpenFilter((prev) => (prev === key ? null : key));

  return (
    <div
      ref={filterPanelRef}
      className={cn(
        "relative flex flex-wrap items-end gap-4 rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className
      )}
    >
      

      {showDepartment && options.departments.length > 0 && (
        <FilterMultiSelect
          label="Department"
          selected={current.department_ids ?? []}
          items={options.departments}
          onChange={handleDepartment}
          isOpen={openFilter === "department"}
          onOpenChange={toggleFilter("department")}
          data-testid="filter-department"
        />
      )}
      {showProgram && options.programs.length > 0 && (
        <FilterMultiSelect
          label="Program"
          selected={current.programs ?? []}
          items={options.programs}
          onChange={handleProgram}
          isOpen={openFilter === "program"}
          onOpenChange={toggleFilter("program")}
          data-testid="filter-program"
        />
      )}
      {showCourse && options.courses.length > 0 && (
        <FilterMultiSelect
          label="Course"
          selected={current.course_ids ?? []}
          items={options.courses}
          onChange={handleCourse}
          isOpen={openFilter === "course"}
          onOpenChange={toggleFilter("course")}
          data-testid="filter-course"
        />
      )}
      {showInstructor && options.instructors.length > 0 && (
        <FilterMultiSelect
          label="Instructor"
          selected={current.instructor_ids ?? []}
          items={options.instructors}
          onChange={handleInstructor}
          isOpen={openFilter === "instructor"}
          onOpenChange={toggleFilter("instructor")}
          data-testid="filter-instructor"
        />
      )}

      <FilterMultiSelect
        label="Attendance"
        selected={attendanceFilters ?? []}
        items={GPA_ATTENDANCE_OPTIONS}
        onChange={handleAttendanceFilters}
        isOpen={openFilter === "attendance"}
        onOpenChange={toggleFilter("attendance")}
        data-testid="filter-attendance"
      />
      <FilterMultiSelect
        label="GPA"
        selected={gpaFilters ?? []}
        items={GPA_ATTENDANCE_OPTIONS}
        onChange={handleGpaFilters}
        isOpen={openFilter === "gpa"}
        onOpenChange={toggleFilter("gpa")}
        data-testid="filter-gpa"
      />
      <FilterMultiSelect
        label="Intervention"
        selected={interventionFilters ?? []}
        items={INTERVENTION_STATUS_OPTIONS}
        onChange={handleInterventionFilters}
        isOpen={openFilter === "intervention"}
        onOpenChange={toggleFilter("intervention")}
        data-testid="filter-intervention"
      />

      <div className="flex flex-col gap-1.5 absolute right-4 bottom-4">
        <span className="text-body-sm font-medium text-transparent select-none">Clear</span>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={!hasActiveFilter}
          className={cn(
            "rounded-lg border px-4 py-2.5 text-sm font-medium outline-none transition min-w-[100px]",
            hasActiveFilter
              ? "border-stroke bg-red-600 text-white hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3"
              : "cursor-not-allowed border-stroke/50 text-white dark:border-dark-3 dark:bg-dark-2 dark:text-dark-5 bg-red-600"
          )}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
