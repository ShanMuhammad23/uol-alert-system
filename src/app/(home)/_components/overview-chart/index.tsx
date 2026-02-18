import { AttendanceChart } from "./attendance-chart";
import { GPAChart } from "./gpa-chart";
import { cn } from "@/lib/utils";
import type { AppUser } from "../../fetch";

type PropsType = {
  className?: string;
  user?: AppUser | null;
};

export async function OverviewChart({ className, user }: PropsType) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 md:grid-cols-2", className)}>
      <AttendanceChart user={user} />
      <GPAChart user={user} />
    </div>
  );
}
