import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getStudentBySapId, generateAlertReport } from "@/app/(home)/fetch";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { CampaignVisitorsChart } from "@/components/Charts/campaign-visitors/chart";

type PropsType = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PropsType): Promise<Metadata> {
  const { id } = await params;
  const student = await getStudentBySapId(id);
  return {
    title: student ? `${student.name} | Student Profile` : "Student not found",
  };
}

// Alert Badge Component
function AlertBadge({ level, label }: { level: string; label: string }) {
  const styles = {
    critical: "bg-red-500 text-white border-red-600 shadow-red-200",
    warning: "bg-amber-500 text-white border-amber-600 shadow-amber-200",
    none: "bg-emerald-500 text-white border-emerald-600 shadow-emerald-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
        styles[level as keyof typeof styles] || styles.none
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-white animate-pulse", level === "none" && "hidden")} />
      {label}
    </span>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  alert,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  alert?: "critical" | "warning" | "none";
  icon: string;
}) {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-500",
    neutral: "text-gray-500",
  };

  const alertBorders = {
    critical: "border-l-4 border-l-red-500",
    warning: "border-l-4 border-l-amber-500",
    none: "border-l-4 border-l-emerald-500",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl  p-5 shadow-sm transition-shadow hover:shadow-md",
        alertBorders[alert || "none"],
        alert === "critical" ? "bg-red-500 dark:bg-red-600" : alert === "warning" ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-900 dark:text-white">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </span>
            {trend && (
              <span className={cn("text-sm font-medium text-gray-900 dark:text-white", trendColors[trend])}>
                {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-900 dark:text-white">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg dark:bg-white ml-4">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({
  value,
  max,
  label,
  comparison,
  type = "neutral",
}: {
  value: number;
  max: number;
  label: string;
  comparison?: number;
  type?: "success" | "warning" | "danger" | "neutral";
}) {
  const percentage = (value / max) * 100;
  const barColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-blue-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-white">
            {value.toFixed(1)}%
          </span>
          {comparison !== undefined && (
            <span
              className={cn(
                "text-xs font-medium",
                comparison >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              ({comparison >= 0 ? "+" : ""}
              {comparison.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColors[type])}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {comparison !== undefined && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Class Average</span>
          <span>{(value - comparison).toFixed(1)}% difference</span>
        </div>
      )}
    </div>
  );
}

export default async function StudentPage({ params }: PropsType) {
  const { id } = await params;
  const student = await getStudentBySapId(id);

  if (!student) notFound();

  const report = generateAlertReport(student);

  // Calculate metrics
  const attendanceDiff =
    student.attendance.attendance_percentage - student.attendance.class_average_attendance;
  const gpaDiff = student.gpa.current - (report.gpa_comparison.class_average_current || 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         {/* Alert History / Action Items */}
      {(student.gpa.alert_level || student.attendance.alert_level) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-800 dark:text-red-200">
            <span>⚠️</span>
            Attention Required
          </h3>
          <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
            {student.gpa.alert_level === "critical" && (
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                GPA is critically low ({student.gpa.current}). Immediate academic intervention recommended.
              </li>
            )}
            {student.gpa.alert_level === "warning" && (
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                GPA declining trend detected. Monitor academic progress closely.
              </li>
            )}
            {student.attendance.alert_level === "critical" && (
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                Attendance below 75% ({student.attendance.attendance_percentage.toFixed(1)}%). At risk of course failure.
              </li>
            )}
            {student.attendance.alert_level === "warning" && (
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                Attendance below class average. Engagement improvement needed.
              </li>
            )}
          </ul>
        </div>
      )}
        <div className="flex items-center gap-2">
          <AlertBadge
            level={student.overall_alert}
            label={
              student.overall_alert === "critical"
                ? "Critical Alert"
                : student.overall_alert === "warning"
                ? "Warning"
                : "Good Standing"
            }
          />
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-dark">
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 sm:px-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white blur-3xl" />
          </div>
          
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white/20 shadow-xl">
                <Image
                  src="/images/user/user-03.png"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  alt={student.name}
                />
              </div>
           
              <div
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs",
                  student.overall_alert === "critical"
                    ? "bg-red-500"
                    : student.overall_alert === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
              >
                {student.overall_alert === "none" ? "✓" : "!"}
              </div>
            </div>
            
            <div className="flex-1 text-white">
              <h1 className="text-2xl font-bold sm:text-3xl">{student.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-blue-100">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs opacity-70">SAP ID</span>
                  <span className="font-mono font-medium">{student.sap_id}</span>
                </span>
                <span className="hidden sm:inline opacity-40">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs opacity-70">Course</span>
                  <span className="font-medium">{student.course_id}</span>
                </span>
                <span className="hidden sm:inline opacity-40">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs opacity-70">Dept</span>
                  <span className="font-medium">{student.department_id}</span>
                </span>
              </div>
            </div>
            <MetricCard
            title="Attendance vs Avg"
            value={`${attendanceDiff >= 0 ? "+" : ""}${attendanceDiff.toFixed(1)}%`}
            subtitle={`Class avg: ${student.attendance.class_average_attendance.toFixed(1)}%`}
            trend={attendanceDiff >= 0 ? "up" : "down"}
            alert={attendanceDiff < -10 ? "critical" : attendanceDiff < 0 ? "warning" : "none"}
            icon="👥"
          />
            <div className="flex gap-3">
              <AlertBadge
                level={student.gpa.alert_level || "none"}
                label={`GPA: ${student.gpa.alert_level === "critical" ? "Red" : student.gpa.alert_level === "warning" ? "Yellow" : "Normal"}`}
              />
              <AlertBadge
                level={student.attendance.alert_level || "none"}
                label={`Att: ${student.attendance.alert_level === "critical" ? "Red" : student.attendance.alert_level === "warning" ? "Yellow" : "Normal"}`}
              />
            </div>
          </div>
        </div>

    
      </div>

      {/* Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Analytics */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-dark">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Attendance Analysis
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Performance vs class average
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl text-2xl",
                attendanceDiff < -10
                  ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                  : attendanceDiff < 0
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
              )}
            >
              📅
            </div>
          </div>

          <div className="space-y-6">
            <ProgressBar
              value={student.attendance.attendance_percentage}
              max={100}
              label="Your Attendance"
              comparison={attendanceDiff}
              type={
                student.attendance.attendance_percentage < 75
                  ? "danger"
                  : student.attendance.attendance_percentage < 85
                  ? "warning"
                  : "success"
              }
            />

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {student.attendance.classes_attended}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Classes Attended</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {student.attendance.total_classes_held - student.attendance.classes_attended}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Classes Missed</p>
              </div>
            </div>

          
          </div>
        </div>

        {/* GPA Analytics */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-dark">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                GPA Analysis
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Academic performance tracking
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl text-2xl",
                student.gpa.current < 2.0
                  ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                  : student.gpa.current < 3.0
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
              )}
            >
              🎓
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {student.gpa.current}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600/70">
                  Current
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-400">
                  {student.gpa.previous}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Previous
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl p-3 text-center",
                  student.gpa.change >= 0
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
                )}
              >
                <p
                  className={cn(
                    "text-xl font-bold",
                    student.gpa.change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                  )}
                >
                  {student.gpa.change > 0 ? "+" : ""}
                  {student.gpa.change}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    student.gpa.change >= 0 ? "text-emerald-600/70" : "text-red-600/70"
                  )}
                >
                  Change
                </p>
              </div>
            </div>

            {report.gpa_comparison.alert_triggered && (
              <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  ⚠️ {report.gpa_comparison.alert_reason}
                </p>
              </div>
            )}

            {report.gpa_comparison.history && report.gpa_comparison.history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  GPA Trend
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <CampaignVisitorsChart
                    data={report.gpa_comparison.history.map((h) => ({
                      x: h.semester,
                      y: h.gpa,
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

     
    </div>
  );
}