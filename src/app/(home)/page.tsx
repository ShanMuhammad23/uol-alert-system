import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { Suspense } from "react";
import { OverviewChart } from "./_components/overview-chart";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { getCurrentUser } from "./fetch";
import { DeanDepartmentStats } from "./_components/dean-department-stats";

type PropsType = {
  searchParams: Promise<{
    selected_alert?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const { selected_alert } = await searchParams;
  const selectedAlert = selected_alert || "all";
  const user = await getCurrentUser();

  return (
    <>
      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 mb-4">
        <div className="col-span-6 xl:col-span-5 ">
          <Suspense fallback={<OverviewCardsSkeleton />}>
            <OverviewCardsGroup selectedAlert={selectedAlert} user={user} />
            <DeanDepartmentStats user={user} />

          </Suspense>
        </div>
        <Suspense fallback={<OverviewCardsSkeleton />}>
          <OverviewChart className="col-span-7" user={user} />
        </Suspense>
      </div>
    
      <div className="col-span-12">
        <Suspense fallback={<TopChannelsSkeleton />} key={selectedAlert}>
          <TopChannels selectedAlert={selectedAlert} user={user} />
        </Suspense>
      </div>
      </>
      );
}
