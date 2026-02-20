import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { Suspense } from "react";
import { OverviewChart } from "./_components/overview-chart";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { getCurrentUser, getMasterFilterOptions } from "./fetch";
import type { MasterFilterParams, AlertDimensionFilter } from "./fetch";
import { DeanDepartmentStats } from "./_components/dean-department-stats";
import { MasterFilter } from "./_components/master-filter";

type PropsType = {
  searchParams: Promise<{
    selected_alert?: string;
    department?: string;
    program?: string;
    instructor?: string;
    course?: string;
    gpa_filter?: string;
    attendance_filter?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const params = await searchParams;
  const selectedAlert = params.selected_alert || "all";
  const user = await getCurrentUser();

  const masterFilter: MasterFilterParams = {
    department_id: params.department || undefined,
    program: params.program || undefined,
    instructor_id: params.instructor || undefined,
    course_id: params.course || undefined,
  };

  const gpaFilter = (params.gpa_filter === "red" || params.gpa_filter === "yellow" || params.gpa_filter === "good"
    ? params.gpa_filter
    : "all") as AlertDimensionFilter;
  const attendanceFilter = (params.attendance_filter === "red" || params.attendance_filter === "yellow" || params.attendance_filter === "good"
    ? params.attendance_filter
    : "all") as AlertDimensionFilter;

  const filterKey = [selectedAlert, params.department, params.program, params.instructor, params.course, params.gpa_filter, params.attendance_filter].join("-");
  const filterOptions = await getMasterFilterOptions(user);

  return (
    <>
      {/* Row 1: Overview cards + Charts in one row */}
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6">
        <div className="col-span-12 lg:col-span-6">
          <Suspense fallback={<OverviewCardsSkeleton />}>
            <OverviewCardsGroup
              selectedAlert={selectedAlert}
              user={user}
              masterFilter={masterFilter}
              gpaFilter={gpaFilter}
              attendanceFilter={attendanceFilter}
            />
          </Suspense>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <Suspense fallback={<OverviewCardsSkeleton />}>
            <OverviewChart
              user={user}
              masterFilter={masterFilter}
              gpaFilter={gpaFilter}
              attendanceFilter={attendanceFilter}
            />
          </Suspense>
        </div>
      </div>

      {/* Row 2: Dean department stats full width */}
      <div className="mt-4 mb-4 grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <DeanDepartmentStats user={user} />
        </div>
      </div>

      <Suspense fallback={null}>
        <div className="mb-4">
          <MasterFilter
            options={filterOptions}
            current={masterFilter}
            role={user?.role}
            selectedAlert={selectedAlert}
            gpaFilter={gpaFilter}
            attendanceFilter={attendanceFilter}
          />
        </div>
      </Suspense>

      <div className="col-span-12">
        <Suspense fallback={<TopChannelsSkeleton />} key={filterKey}>
          <TopChannels
            selectedAlert={selectedAlert}
            user={user}
            masterFilter={masterFilter}
            gpaFilter={gpaFilter}
            attendanceFilter={attendanceFilter}
          />
        </Suspense>
      </div>
    </>
  );
}
