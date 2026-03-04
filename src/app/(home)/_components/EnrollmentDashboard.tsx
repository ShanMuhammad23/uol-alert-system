"use client";

import type { ReactNode } from "react";
import { useEnrollmentData } from "@/hooks/useEnrollmentData";
import {
  getDepartmentStats,
  getProgramStats,
  getInstructorStats,
  getMasterFilterOptions,
  filterEnrollmentByMasterFilter,
} from "@/lib/enrollment";
import type {
  MasterFilterOptions,
  MasterFilterParams,
  DashboardUser,
} from "@/lib/enrollment";
import { MasterFilter } from "./master-filter";
import { DeanStatsCollapsible } from "./dean-stats-collapsible";
import { DeanDepartmentStats } from "./dean-department-stats";
import { DeanProgramStats } from "./dean-program-stats";
import { DeanInstructorStats } from "./dean-instructor-stats";
import { TopChannelsTableClient } from "@/components/Tables/top-channels/TopChannelsTableClient";
import { StudentsViewTabs } from "./StudentsViewTabs";

type Props = {
  user: DashboardUser;
  masterFilter: MasterFilterParams;
  filterOptionsFromServer: MasterFilterOptions;
  selectedAlert: string;
  gpaFilters: ("all" | "red" | "yellow" | "good")[];
  attendanceFilters: ("all" | "red" | "yellow" | "good")[];
  interventionFilters: string[];
  returnToUrl: string;
  departmentIds: string[];
  programIds: string[];
  instructorIds: string[];
  viewMode: "table" | "nested";
  /** Rendered when viewMode !== "table" (nested view). */
  nestedView?: ReactNode;
};

export function EnrollmentDashboard({
  user,
  masterFilter,
  filterOptionsFromServer,
  selectedAlert,
  gpaFilters,
  attendanceFilters,
  interventionFilters,
  returnToUrl,
  departmentIds,
  programIds,
  instructorIds,
  viewMode,
  nestedView,
}: Props) {
  const { data: enrollmentData } = useEnrollmentData();

  const filterOptions: MasterFilterOptions =
    enrollmentData?.length && user.role
      ? getMasterFilterOptions(enrollmentData, user.faculty_id ?? undefined, masterFilter)
      : filterOptionsFromServer;

  const departmentStats =
    enrollmentData?.length && user.role === "dean"
      ? getDepartmentStats(enrollmentData, user.faculty_id)
      : undefined;
  const programStats =
    enrollmentData?.length && user.role === "dean"
      ? getProgramStats(enrollmentData, user.faculty_id, {
          departmentIds: departmentIds.length ? departmentIds : undefined,
        })
      : undefined;
  const instructorStats =
    enrollmentData?.length && user.role === "dean"
      ? getInstructorStats(enrollmentData, user.faculty_id, {
          departmentIds: departmentIds.length ? departmentIds : undefined,
          instructorIds: instructorIds.length ? instructorIds : undefined,
        })
      : undefined;
  const filteredData =
    enrollmentData?.length && user.role
      ? filterEnrollmentByMasterFilter(enrollmentData, masterFilter, user.faculty_id ?? undefined)
      : undefined;

  return (
    <>
      <div className="mt-4 mb-4 grid grid-cols-12 gap-4">
        <div className="col-span-12">
          {user.role === "dean" && (
            <DeanStatsCollapsible
              selectedDepartmentId={departmentIds[0]}
              selectedProgramId={programIds[0]}
              departmentContent={
                <DeanDepartmentStats
                  user={user}
                  selectedDepartmentId={departmentIds[0]}
                  masterFilterDepartmentIds={departmentIds.length ? departmentIds : undefined}
                  stats={departmentStats}
                />
              }
              programContent={
                <DeanProgramStats
                  user={user}
                  selectedProgramId={programIds[0]}
                  masterFilterProgramIds={programIds.length ? programIds : undefined}
                  masterFilterDepartmentIds={departmentIds.length ? departmentIds : undefined}
                  stats={programStats}
                />
              }
              instructorContent={
                <DeanInstructorStats
                  user={user}
                  selectedDepartmentId={departmentIds[0]}
                  selectedInstructorId={instructorIds[0]}
                  stats={instructorStats}
                />
              }
            />
          )}
        </div>
      </div>

      <div className="mb-4">
        <MasterFilter
          options={filterOptions}
          current={masterFilter}
          role={user.role}
          selectedAlert={selectedAlert}
          gpaFilters={gpaFilters}
          attendanceFilters={attendanceFilters}
          interventionFilters={interventionFilters}
        />
      </div>

      <div className="col-span-12 mb-12">
        <div className="mb-4">
          <StudentsViewTabs currentView={viewMode} />
        </div>
        {viewMode === "table" ? (
          <TopChannelsTableClient
            returnToUrl={returnToUrl}
            enrollmentData={filteredData ?? null}
          />
        ) : (
          nestedView
        )}
      </div>
    </>
  );
}
