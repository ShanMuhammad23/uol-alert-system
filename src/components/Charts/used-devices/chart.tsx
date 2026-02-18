"use client";

import { compactFormat } from "@/lib/format-number";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = {
  data: { name: string; amount: number }[];
  colors?: string[];
  centerLabel?: string;
  /** Custom center value (e.g. "150 / 1200"). When set, overrides the numeric total. */
  centerValue?: string;
};

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export function DonutChart({
  data,
  colors = ["#5750F1", "#5475E5", "#8099EC", "#ADBCF2"],
  centerLabel = "Visitors",
  centerValue,
}: PropsType) {
  const chartOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
    },
    colors,
    labels: data.map((item) => item.name),
    legend: {
      show: false,
    },
    plotOptions: {
      pie: {
        donut: {
          // Slightly smaller donut for a more compact look
          size: "72%",
          background: "transparent",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: centerLabel,
              fontSize: "14px",
              fontWeight: "400",
              formatter: () =>
                centerValue !== undefined
                  ? centerValue
                  : compactFormat(data.reduce((sum, d) => sum + d.amount, 0)),
            },
            value: {
              show: true,
              fontSize: "22px",
              fontWeight: "bold",
              formatter: () =>
                centerValue !== undefined ? centerValue : compactFormat(data.reduce((sum, d) => sum + d.amount, 0)),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    responsive: [
      {
        breakpoint: 2600,
        options: {
          chart: {
            width: 320,
          },
        },
      },
      {
        breakpoint: 640,
        options: {
          chart: {
            width: "100%",
          },
        },
      },
      {
        breakpoint: 370,
        options: {
          chart: {
            width: 260,
          },
        },
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <Chart
        options={chartOptions}
        series={data.map((item) => item.amount)}
        type="donut"
      />
    </div>
  );
}
