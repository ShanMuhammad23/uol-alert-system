import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { Suspense } from "react";
import { OverviewChart } from "./_components/overview-chart";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { getCurrentUser, getMasterFilterOptions } from "./fetch";
import type { MasterFilterParams, AlertDimensionFilter } from "./fetch";
import { DeanDepartmentStats } from "./_components/dean-department-stats";
import { DeanInstructorStats } from "./_components/dean-instructor-stats";
import { DeanStatsCollapsible } from "./_components/dean-stats-collapsible";
import { MasterFilter } from "./_components/master-filter";
import { CampaignVisitorsChart } from "@/components/Charts/campaign-visitors/chart";
import { ExpandableListUrlSync } from "./_components/ExpandableListUrlSync";

function parseMultiParam(
  value: string | string[] | undefined
): string[] {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean));
}

type PropsType = {
  searchParams: Promise<{
    selected_alert?: string;
    department?: string | string[];
    program?: string | string[];
    instructor?: string | string[];
    course?: string | string[];
    gpa_filter?: string;
    attendance_filter?: string;
    intervention_filter?: string | string[];
    expanded?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const params = await searchParams;
  const selectedAlert = params.selected_alert || "all";
  const user = await getCurrentUser();

  const departmentIds = parseMultiParam(params.department);
  const programs = parseMultiParam(params.program);
  const instructorIds = parseMultiParam(params.instructor);
  const courseIds = parseMultiParam(params.course);

  const masterFilter: MasterFilterParams = {
    department_ids: departmentIds.length ? departmentIds : undefined,
    programs: programs.length ? programs : undefined,
    instructor_ids: instructorIds.length ? instructorIds : undefined,
    course_ids: courseIds.length ? courseIds : undefined,
  };

  const validAlertDim = (s: string): s is AlertDimensionFilter =>
    s === "red" || s === "yellow" || s === "good";
  const gpaFiltersRaw = parseMultiParam(params.gpa_filter);
  const attendanceFiltersRaw = parseMultiParam(params.attendance_filter);
  const gpaFilters = gpaFiltersRaw.filter(validAlertDim) as AlertDimensionFilter[];
  const attendanceFilters = attendanceFiltersRaw.filter(validAlertDim) as AlertDimensionFilter[];
  const interventionFilters = parseMultiParam(params.intervention_filter);

  const filterKey = [selectedAlert, ...departmentIds, ...programs, ...instructorIds, ...courseIds, params.gpa_filter, params.attendance_filter, params.intervention_filter].join("-");
  const filterOptions = await getMasterFilterOptions(user, masterFilter);

  // Build URL to restore filters (and later expanded state) when returning from student profile
  const returnToParams = new URLSearchParams();
  if (selectedAlert && selectedAlert !== "all") returnToParams.set("selected_alert", selectedAlert);
  if (departmentIds.length) returnToParams.set("department", departmentIds.join(","));
  if (programs.length) returnToParams.set("program", programs.join(","));
  if (instructorIds.length) returnToParams.set("instructor", instructorIds.join(","));
  if (courseIds.length) returnToParams.set("course", courseIds.join(","));
  if (gpaFilters.length) returnToParams.set("gpa_filter", gpaFilters.join(","));
  if (attendanceFilters.length) returnToParams.set("attendance_filter", attendanceFilters.join(","));
  if (interventionFilters.length) returnToParams.set("intervention_filter", interventionFilters.join(","));
  const expandedParam = params.expanded;
  if (expandedParam) returnToParams.set("expanded", expandedParam);
  const returnToUrl = returnToParams.toString() ? `/?${returnToParams.toString()}` : "/";

  const expandedIds = expandedParam ? expandedParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <>
      {/* Row 1: Overview cards + Charts in one row */}
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-1">
        <div className="col-span-12 md:col-span-6">
          <Suspense fallback={<OverviewCardsSkeleton />}>
            <OverviewCardsGroup
              selectedAlert={selectedAlert}
              user={user}
              masterFilter={masterFilter}
              gpaFilters={gpaFilters}
              attendanceFilters={attendanceFilters}
            />
          </Suspense>
        </div>
        <div className=" col-span-12 md:col-span-6">
      <CampaignVisitorsChart
            data={[
              { x: "Not Started", y: 100 },
              { x: "Initiated", y: 168 },
              { x: "In-Progress", y: 385 },
              { x: "Resolved", y: 298 },
              { x: "Referred", y: 201 },
            ]}
            statusColors={{
              "Not Started": "#DE2649",
              "Initiated": "#B5B126",
              "In-Progress": "#DBBE0F",
              "Referred": "#9C5A99",
              "Resolved": "#477061",
            }}
          />
      </div>
      </div>
    
      
      {/* Row 2: Dean department & instructor stats (collapsible, parent-child) */}
      <div className="mt-4 mb-4 grid grid-cols-12 gap-4">
        <div className="col-span-12">
          {user?.role === "dean" && (
            <DeanStatsCollapsible
              selectedDepartmentId={departmentIds[0]}
              departmentContent={
                <DeanDepartmentStats
                  user={user}
                  selectedDepartmentId={departmentIds[0]}
                />
              }
              instructorContent={
                <DeanInstructorStats
                  user={user}
                  selectedDepartmentId={departmentIds[0]}
                  selectedInstructorId={instructorIds[0]}
                />
              }
            />
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <div className="mb-4">
          <MasterFilter
            options={filterOptions}
            current={masterFilter}
            role={user?.role}
            selectedAlert={selectedAlert}
            gpaFilters={gpaFilters}
            attendanceFilters={attendanceFilters}
            interventionFilters={interventionFilters}
          />
        </div>
      </Suspense>

      <div className="col-span-12">
        <Suspense fallback={<TopChannelsSkeleton />} key={filterKey}>
          <ExpandableListUrlSync>
            <TopChannels
              returnToUrl={returnToUrl}
              expandedIds={expandedIds}
              selectedAlert={selectedAlert}
              user={user}
              masterFilter={masterFilter}
              gpaFilters={gpaFilters}
              attendanceFilters={attendanceFilters}
            />
          </ExpandableListUrlSync>
        </Suspense>
      </div>
    </>
  );
}
