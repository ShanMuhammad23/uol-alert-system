import { readFile } from "fs/promises";
import path from "path";
import { getStudentsForRole, getCoursesForRole, getDepartmentsForRole } from "@/lib/role";
import type { User } from "@/lib/role";
import { getDemoUserEmail } from "@/lib/auth";

const DATA_FILE = "data.json";

/** Extract program prefix from course ID (e.g. "CS101" -> "CS") */
export function getProgramFromCourse(courseId: string): string {
  const match = courseId.match(/^([A-Z]+)/);
  return match ? match[1] : courseId.substring(0, 2);
}

export type MasterFilterParams = {
  department_ids?: string[];
  programs?: string[];
  instructor_ids?: string[];
  course_ids?: string[];
};

/** GPA / Attendance filter: all | red (critical) | yellow (warning) | good (no alert) */
export type AlertDimensionFilter = "all" | "red" | "yellow" | "good";

function levelMatchesFilters(
  level: "critical" | "warning" | null,
  filters: AlertDimensionFilter[] | undefined
): boolean {
  if (!filters?.length) return true;
  const allowed = new Set<string | null>();
  for (const f of filters) {
    if (f === "red") allowed.add("critical");
    else if (f === "yellow") allowed.add("warning");
    else if (f === "good") allowed.add(null);
  }
  return allowed.has(level);
}

function applyGpaAttendanceFilter(
  students: Student[],
  gpaFilters: AlertDimensionFilter[] | undefined,
  attendanceFilters: AlertDimensionFilter[] | undefined
): Student[] {
  let out = students;
  if (gpaFilters?.length) {
    out = out.filter((s) => levelMatchesFilters(s.gpa.alert_level, gpaFilters));
  }
  if (attendanceFilters?.length) {
    out = out.filter((s) =>
      levelMatchesFilters(s.attendance.alert_level, attendanceFilters)
    );
  }
  return out;
}

export type MasterFilterOptions = {
  departments: { value: string; label: string }[];
  programs: { value: string; label: string }[];
  instructors: { value: string; label: string }[];
  courses: { value: string; label: string }[];
};

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
  /** GPA: drop >= 1.0 → red (critical), drop >= 0.5 and < 1.0 → yellow (warning) */
  gpa: { warning_drop: 0.5, critical_drop: 1.0 },
} as const;

const VALID_ROLES = ["dean", "hod", "teacher"] as const;

