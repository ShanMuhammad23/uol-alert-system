import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import type { JSX, SVGProps } from "react";

type PropsType = {
  label: string;
  data: {
    value?: number | string;
    /** Yellow | Red counts in one card (e.g. GPA or Attendance) */
    yellow?: number;
    red?: number;
    growthRate?: number;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  isActive?: boolean;
};

export function OverviewCard({ label, data, Icon, isActive }: PropsType) {
  const hasGrowth = data.growthRate !== undefined;
  const isDecreasing = hasGrowth && data.growthRate! < 0;
  const hasYellowRed = data.yellow !== undefined && data.red !== undefined;

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white dark:bg-gray-dark p-4 shadow-1 transition-shadow  md:min-w-[240px] flex-1 ",
        isActive && "ring-2 ring-primary shadow-md",
        
      )}
    >
      <dd className="text-xl font-bold text-dark dark:text-white">{label}</dd>

      <div className="mt-6 flex items-end justify-between">
        <dl>
          {hasYellowRed ? (
            <dt className="mb-1.5 flex items-center gap-4 text-heading-4 font-bold">
              <span className="text-yellow-400 dark:text-yellow-400">{data.yellow}</span>
              <span className="text-dark-4 dark:text-dark-5" aria-hidden>|</span>
              <span className="text-red-600 dark:text-red-600">{data.red}</span>
            </dt>
          ) : (
            <dt className="mb-1.5 text-heading-6 font-bold text-dark dark:text-white">
              {data.value}
            </dt>
          )}
        </dl>

        {hasGrowth && (
          <dl
            className={cn(
              "text-sm font-medium",
              isDecreasing ? "text-red" : "text-green",
            )}
          >
            <dt className="flex items-center gap-1.5">
              {data.growthRate}%
              {isDecreasing ? (
                <ArrowDownIcon aria-hidden />
              ) : (
                <ArrowUpIcon aria-hidden />
              )}
            </dt>

            <dd className="sr-only">
              {label} {isDecreasing ? "Decreased" : "Increased"} by{" "}
              {data.growthRate}%
            </dd>
          </dl>
        )}
      </div>
    </div>
  );
}
