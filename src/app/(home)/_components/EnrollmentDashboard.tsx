"use client";

import { useMemo, useState } from "react";
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
import type { AlertDimensionFilter } from "../fetch";
import { MasterFilter } from "./master-filter";
import { DeanStatsCollapsible } from "./dean-stats-collapsible";
import { DeanDepartmentStats } from "./dean-department-stats";
import { DeanProgramStats } from "./dean-program-stats";
import { DeanInstructorStats } from "./dean-instructor-stats";
import { TopChannelsTableClient } from "@/components/Tables/nested-students-table/TopChannelsTableClient";
import { NestedEnrollmentTableClient } from "@/components/Tables/nested-students-table/NestedEnrollmentTableClient";
import { ExpandableListUrlSync } from "./ExpandableListUrlSync";
import { StudentsViewTabs } from "./StudentsViewTabs";

type Props = {
  user: DashboardUser;
  masterFilter: MasterFilterParams;
  filterOptionsFromServer: MasterFilterOptions;
  selectedAlert: string;
  gpaFilters: AlertDimensionFilter[];
  attendanceFilters: AlertDimensionFilter[];
  interventionFilters: string[];
  returnToUrl: string;
  departmentIds: string[];
  programIds: string[];
  instructorIds: string[];
  viewMode: "table" | "nested";
  /** Section IDs to expand in nested view (e.g. from URL ?expanded=). */
  expandedIds?: string[];
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
  expandedIds = [],
}: Props) {
  const { data: enrollmentData } = useEnrollmentData();

  // Local, client-side filter state to avoid full route transitions on every change.
  const [localMasterFilter, setLocalMasterFilter] =
    useState<MasterFilterParams>(masterFilter);
  const [localGpaFilters, setLocalGpaFilters] =
    useState<AlertDimensionFilter[]>(gpaFilters);
  const [localAttendanceFilters, setLocalAttendanceFilters] =
    useState<AlertDimensionFilter[]>(attendanceFilters);
  const [localInterventionFilters, setLocalInterventionFilters] = useState<
    string[]
  >(interventionFilters);

  const filterOptions: MasterFilterOptions = useMemo(() => {
    if (enrollmentData?.length && user.role) {
      return getMasterFilterOptions(
        enrollmentData,
        user.faculty_id ?? undefined,
        localMasterFilter,
      );
    }
    return filterOptionsFromServer;
  }, [enrollmentData, user.role, user.faculty_id, localMasterFilter, filterOptionsFromServer]);

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
          departmentIds:
            localMasterFilter.department_ids?.length
              ? localMasterFilter.department_ids
              : departmentIds.length
                ? departmentIds
                : undefined,
          instructorIds:
            localMasterFilter.instructor_ids?.length
              ? localMasterFilter.instructor_ids
              : instructorIds.length
                ? instructorIds
                : undefined,
        })
      : undefined;
  const filteredData =
    enrollmentData?.length && user.role
      ? filterEnrollmentByMasterFilter(
          enrollmentData,
          localMasterFilter,
          user.faculty_id ?? undefined,
        )
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
                  selectedDepartmentId={
                    localMasterFilter.department_ids?.[0] ?? departmentIds[0]
                  }
                  masterFilterDepartmentIds={
                    localMasterFilter.department_ids?.length
                      ? localMasterFilter.department_ids
                      : departmentIds.length
                        ? departmentIds
                        : undefined
                  }
                  stats={departmentStats}
                  onSelectDepartmentId={(id) =>
                    setLocalMasterFilter({
                      department_ids: [id],
                      programs: undefined,
                      course_ids: undefined,
                      instructor_ids: undefined,
                    })
                  }
                />
              }
              programContent={
                <DeanProgramStats
                  user={user}
                  selectedProgramId={
                    localMasterFilter.programs?.[0] ?? programIds[0]
                  }
                  masterFilterProgramIds={
                    localMasterFilter.programs?.length
                      ? localMasterFilter.programs
                      : programIds.length
                        ? programIds
                        : undefined
                  }
                  masterFilterDepartmentIds={
                    localMasterFilter.department_ids?.length
                      ? localMasterFilter.department_ids
                      : departmentIds.length
                        ? departmentIds
                        : undefined
                  }
                  stats={programStats}
                  onSelectProgramId={(id) =>
                    setLocalMasterFilter((prev) => ({
                      ...prev,
                      programs: [id],
                      course_ids: undefined,
                      instructor_ids: undefined,
                    }))
                  }
                />
              }
              instructorContent={
                <DeanInstructorStats
                  user={user}
                  selectedDepartmentId={
                    localMasterFilter.department_ids?.[0] ?? departmentIds[0]
                  }
                  selectedInstructorId={
                    localMasterFilter.instructor_ids?.[0] ?? instructorIds[0]
                  }
                  stats={instructorStats}
                  onSelectInstructorId={(id) =>
                    setLocalMasterFilter((prev) => ({
                      ...prev,
                      instructor_ids: [id],
                    }))
                  }
                />
              }
            />
          )}
        </div>
      </div>

      <div className="mb-4">
        <MasterFilter
          options={filterOptions}
          current={localMasterFilter}
          role={user.role}
          selectedAlert={selectedAlert}
          gpaFilters={localGpaFilters}
          attendanceFilters={localAttendanceFilters}
          interventionFilters={localInterventionFilters}
          onChangeMasterFilter={(updates) =>
            setLocalMasterFilter((prev) => ({
              ...prev,
              ...updates,
            }))
          }
          onChangeGpaFilters={(values) => setLocalGpaFilters(values)}
          onChangeAttendanceFilters={(values) =>
            setLocalAttendanceFilters(values)
          }
          onChangeInterventionFilters={(values) =>
            setLocalInterventionFilters(values)
          }
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
          <ExpandableListUrlSync>
            <NestedEnrollmentTableClient
              returnToUrl={returnToUrl}
              enrollmentData={filteredData ?? null}
              expandedIds={expandedIds}
            />
          </ExpandableListUrlSync>
        )}
      </div>
    </>
  );
}
