import { AttendanceChart } from "./attendance-chart";
import { GPAChart } from "./gpa-chart";
import { cn } from "@/lib/utils";
import type { AppUser, MasterFilterParams, AlertDimensionFilter } from "../../fetch";

type PropsType = {
  className?: string;
  user?: AppUser | null;
  masterFilter?: MasterFilterParams;
  gpaFilter?: AlertDimensionFilter;
  attendanceFilter?: AlertDimensionFilter;
};

export async function OverviewChart({
  className,
  user,
  masterFilter,
  gpaFilter,
  attendanceFilter,
}: PropsType) {
  return (
    <div className={cn("grid grid-cols-2", className)}>
      <AttendanceChart
        user={user}
        masterFilter={masterFilter}
        gpaFilter={gpaFilter}
        attendanceFilter={attendanceFilter}
      />
      <GPAChart
        user={user}
        masterFilter={masterFilter}
        gpaFilter={gpaFilter}
        attendanceFilter={attendanceFilter}
      />
    </div>
  );
}
