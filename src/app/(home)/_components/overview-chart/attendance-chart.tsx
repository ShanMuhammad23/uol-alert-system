import { DonutChart } from "@/components/Charts/used-devices/chart";
import { cn } from "@/lib/utils";
import { getOverviewData } from "../../fetch";
import type { AppUser } from "../../fetch";

type PropsType = {
  className?: string;
  user?: AppUser | null;
};

const CHART_COLORS = ["#DC2626", "#22C55E"];

export async function AttendanceChart({ className, user }: PropsType) {
  const { totalStudents, yellowAttendance, redAttendance } =
    await getOverviewData(user);

  const withAlerts = yellowAttendance.value + redAttendance.value;
  const noAlert = totalStudents - withAlerts;
  const alertsPercentage =
    totalStudents > 0 ? Math.round((withAlerts / totalStudents) * 100) : 0;

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
        Attendance % Alert
      </h2>

      <div className="flex w-full justify-center">
        <DonutChart
          data={data}
          colors={CHART_COLORS}
          centerLabel=""
          centerValue={`${alertsPercentage}%`}
        />
      </div>
    </div>
  );
}
