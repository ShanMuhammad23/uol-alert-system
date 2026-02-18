import { getOverviewData } from "../../fetch";
import type { AppUser } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import Link from "next/link";
import type { AlertFilter } from "../../fetch";

type PropsType = {
  selectedAlert: AlertFilter | string;
  user?: AppUser | null;
};

export async function OverviewCardsGroup({ selectedAlert, user }: PropsType) {
  const { yellowGpa, redGpa, yellowAttendance, redAttendance } =
    await getOverviewData(user);

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
