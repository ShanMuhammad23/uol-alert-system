import { readFile } from "fs/promises";
import path from "path";
import { getStudentsForRole } from "@/lib/role";
import type { User } from "@/lib/role";
import { getDemoUserEmail } from "@/lib/auth";

const DATA_FILE = "data.json";

export type GpaHistoryEntry = {
  semester: string;
  gpa: number;
  credit_hours: number;
};

export type Student = {
  sap_id: string;
  name: string;
  course_id: string;
  department_id: string;
  faculty_id: string;
  attendance: {
    total_classes_held: number;
    classes_attended: number;
    attendance_percentage: number;
    class_average_attendance: number;
    deviation_from_class_avg: number;
    total_students_in_class?: number;
    alert_level: "critical" | "warning" | null;
  };
  gpa: {
    history: GpaHistoryEntry[];
    current: number;
    previous: number;
    change: number;
    trend: "up" | "down" | "stable";
    class_average_gpa_current: number;
    class_average_gpa_previous: number;
    total_students_in_class?: number;
    alert_level: "critical" | "warning" | null;
  };
  overall_alert: "critical" | "warning" | "none";
};

export type Faculty = { id: string; name: string };
export type Department = { id: string; name: string; faculty_id: string };
export type Course = {
  id: string;
  name: string;
  department_id: string;
  faculty_id: string;
  total_classes_held: number;
  credit_hours: number;
  semester: string;
};

export type AppUser = {
  id: string;
  sap_id: string;
  name: string;
  email: string;
  password?: string;
  role: "dean" | "hod" | "teacher";
  faculty_id: string | null;
  department_id: string | null;
  department_ids: string[] | null;
  course_ids: string[] | null;
};

type DataJson = {
  metadata: {
    thresholds: {
      attendance: { warning_percentage: number; critical_percentage: number };
      gpa: { warning_drop: number; critical_drop: number };
    };
  };
  faculties: Faculty[];
  departments: Department[];
  courses: Course[];
  users: AppUser[];
  students: Student[];
};

const ALERT_FILTERS = ["all", "early_alert", "gpa", "attendance", "yellow_gpa", "red_gpa", "yellow_attendance", "red_attendance"] as const;
export type AlertFilter = (typeof ALERT_FILTERS)[number];

function isValidAlertFilter(value: string): value is AlertFilter {
  return ALERT_FILTERS.includes(value as AlertFilter);
}

export const THRESHOLDS = {
  attendance: { warning: 40, critical: 20 },
  gpa: { warning_drop: 1.0, critical_drop: 0.5 },
} as const;

export async function getOverviewData(user?: AppUser | null) {
  const data = await getDataJson();
  const { metadata, students: allStudents } = data;
  const students = user
    ? (getStudentsForRole(user as User, allStudents) as Student[])
    : allStudents;

  let yellowGpa = 0;
  let redGpa = 0;
  let yellowAttendance = 0;
  let redAttendance = 0;

  for (const s of students) {
    if (s.gpa.alert_level === "critical") redGpa += 1;
    if (s.gpa.alert_level === "warning") yellowGpa += 1;
    if (s.attendance.alert_level === "critical") redAttendance += 1;
    if (s.attendance.alert_level === "warning") yellowAttendance += 1;
  }

  const earlyAlertCount = students.filter(
    (s) => s.overall_alert === "critical" || s.overall_alert === "warning"
  ).length;

  return {
    totalStudents: students.length,
    earlyAlertCount,
    yellowGpa: { value: yellowGpa },
    redGpa: { value: redGpa },
    yellowAttendance: { value: yellowAttendance },
    redAttendance: { value: redAttendance },
  };
}

async function getDataJson(): Promise<DataJson> {
  const dataPath = path.join(process.cwd(), "public", DATA_FILE);
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw);
}

export async function getFullData(): Promise<DataJson> {
  return getDataJson();
}

export type DepartmentStats = {
  departmentId: string;
  departmentName: string;
  total: number;
  yellowGpa: number;
  redGpa: number;
  yellowAttendance: number;
  redAttendance: number;
};

