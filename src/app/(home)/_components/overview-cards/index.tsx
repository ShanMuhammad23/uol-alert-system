import { getOverviewData } from "../../fetch";
import type { AppUser, MasterFilterParams, AlertDimensionFilter } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import Link from "next/link";
import type { AlertFilter } from "../../fetch";

type PropsType = {
  selectedAlert: AlertFilter | string;
  user?: AppUser | null;
  masterFilter?: MasterFilterParams;
  gpaFilter?: AlertDimensionFilter;
  attendanceFilter?: AlertDimensionFilter;
};

export async function OverviewCardsGroup({
  selectedAlert,
  user,
  masterFilter,
  gpaFilter,
  attendanceFilter,
}: PropsType) {
  const { yellowGpa, redGpa, yellowAttendance, redAttendance } =
    await getOverviewData(user, masterFilter, gpaFilter, attendanceFilter);

  const active = selectedAlert || "all";

  const cards: {
    filter: AlertFilter;
    label: string;
    data: { yellow: number; red: number };
    Icon: typeof icons.YellowAlert;
  }[] = [
    {
      filter: "attendance",
      label: "Attendance",
      data: { yellow: yellowAttendance.value, red: redAttendance.value },
      Icon: icons.YellowAlert,
    },
    {
      filter: "gpa",
      label: "GPA",
      data: { yellow: yellowGpa.value, red: redGpa.value },
      Icon: icons.YellowAlert,
    }
   
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cards.map(({ filter, label, data, Icon }) => (
        <Link
          key={filter}
          href={`/?selected_alert=${filter}`}
          className="rounded-[10px] transition-opacity hover:opacity-90 flex-1"
          scroll={false}
        >
          <OverviewCard
            label={label}
            data={data}
            Icon={Icon}
            isActive={active === filter}
          />
        </Link>
      ))}
    </div>
  );
}