export async function getOverviewData(
  user?: AppUser | null,
  masterFilter?: MasterFilterParams,
  gpaFilters?: AlertDimensionFilter[],
  attendanceFilters?: AlertDimensionFilter[]
) {
  const data = await getDataJson();
  const { students: allStudents } = data;
  const hasValidUser =
    user && VALID_ROLES.includes(user.role as (typeof VALID_ROLES)[number]);
  let students = hasValidUser
    ? (getStudentsForRole(user as User, allStudents) as Student[])
    : allStudents;
  students = applyMasterFilter(students, masterFilter, data);
  students = applyGpaAttendanceFilter(students, gpaFilters, attendanceFilters);

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

/** Derive GPA alert_level from gpa.change using thresholds: drop >= 1 = red, drop >= 0.5 = yellow */
function applyGpaAlertThreshold(student: Student): void {
  const drop = Math.abs(Math.min(0, student.gpa.change));
  if (drop >= THRESHOLDS.gpa.critical_drop) {
    student.gpa.alert_level = "critical";
  } else if (drop >= THRESHOLDS.gpa.warning_drop) {
    student.gpa.alert_level = "warning";
  } else {
    student.gpa.alert_level = null;
  }
  const g = student.gpa.alert_level;
  const a = student.attendance.alert_level;
  student.overall_alert =
    g === "critical" || a === "critical"
      ? "critical"
      : g === "warning" || a === "warning"
        ? "warning"
        : "none";
}

async function getDataJson(): Promise<DataJson> {
  const dataPath = path.join(process.cwd(), "public", DATA_FILE);
  const raw = await readFile(dataPath, "utf-8");
  const data = JSON.parse(raw) as DataJson;
  data.students.forEach(applyGpaAlertThreshold);
  return data;
}

export async function getFullData(): Promise<DataJson> {
  return getDataJson();
}

/** Screen heading by role: Faculty name (dean), Department name(s) (hod), Instructor name (teacher). */
export function getScreenHeading(
  user: AppUser | null,
  data: { faculties: Faculty[]; departments: Department[] }
): string | null {
  if (!user) return null;
  if (user.role === "dean" && user.faculty_id) {
    return data.faculties.find((f) => f.id === user.faculty_id)?.name ?? null;
  }
  if (user.role === "hod" && user.department_ids?.length) {
    const names = data.departments
      .filter((d) => user.department_ids!.includes(d.id))
      .map((d) => d.name);
    return names.length ? names.join(", ") : null;
  }
  if (user.role === "teacher") return user.name;
  return null;
}

function applyMasterFilter(
  students: Student[],
  masterFilter: MasterFilterParams | undefined,
  data: DataJson
): Student[] {
  if (!masterFilter || Object.keys(masterFilter).length === 0) return students;
  let out = students;
  if (masterFilter.department_ids?.length) {
    out = out.filter((s) => masterFilter.department_ids!.includes(s.department_id));
  }
  if (masterFilter.programs?.length) {
    out = out.filter((s) =>
      masterFilter.programs!.includes(getProgramFromCourse(s.course_id))
    );
  }
  if (masterFilter.course_ids?.length) {
    out = out.filter((s) => masterFilter.course_ids!.includes(s.course_id));
  }
  if (masterFilter.instructor_ids?.length) {
    const courseIds = new Set<string>();
    for (const uid of masterFilter.instructor_ids) {
      const instructor = data.users.find(
        (u) => u.id === uid && u.role === "teacher" && u.course_ids?.length
      );
      instructor?.course_ids?.forEach((id) => courseIds.add(id));
    }
    if (courseIds.size) {
      out = out.filter((s) => courseIds.has(s.course_id));
    }
  }
  return out;
}

/** Get filter options with parent-child cascade: Department → Program → Course → Instructor. */
export async function getMasterFilterOptions(
  user?: AppUser | null,
  current?: MasterFilterParams
): Promise<MasterFilterOptions> {
  const data = await getDataJson();
  const departments = getDepartmentsForRole(user as User, data.departments).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  let coursesForRole = getCoursesForRole(user as User, data.courses);

  // Cascade: filter courses by selected departments
  if (current?.department_ids?.length) {
    coursesForRole = coursesForRole.filter((c) =>
      current.department_ids!.includes(c.department_id)
    );
  }

  // Programs = program prefixes from (cascaded) courses
  const programSet = new Set(coursesForRole.map((c) => getProgramFromCourse(c.id)));
  const programs = Array.from(programSet)
    .sort((a, b) => a.localeCompare(b))
    .map((p) => ({ value: p, label: p }));

  // Cascade: filter courses by selected programs
  let coursesFiltered = coursesForRole;
  if (current?.programs?.length) {
    coursesFiltered = coursesFiltered.filter((c) =>
      current.programs!.includes(getProgramFromCourse(c.id))
    );
  }

  const courses = coursesFiltered.map((c) => ({
    value: c.id,
    label: `${c.id} – ${c.name}`,
  }));

  // Instructors: who teach (selected courses) or who teach any of the cascaded courses
  const courseIdsForInstructors = current?.course_ids?.length
    ? current.course_ids
    : coursesFiltered.map((c) => c.id);

  const teachers = data.users.filter((u) => u.role === "teacher" && u.department_id);
  let instructors: { value: string; label: string }[] = [];
  if (user?.role === "dean" && user.faculty_id) {
    const deptIdsInFaculty = data.departments
      .filter((d) => d.faculty_id === user.faculty_id)
      .map((d) => d.id);
    instructors = teachers
      .filter(
        (t) =>
          t.department_id &&
          deptIdsInFaculty.includes(t.department_id) &&
          t.course_ids?.some((cid) => courseIdsForInstructors.includes(cid))
      )
      .map((t) => ({ value: t.id, label: t.name }));
  } else if (user?.role === "hod" && user.department_ids?.length) {
    instructors = teachers
      .filter(
        (t) =>
          t.department_id &&
          user.department_ids!.includes(t.department_id) &&
          t.course_ids?.some((cid) => courseIdsForInstructors.includes(cid))
      )
      .map((t) => ({ value: t.id, label: t.name }));
  } else if (user?.role === "teacher") {
    instructors = teachers
      .filter(
        (t) =>
          t.id === user.id &&
          t.course_ids?.some((cid) => courseIdsForInstructors.includes(cid))
      )
      .map((t) => ({ value: t.id, label: t.name }));
  }
  instructors.sort((a, b) => a.label.localeCompare(b.label));

  return { departments, programs, instructors, courses };
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

/** Stats per department for a faculty (dean view). When facultyId is null, returns all departments. Relation is one-way: department only (instructor does not filter departments). */
export async function getDeanDepartmentStats(
  facultyId: string | null,
  options?: { departmentIds?: string[] }
): Promise<DepartmentStats[]> {
  const data = await getDataJson();
  let departments = facultyId
    ? data.departments.filter((d) => d.faculty_id === facultyId)
    : data.departments;

  if (options?.departmentIds?.length) {
    const set = new Set(options.departmentIds);
    departments = departments.filter((d) => set.has(d.id));
  }

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

export type InstructorStats = {
  instructorId: string;
  instructorName: string;
  total: number;
  yellowGpa: number;
  redGpa: number;
  yellowAttendance: number;
  redAttendance: number;
};

/** Stats per instructor for a faculty (dean view). Returns instructors in departments under the given faculty. */
export async function getDeanInstructorStats(
  facultyId: string | null,
  options?: { departmentIds?: string[]; instructorIds?: string[] }
): Promise<InstructorStats[]> {
  const data = await getDataJson();
  const deptIdsInFaculty =
    facultyId != null
      ? data.departments.filter((d) => d.faculty_id === facultyId).map((d) => d.id)
      : data.departments.map((d) => d.id);

  let teachers = data.users.filter(
    (u) =>
      u.role === "teacher" &&
      u.department_id &&
      deptIdsInFaculty.includes(u.department_id) &&
      u.course_ids?.length
  );

  if (options?.instructorIds?.length) {
    const set = new Set(options.instructorIds);
    teachers = teachers.filter((t) => set.has(t.id));
  } else if (options?.departmentIds?.length) {
    const set = new Set(options.departmentIds);
    teachers = teachers.filter((t) => t.department_id && set.has(t.department_id));
  }

  return teachers.map((teacher) => {
    const courseIds = new Set(teacher.course_ids ?? []);
    const students = data.students.filter((s) => courseIds.has(s.course_id));
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
      instructorId: teacher.id,
      instructorName: teacher.name,
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
  user?: AppUser | null,
  masterFilter?: MasterFilterParams,
  gpaFilters?: AlertDimensionFilter[],
  attendanceFilters?: AlertDimensionFilter[]
): Promise<StudentsByAlertResult> {
  const data = await getDataJson();
  const allRaw = data.students;
  const all = user
    ? (getStudentsForRole(user as User, allRaw) as Student[])
    : allRaw;

  const filter = isValidAlertFilter(alertFilter) ? alertFilter : "all";

  let filtered =
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

  filtered = applyMasterFilter(filtered, masterFilter, data);
  filtered = applyGpaAttendanceFilter(filtered, gpaFilters, attendanceFilters);

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

  const gpaDrop = Math.abs(Math.min(0, gpa.change));
  let alertReason: string | null = null;
  if (student.gpa.alert_level === "critical") {
    alertReason = "GPA drop >= 1.0";
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