/** Stats per department for a faculty (dean view). When facultyId is null, returns all departments. */
export async function getDeanDepartmentStats(
  facultyId: string | null
): Promise<DepartmentStats[]> {
  const data = await getDataJson();
  const departments = facultyId
    ? data.departments.filter((d) => d.faculty_id === facultyId)
    : data.departments;

  return departments.map((dept) => {
    const students = data.students.filter((s) => s.department_id === dept.id);
    let yellowGpa = 0,
      redGpa = 0,
      yellowAttendance = 0,
      redAttendance = 0;
    for (const s of students) {
      if (s.gpa.alert_level === "critical") redGpa += 1;
      if (s.gpa.alert_level === "warning") yellowGpa += 1;
      if (s.attendance.alert_level === "critical") redAttendance += 1;
      if (s.attendance.alert_level === "warning") yellowAttendance += 1;
    }
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      total: students.length,
      yellowGpa,
      redGpa,
      yellowAttendance,
      redAttendance,
    };
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const email = await getDemoUserEmail();
  if (!email) return null;
  const data = await getDataJson();
  const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  return user;
}

export async function findUserByEmailAndPassword(
  email: string,
  password: string
): Promise<AppUser | null> {
  const data = await getDataJson();
  const user =
    data.users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null;
  return user;
}

const DEFAULT_PAGE_SIZE = 30;

export type StudentsByAlertResult = {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getStudentsByAlert(
  alertFilter: string,
  options?: { page?: number; pageSize?: number },
  user?: AppUser | null
): Promise<StudentsByAlertResult> {
  const data = await getDataJson();
  const allRaw = data.students;
  const all = user
    ? (getStudentsForRole(user as User, allRaw) as Student[])
    : allRaw;

  const filter = isValidAlertFilter(alertFilter) ? alertFilter : "all";

  const filtered =
    filter === "all"
      ? all
      : all.filter((s) => {
          if (filter === "early_alert")
            return s.overall_alert === "critical" || s.overall_alert === "warning";
          if (filter === "gpa") return s.gpa.alert_level !== null;
          if (filter === "attendance") return s.attendance.alert_level !== null;
          if (filter === "yellow_gpa") return s.gpa.alert_level === "warning";
          if (filter === "red_gpa") return s.gpa.alert_level === "critical";
          if (filter === "yellow_attendance") return s.attendance.alert_level === "warning";
          if (filter === "red_attendance") return s.attendance.alert_level === "critical";
          return false;
        });

  const total = filtered.length;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = Math.max(1, options?.page ?? 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const students = filtered.slice(start, start + pageSize);

  return { students, total, page, pageSize, totalPages };
}

export async function getStudentBySapId(sapId: string): Promise<Student | null> {
  const data = await getDataJson();
  return data.students.find((s) => s.sap_id === sapId) ?? null;
}

/** Legacy alias for route compatibility (route param is still "id" but value is sap_id) */
export const getStudentById = getStudentBySapId;

export type AlertReport = {
  student_sap_id: string;
  attendance_comparison: {
    student_percentage: number;
    class_average: number;
    deviation: number;
    total_classes: number;
    attended: number;
    total_students: number;
    status: "above_average" | "below_average" | "critical";
  };
  gpa_comparison: {
    current: number;
    previous: number;
    change: number;
    trend: string;
    class_average_current: number;
    class_average_previous: number;
    history: GpaHistoryEntry[];
    alert_triggered: boolean;
    alert_reason: string | null;
  };
};

export function generateAlertReport(student: Student): AlertReport {
  const att = student.attendance;
  const gpa = student.gpa;

  let attStatus: "above_average" | "below_average" | "critical" = "above_average";
  if (att.deviation_from_class_avg < 0) {
    attStatus = att.attendance_percentage <= THRESHOLDS.attendance.critical ? "critical" : "below_average";
  }

  const gpaDrop = Math.abs(gpa.change);
  let alertReason: string | null = null;
  if (student.gpa.alert_level === "critical") {
    alertReason = gpaDrop >= THRESHOLDS.gpa.warning_drop ? "GPA drop >= 1.0" : "GPA drop >= 0.5";
  } else if (student.gpa.alert_level === "warning") {
    alertReason = "GPA drop >= 0.5";
  }

  return {
    student_sap_id: student.sap_id,
    attendance_comparison: {
      student_percentage: att.attendance_percentage,
      class_average: att.class_average_attendance,
      deviation: att.deviation_from_class_avg,
      total_classes: att.total_classes_held,
      attended: att.classes_attended,
      total_students: att.total_students_in_class ?? 0,
      status: attStatus,
    },
    gpa_comparison: {
      current: gpa.current,
      previous: gpa.previous,
      change: gpa.change,
      trend: gpa.trend,
      class_average_current: gpa.class_average_gpa_current,
      class_average_previous: gpa.class_average_gpa_previous,
      history: gpa.history,
      alert_triggered: student.gpa.alert_level !== null,
      alert_reason: alertReason,
    },
  };
}

export async function getChatsData() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return [
    { name: "Jacob Jones", profile: "/images/user/user-01.png", isActive: true, lastMessage: { content: "See you tomorrow at the meeting!", type: "text", timestamp: "2024-12-19T14:30:00Z", isRead: false }, unreadCount: 3 },
    { name: "Wilium Smith", profile: "/images/user/user-03.png", isActive: true, lastMessage: { content: "Thanks for the update", type: "text", timestamp: "2024-12-19T10:15:00Z", isRead: true }, unreadCount: 0 },
    { name: "Johurul Haque", profile: "/images/user/user-04.png", isActive: false, lastMessage: { content: "What's up?", type: "text", timestamp: "2024-12-19T10:15:00Z", isRead: true }, unreadCount: 0 },
    { name: "M. Chowdhury", profile: "/images/user/user-05.png", isActive: false, lastMessage: { content: "Where are you now?", type: "text", timestamp: "2024-12-19T10:15:00Z", isRead: true }, unreadCount: 2 },
    { name: "Akagami", profile: "/images/user/user-07.png", isActive: false, lastMessage: { content: "Hey, how are you?", type: "text", timestamp: "2024-12-19T10:15:00Z", isRead: true }, unreadCount: 0 },
  ];
}
