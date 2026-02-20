import { DonutChart } from "@/components/Charts/used-devices/chart";
import { cn } from "@/lib/utils";
import { getOverviewData } from "../../fetch";
import type { AppUser, MasterFilterParams, AlertDimensionFilter } from "../../fetch";

type PropsType = {
  className?: string;
  user?: AppUser | null;
  masterFilter?: MasterFilterParams;
  gpaFilter?: AlertDimensionFilter;
  attendanceFilter?: AlertDimensionFilter;
};

const CHART_COLORS = ["#DC2626", "#22C55E"];

export async function GPAChart({
  className,
  user,
  masterFilter,
  gpaFilter,
  attendanceFilter,
}: PropsType) {
  const { totalStudents, yellowGpa, redGpa } = await getOverviewData(
    user,
    masterFilter,
    gpaFilter,
    attendanceFilter,
  );

  const withAlerts = yellowGpa.value + redGpa.value;
  const noAlert = totalStudents - withAlerts;
  const alertsPercentage =
    totalStudents > 0 ? (withAlerts / totalStudents) * 100 : 0;

  const data = [
    { name: "With alert(s)", amount: withAlerts },
    { name: "No alert", amount: noAlert },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 grid-rows-[auto_1fr]  rounded-[10px]  p-1  ",
        className,
      )}
    >
      <h2 className="text-lg text-center font-bold text-dark dark:text-white">
        GPA Alerts
      </h2>

      <div className="flex w-full items-center justify-center">
        <DonutChart
          data={data}
          colors={CHART_COLORS}
          centerLabel=""
          centerValue={`${alertsPercentage.toFixed(1)}%`}
          size="sm"
        />
      </div>
    </div>
  );
}
