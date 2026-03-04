"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { EnrollmentRecord } from "@/lib/enrollment";
import { useMonitoringStudents } from "@/hooks/useMonitoringStudents";
import { StudentProfileLink } from "./StudentProfileLink";
import { TopChannelsSkeleton } from "./skeleton";

type Props = {
  className?: string;
  returnToUrl?: string;
  /** When provided (e.g. from enrollment hook + MasterFilter), used instead of fetching. Table shows filtered data. */
  enrollmentData?: EnrollmentRecord[] | null;
};

export function TopChannelsTableClient({
  className,
  returnToUrl = "/",
  enrollmentData: enrollmentDataProp,
}: Props) {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(!enrollmentDataProp);
  const [error, setError] = useState<Error | null>(null);

  const hasPropData = enrollmentDataProp != null && Array.isArray(enrollmentDataProp);
  const displayEnrollments = hasPropData ? enrollmentDataProp : enrollments;

  const { data: monitoringData } = useMonitoringStudents();

  const monitoredByCourseSection = useMemo(() => {
    const map = new Map<string, number>();
    const classes = monitoringData?.classes ?? [];
    for (const c of classes) {
      const key = `${c.CrCode}__${c.SecCode}`;
      map.set(key, (map.get(key) ?? 0) + (c.Att ?? 0));
    }
    return map;
  }, [monitoringData]);

  useEffect(() => {
    if (hasPropData) {
      setIsLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    fetch("/api/enrollment", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load enrollment data");
        return res.json();
      })
      .then((raw: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(raw) ? (raw as EnrollmentRecord[]) : [];
        setEnrollments(list);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentDataProp]);

  // Total student count = number of objects (enrollment records) per course (CrCode)
  const courseIdToStudentCount = new Map<string, number>();
  for (const e of displayEnrollments) {
    const key = e.CrCode ?? e.CrTitle ?? "";
    courseIdToStudentCount.set(key, (courseIdToStudentCount.get(key) ?? 0) + 1);
  }

  if (!hasPropData && isLoading) {
    return <TopChannelsSkeleton />;
  }

  if (!hasPropData && error) {
    return (
      <div
        className={cn(
          "rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card mb-12",
          className
        )}
      >
        <div className="mt-6 rounded-md border border-dashed border-red-500 bg-red-50 dark:bg-red-950/30 py-8 text-center text-red-700 dark:text-red-400">
          <p className="font-medium">Failed to load enrollment data</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card mb-12 overflow-x-auto",
        className
      )}
    >
      {displayEnrollments.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-stroke py-8 text-center text-dark-6 dark:border-dark-3">
          No enrollment data found.
        </div>
      ) : (
        <div className="mt-4">
          <Table>
            <TableHeader className="sticky top-0 z-10 border-b border-stroke bg-white dark:bg-gray-dark dark:border-dark-3 [&>tr]:border-stroke dark:[&>tr]:border-dark-3">
              <TableRow className="border-none uppercase [&>th]:text-center [&>th]:bg-white [&>th]:dark:bg-gray-dark">
                <TableHead className="min-w-[160px] !text-left">
                  Name - SAPID
                </TableHead>
               
                <TableHead className="min-w-[140px] !text-left">
                  Department
                </TableHead>
                <TableHead className="min-w-[120px] !text-left">
                  Program
                </TableHead>
                <TableHead className="min-w-[160px] !text-left">
                  Course
                </TableHead>
                <TableHead className="min-w-[160px] !text-left">
                  Instructor Name
                </TableHead>
                <TableHead className="min-w-[140px] !text-left">
                  Classes Monitored
                </TableHead>
               
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayEnrollments.map((row) => {
                const courseKey = row.CrCode ?? row.CrTitle ?? "";
                const totalForCourse = courseIdToStudentCount.get(courseKey) ?? 0;
                const rowKey = row.Id ?? `${row.SapNo}-${courseKey}-${row.CrTitle}-${row.Name}`;
                const monitorKey = `${row.CrCode ?? ""}__${row.Section ?? ""}`;
                const monitoredCount = monitoredByCourseSection.get(monitorKey);

                return (
                  <TableRow
                    key={rowKey}
                    className="text-center text-base font-medium text-dark dark:text-white"
                  >
                    <TableCell className="!text-left font-medium">
                      {returnToUrl ? (
                        <StudentProfileLink
                          sapId={row.SapNo}
                          returnToUrl={returnToUrl}
                          className="flex flex-col gap-1"
                          title="View profile"
                        >
                          <span className="text-base font-medium text-green-500">{row.Name ?? "—"}</span>
                          <span className="text-sm text-[#1f4a3d]">SAPID: {row.SapNo}</span>
                        </StudentProfileLink>
                      ) : (
                        row.Name ?? "—"
                      )}
                    </TableCell>
                   
                    <TableCell className="!text-left text-dark-6">
                      {row.DeptName ?? "—"}
                    </TableCell>
                    <TableCell className="!text-left">
                      {row.DegreeTitle ?? row.DegreeCode ?? "—"}
                    </TableCell>
                    <TableCell className="!text-left">
                      <div className="flex flex-col gap-1">
                        <span>{row.CrTitle ?? row.CrCode ?? "—"}</span>
                        <span className="text-sm text-[#1f4a3d]">
                          {totalForCourse} students
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="!text-left">
                      {row.Teacher ?? "—"}
                    </TableCell>
                    <TableCell className="!text-left">
                      {monitoredCount != null ? monitoredCount : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
