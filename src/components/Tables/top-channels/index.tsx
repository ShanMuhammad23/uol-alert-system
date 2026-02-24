import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getStudentsByAlert, getFullData } from "@/app/(home)/fetch";
import type {
  AppUser,
  Student,
  Department,
  Course,
  MasterFilterParams,
  AlertDimensionFilter,
} from "@/app/(home)/fetch";
import { StudentActionDropdown } from "@/app/(home)/_components/student-action-dropdown";
import { getLatestInterventionStatusForStudent } from "@/data/intervention-store";
import { InterventionStatusBadge } from "@/app/(home)/_components/intervention-status-badge";
import { StudentProfileLink } from "./StudentProfileLink";

type PropsType = {
  className?: string;
  returnToUrl?: string;
  expandedIds?: string[];
  selectedAlert?: string;
  user?: AppUser | null;
  masterFilter?: MasterFilterParams;
  gpaFilters?: AlertDimensionFilter[];
  attendanceFilters?: AlertDimensionFilter[];
};

// Helper function to extract program prefix from course ID (e.g., "CS101" -> "CS")
function getProgramFromCourse(courseId: string): string {
  // Extract alphabetic prefix from course ID
  const match = courseId.match(/^([A-Z]+)/);
  return match ? match[1] : courseId.substring(0, 2);
}

// Yellow (warning) vs red (critical) counts for overview-style display
function getAlertCounts(students: Student[]) {
  let gpaYellow = 0,
    gpaRed = 0,
    attYellow = 0,
    attRed = 0;
  for (const s of students) {
    if (s.gpa.alert_level === "warning") gpaYellow += 1;
    if (s.gpa.alert_level === "critical") gpaRed += 1;
    if (s.attendance.alert_level === "warning") attYellow += 1;
    if (s.attendance.alert_level === "critical") attRed += 1;
  }
  return { gpaYellow, gpaRed, attYellow, attRed };
}

// Group students by department -> program -> course
function groupStudentsForDean(
  students: Student[],
  departments: Department[],
  courses: Course[]
): Record<string, Record<string, Record<string, Student[]>>> {
  const result: Record<string, Record<string, Record<string, Student[]>>> = {};

  for (const student of students) {
    const deptId = student.department_id;
    const courseId = student.course_id;
    const programId = getProgramFromCourse(courseId);

    if (!result[deptId]) {
      result[deptId] = {};
    }
    if (!result[deptId][programId]) {
      result[deptId][programId] = {};
    }
    if (!result[deptId][programId][courseId]) {
      result[deptId][programId][courseId] = [];
    }
    result[deptId][programId][courseId].push(student);
  }

  return result;
}

// Group students by program -> course (for HoD; already scoped to department(s))
function groupStudentsForHod(
  students: Student[]
): Record<string, Record<string, Student[]>> {
  const result: Record<string, Record<string, Student[]>> = {};

  for (const student of students) {
    const courseId = student.course_id;
    const programId = getProgramFromCourse(courseId);

    if (!result[programId]) {
      result[programId] = {};
    }
    if (!result[programId][courseId]) {
      result[programId][courseId] = [];
    }
    result[programId][courseId].push(student);
  }

  return result;
}

const UNASSIGNED_INSTRUCTOR_ID = "__UNASSIGNED__";

// Group students by program -> instructor -> course (for HoD view)
function groupStudentsForHodInstructors(
  students: Student[],
  teachers: AppUser[],
  hodDepartmentIds: string[]
): Record<string, Record<string, Record<string, Student[]>>> {
  const result: Record<string, Record<string, Record<string, Student[]>>> = {};
  const teachersInDept = teachers.filter(
    (t) => t.role === "teacher" && t.department_id && hodDepartmentIds.includes(t.department_id)
  );
  const courseToInstructor = new Map<string, AppUser>();
  for (const t of teachersInDept) {
    if (t.course_ids) {
      for (const cid of t.course_ids) {
        courseToInstructor.set(cid, t);
      }
    }
  }

  for (const student of students) {
    const courseId = student.course_id;
    const programId = getProgramFromCourse(courseId);
    const instructor = courseToInstructor.get(courseId);
    const instructorId = instructor?.id ?? UNASSIGNED_INSTRUCTOR_ID;

    if (!result[programId]) result[programId] = {};
    if (!result[programId][instructorId]) result[programId][instructorId] = {};
    if (!result[programId][instructorId][courseId]) result[programId][instructorId][courseId] = [];
    result[programId][instructorId][courseId].push(student);
  }

  return result;
}

export async function TopChannels({
  className,
  returnToUrl = "/",
  expandedIds = [],
  selectedAlert = "all",
  user,
  masterFilter,
  gpaFilters,
  attendanceFilters,
}: PropsType) {
  const { students } = await getStudentsByAlert(
    selectedAlert,
    { page: 1, pageSize: 100000 },
    user,
    masterFilter,
    gpaFilters,
    attendanceFilters,
  );

  // For deans, show nested structure: Department -> Program -> Course -> Students
  if (user?.role === "dean") {
    const data = await getFullData();
    const grouped = groupStudentsForDean(students, data.departments, data.courses);

    // Sort departments by name
    const sortedDepartments = data.departments
      .filter((d) => grouped[d.id])
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div
        className={cn(
          "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
          className,
        )}
      >

        {students.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-stroke py-8 text-center text-dark-6 dark:border-dark-3">
            No students match this filter.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedDepartments.map((department) => {
              const deptPrograms = grouped[department.id];
              const programEntries = Object.entries(deptPrograms).sort(([a], [b]) =>
                a.localeCompare(b),
              );
              const deptSectionId = `dept-${department.id}`;

              // Calculate department stats
              const deptStudents = Object.values(deptPrograms)
                .flatMap((prog) => Object.values(prog).flat());
              const deptGpaAlerts = deptStudents.filter(
                (s) => s.gpa.alert_level !== null,
              ).length;
              const deptAttendanceAlerts = deptStudents.filter(
                (s) => s.attendance.alert_level !== null,
              ).length;

              return (
                <details
                  key={department.id}
                  data-section-id={deptSectionId}
                  open={expandedIds.includes(deptSectionId)}
                  className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-dark dark:text-white">
                        Department:{" "}
                        <span className="font-bold text-primary">{department.name}</span>
                      </span>

                    </div>
                    <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                      ▼
                    </span>
                  </summary>
                  <div className="border-t border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
                    <div className="space-y-3">
                      {programEntries.map(([programId, programCourses]) => {
                        const courseEntries = Object.entries(programCourses).sort(
                          ([a], [b]) => a.localeCompare(b),
                        );
                        const programStudents = Object.values(programCourses).flat();
                        const programAlerts = getAlertCounts(programStudents);
                        const progSectionId = `${deptSectionId}-prog-${programId}`;

                        return (
                          <details
                            key={programId}
                            data-section-id={progSectionId}
                            open={expandedIds.includes(progSectionId)}
                            className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                          >
                            <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-dark dark:text-white">
                                  Program:{" "}
                                  <span className="font-bold text-primary">{programId}</span>
                                </span>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                                  <span>
                                    Students:{" "}
                                    <span className="font-semibold text-dark dark:text-white">
                                      {programStudents.length}
                                    </span>
                                  </span>
                                  <span>
                                    Attendance alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {programAlerts.attYellow}
                                    </span>
                                    {" | "}
                                    <span className="font-semibold text-red">
                                      {programAlerts.attRed}
                                    </span>
                                  </span>
                                  <span>
                                    GPA alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {programAlerts.gpaYellow}
                                    </span>
                                    {" | "}
                                    <span className="font-semibold text-red">
                                      {programAlerts.gpaRed}
                                    </span>
                                  </span>

                                </div>
                              </div>
                              <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                                ▼
                              </span>
                            </summary>
                            <div className="border-t border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
                              <div className="space-y-3">
                                {courseEntries.map(([courseId, courseStudents]) => {
                                  const course = data.courses.find((c) => c.id === courseId);
                                  const classesHeld =
                                    courseStudents[0]?.attendance.total_classes_held ?? 0;
                                  const averageAttendance =
                                    courseStudents.reduce(
                                      (sum, s) => sum + s.attendance.attendance_percentage,
                                      0,
                                    ) / courseStudents.length;
                                  const courseAlerts = getAlertCounts(courseStudents);
                                  const courseSectionId = `${progSectionId}-course-${courseId}`;

                                  return (
                                    <details
                                      key={courseId}
                                      data-section-id={courseSectionId}
                                      open={expandedIds.includes(courseSectionId)}
                                      className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                                    >
                                      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-sm font-semibold text-dark dark:text-white">
                                            Course:{" "}
                                            <span className="font-bold text-primary">
                                              {courseId}
                                            </span>
                                            {course && (
                                              <span className="ml-2 text-xs text-dark-6 dark:text-dark-5">
                                                ({course.name})
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                                            <span>
                                              Classes held:{" "}
                                              <span className="font-semibold text-dark dark:text-white">
                                                {classesHeld}
                                              </span>
                                            </span>
                                            <span>
                                              Average attendance:{" "}
                                              <span className="font-semibold text-dark dark:text-white">
                                                {averageAttendance.toFixed(1)}%
                                              </span>
                                            </span>
                                            <span>
                                              Attendance alerts:{" "}
                                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {courseAlerts.attYellow}
                                              </span>
                                              {" | "}
                                              <span className="font-semibold text-red">
                                                {courseAlerts.attRed}
                                              </span>
                                            </span>
                                            <span>
                                              GPA alerts:{" "}
                                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {courseAlerts.gpaYellow}
                                              </span>
                                              {" | "}
                                              <span className="font-semibold text-red">
                                                {courseAlerts.gpaRed}
                                              </span>
                                            </span>

                                          </div>
                                        </div>
                                        <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                                          ▼
                                        </span>
                                      </summary>
                                      <div className="border-t border-stroke bg-white px-2 py-3 dark:border-dark-3 dark:bg-gray-dark">
                                        <Table>
                                          <TableHeader className="sticky top-0 z-10 border-b border-stroke bg-white dark:bg-gray-dark dark:border-dark-3 [&>tr]:border-stroke dark:[&>tr]:border-dark-3">
                                            <TableRow className="border-none uppercase [&>th]:text-center [&>th]:bg-white [&>th]:dark:bg-gray-dark">
                                              <TableHead className="min-w-[140px] !text-left">
                                                Name
                                              </TableHead>
                                              <TableHead className="min-w-[100px] !text-left">
                                                SAP ID
                                              </TableHead>
                                              <TableHead className="min-w-[80px] !text-left">
                                                Course
                                              </TableHead>
                                              <TableHead className="text-center">Present</TableHead>
                                              <TableHead className="text-center">Absent</TableHead>
                                              <TableHead className="text-center">
                                                Attendance %
                                              </TableHead>
                                              <TableHead className="text-center">GPA</TableHead>
                                              <TableHead className="min-w-[80px] !text-left">
                                                Intervention Status
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {courseStudents.map((student) => {
                                              const trendSymbol =
                                                student.gpa.trend === "up"
                                                  ? "↗"
                                                  : student.gpa.trend === "down"
                                                    ? "↘"
                                                    : "→";
                                              const absent =
                                                student.attendance.total_classes_held -
                                                student.attendance.classes_attended;
                                              const gpaColor =
                                                student.gpa.alert_level === "critical"
                                                  ? "text-red font-semibold"
                                                  : student.gpa.alert_level === "warning"
                                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                    : "text-dark dark:text-white";
                                              const attColor =
                                                student.attendance.alert_level === "critical"
                                                  ? "text-red font-semibold"
                                                  : student.attendance.alert_level === "warning"
                                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                    : "text-dark dark:text-white";

                                              return (
                                                <TableRow
                                                  className="text-center text-base font-medium text-dark dark:text-white"
                                                  key={student.sap_id}
                                                >

                                                  <TableCell className="!text-left font-medium flex items-center gap-2">
                                                    <StudentProfileLink
                                                      sapId={student.sap_id}
                                                      returnToUrl={returnToUrl}
                                                      className="inline-flex items-center gap-2 text-green-500 hover:bg-gray-100 hover:text-dark dark:text-dark-5 dark:hover:bg-dark-3 dark:hover:text-white rounded-md p-2 -m-2"
                                                      title="View profile"
                                                    >
                                                      <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="20"
                                                        height="20"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      >
                                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                                        <circle cx="12" cy="12" r="3" />
                                                      </svg>
                                                      {student.name}
                                                    </StudentProfileLink>
                                                  </TableCell>
                                                  <TableCell className="!text-left text-dark-6">
                                                    {student.sap_id}
                                                  </TableCell>
                                                  <TableCell className="!text-left">
                                                    {student.course_id}
                                                  </TableCell>
                                                 
                                                  <TableCell>
                                                    {student.attendance.classes_attended}
                                                  </TableCell>
                                                  <TableCell>{absent}</TableCell>
                                                  <TableCell className={cn(attColor)}>
                                                    {student.attendance.attendance_percentage.toFixed(
                                                      1,
                                                    )}
                                                    %
                                                  </TableCell>
                                                  <TableCell className={cn(gpaColor)}>
                                                    {student.gpa.current}
                                                    <span
                                                      className="ml-1 text-dark-6"
                                                      title={student.gpa.trend}
                                                    >
                                                      {trendSymbol}
                                                    </span>
                                                    {student.gpa.change !== 0 && (
                                                      <span
                                                        className={cn(
                                                          "ml-1 text-xs",
                                                          student.gpa.change < 0
                                                            ? "text-red"
                                                            : "text-green",
                                                        )}
                                                      >
                                                        ({student.gpa.change > 0 ? "+" : ""}
                                                        {student.gpa.change})
                                                      </span>
                                                    )}
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <InterventionStatusBadge status={getLatestInterventionStatusForStudent(student.sap_id)} />
                                                      <StudentActionDropdown student={student} latestResult={null} />
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // For HoD, show nested structure: Program -> Instructors -> Courses -> Students
  if (user?.role === "hod") {
    const data = await getFullData();
    const hodDepartmentIds = user.department_ids ?? [];
    const grouped = groupStudentsForHodInstructors(
      students,
      data.users,
      hodDepartmentIds,
    );
    const programEntries = Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const getInstructorName = (instructorId: string) => {
      if (instructorId === UNASSIGNED_INSTRUCTOR_ID) return "Unassigned";
      const u = data.users.find((x) => x.id === instructorId);
      return u?.name ?? instructorId;
    };

    return (
      <div
        className={cn(
          "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
          className,
        )}
      >
        <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
          Students by alert
        </h2>
        {students.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-stroke py-8 text-center text-dark-6 dark:border-dark-3">
            No students match this filter.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {programEntries.map(([programId, programInstructors]) => {
              const instructorEntries = Object.entries(programInstructors).sort(
                ([aId], [bId]) =>
                  getInstructorName(aId).localeCompare(getInstructorName(bId)),
              );
              const programStudents = Object.values(programInstructors).flatMap(
                (courses) => Object.values(courses).flat(),
              );
              const programAlerts = getAlertCounts(programStudents);
              const hodProgId = `hod-prog-${programId}`;

              return (
                <details
                  key={programId}
                  data-section-id={hodProgId}
                  open={expandedIds.includes(hodProgId)}
                  className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-dark dark:text-white">
                        Program:{" "}
                        <span className="font-bold text-primary">{programId}</span>
                      </span>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                        <span>
                          Total students:{" "}
                          <span className="font-semibold text-dark dark:text-white">
                            {programStudents.length}
                          </span>
                        </span>
                        <span>
                          GPA alerts:{" "}
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {programAlerts.gpaYellow}
                          </span>
                          {" | "}
                          <span className="font-semibold text-red">
                            {programAlerts.gpaRed}
                          </span>
                        </span>
                        <span>
                          Attendance alerts:{" "}
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {programAlerts.attYellow}
                          </span>
                          {" | "}
                          <span className="font-semibold text-red">
                            {programAlerts.attRed}
                          </span>
                        </span>
                      </div>
                    </div>
                    <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                      ▼
                    </span>
                  </summary>
                  <div className="border-t border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
                    <div className="space-y-3">
                      {instructorEntries.map(([instructorId, instructorCourses]) => {
                        const courseEntries = Object.entries(instructorCourses).sort(
                          ([a], [b]) => a.localeCompare(b),
                        );
                        const instructorStudents = Object.values(
                          instructorCourses,
                        ).flat();
                        const instructorAlerts = getAlertCounts(instructorStudents);
                        const hodInstId = `${hodProgId}-inst-${instructorId}`;

                        return (
                          <details
                            key={instructorId}
                            data-section-id={hodInstId}
                            open={expandedIds.includes(hodInstId)}
                            className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                          >
                            <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-dark dark:text-white">

                                  <span className="font-bold text-primary">
                                    {getInstructorName(instructorId)}
                                  </span>
                                </span>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                                  <span>
                                    Students:{" "}
                                    <span className="font-semibold text-dark dark:text-white">
                                      {instructorStudents.length}
                                    </span>
                                  </span>
                                  <span>
                                    GPA alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {instructorAlerts.gpaYellow}
                                    </span>
                                    {" | "}
                                    <span className="font-semibold text-red">
                                      {instructorAlerts.gpaRed}
                                    </span>
                                  </span>
                                  <span>
                                    Attendance alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {instructorAlerts.attYellow}
                                    </span>
                                    {" | "}
                                    <span className="font-semibold text-red">
                                      {instructorAlerts.attRed}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                                ▼
                              </span>
                            </summary>
                            <div className="border-t border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-gray-dark">
                              <div className="space-y-3">
                                {courseEntries.map(([courseId, courseStudents]) => {
                                  const course = data.courses.find(
                                    (c) => c.id === courseId,
                                  );
                                  const classesHeld =
                                    courseStudents[0]?.attendance.total_classes_held ??
                                    0;
                                  const averageAttendance =
                                    courseStudents.reduce(
                                      (sum, s) =>
                                        sum + s.attendance.attendance_percentage,
                                      0,
                                    ) / courseStudents.length;
                                  const courseAlertsHod = getAlertCounts(courseStudents);
                                  const hodCourseId = `${hodInstId}-course-${courseId}`;

                                  return (
                                    <details
                                      key={courseId}
                                      data-section-id={hodCourseId}
                                      open={expandedIds.includes(hodCourseId)}
                                      className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                                    >
                                      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-sm font-semibold text-dark dark:text-white">
                                            Course:{" "}
                                            <span className="font-bold text-primary">
                                              {courseId}
                                            </span>
                                            {course && (
                                              <span className="ml-2 text-xs text-dark-6 dark:text-dark-5">
                                                ({course.name})
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                                            <span>
                                              Classes held:{" "}
                                              <span className="font-semibold text-dark dark:text-white">
                                                {classesHeld}
                                              </span>
                                            </span>
                                            <span>
                                              Average attendance:{" "}
                                              <span className="font-semibold text-dark dark:text-white">
                                                {averageAttendance.toFixed(1)}%
                                              </span>
                                            </span>
                                            <span>
                                              GPA alerts:{" "}
                                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {courseAlertsHod.gpaYellow}
                                              </span>
                                              {" | "}
                                              <span className="font-semibold text-red">
                                                {courseAlertsHod.gpaRed}
                                              </span>
                                            </span>
                                            <span>
                                              Attendance alerts:{" "}
                                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {courseAlertsHod.attYellow}
                                              </span>
                                              {" | "}
                                              <span className="font-semibold text-red">
                                                {courseAlertsHod.attRed}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                        <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                                          ▼
                                        </span>
                                      </summary>
                                      <div className="border-t border-stroke bg-white px-2 py-3 dark:border-dark-3 dark:bg-gray-dark">
                                        <Table>
                                          <TableHeader className="sticky top-0 z-10 border-b border-stroke bg-white dark:bg-gray-dark dark:border-dark-3 [&>tr]:border-stroke dark:[&>tr]:border-dark-3">
                                            <TableRow className="border-none uppercase [&>th]:text-center [&>th]:bg-white [&>th]:dark:bg-gray-dark">
                                              <TableHead className="min-w-[140px] !text-left">
                                                Name
                                              </TableHead>
                                              <TableHead className="min-w-[100px] !text-left">
                                                SAP ID
                                              </TableHead>
                                              <TableHead className="min-w-[80px] !text-left">
                                                Course
                                              </TableHead>
                                              <TableHead className="text-center">GPA</TableHead>
                                              <TableHead className="text-center">Present</TableHead>
                                              <TableHead className="text-center">Absent</TableHead>
                                              <TableHead className="text-center">
                                                Attendance %
                                              </TableHead>
                                              <TableHead className="min-w-[80px] !text-left">
                                                Intervention Status
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {courseStudents.map((student) => {
                                              const trendSymbol =
                                                student.gpa.trend === "up"
                                                  ? "↗"
                                                  : student.gpa.trend === "down"
                                                    ? "↘"
                                                    : "→";
                                              const absent =
                                                student.attendance.total_classes_held -
                                                student.attendance.classes_attended;
                                              const gpaColor =
                                                student.gpa.alert_level === "critical"
                                                  ? "text-red font-semibold"
                                                  : student.gpa.alert_level === "warning"
                                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                    : "text-dark dark:text-white";
                                              const attColor =
                                                student.attendance.alert_level === "critical"
                                                  ? "text-red font-semibold"
                                                  : student.attendance.alert_level === "warning"
                                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                    : "text-dark dark:text-white";

                                              return (
                                                <TableRow
                                                  className="text-center text-base font-medium text-dark dark:text-white"
                                                  key={student.sap_id}
                                                >
                                                  <TableCell className="!text-left font-medium">
                                                    {student.name}
                                                  </TableCell>
                                                  <TableCell className="!text-left text-dark-6">
                                                    {student.sap_id}
                                                  </TableCell>
                                                  <TableCell className="!text-left">
                                                    {student.course_id}
                                                  </TableCell>
                                                  <TableCell className={cn(gpaColor)}>
                                                    {student.gpa.current}
                                                    <span
                                                      className="ml-1 text-dark-6"
                                                      title={student.gpa.trend}
                                                    >
                                                      {trendSymbol}
                                                    </span>
                                                    {student.gpa.change !== 0 && (
                                                      <span
                                                        className={cn(
                                                          "ml-1 text-xs",
                                                          student.gpa.change < 0
                                                            ? "text-red"
                                                            : "text-green",
                                                        )}
                                                      >
                                                        ({student.gpa.change > 0 ? "+" : ""}
                                                        {student.gpa.change})
                                                      </span>
                                                    )}
                                                  </TableCell>
                                                  <TableCell>
                                                    {student.attendance.classes_attended}
                                                  </TableCell>
                                                  <TableCell>{absent}</TableCell>
                                                  <TableCell className={cn(attColor)}>
                                                    {student.attendance.attendance_percentage.toFixed(
                                                      1,
                                                    )}
                                                    %
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <InterventionStatusBadge status={getLatestInterventionStatusForStudent(student.sap_id)} />
                                                      <StudentActionDropdown student={student} latestResult={null} />
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Original logic for non-dean users (teachers)
  const groupedByCourse = students.reduce<Record<string, typeof students>>(
    (acc, student) => {
      const key = student.course_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    },
    {},
  );

  const groupedEntries = Object.entries(groupedByCourse).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div
      className={cn(
        "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
        Students by alert
      </h2>
      {students.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-stroke py-8 text-center text-dark-6 dark:border-dark-3">
          No students match this filter.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groupedEntries.map(([courseId, courseStudents]) => {
            const classesHeld =
              courseStudents[0]?.attendance.total_classes_held ?? 0;
            const averageAttendance =
              courseStudents.reduce(
                (sum, s) => sum + s.attendance.attendance_percentage,
                0,
              ) / courseStudents.length;
            const courseAlertsTeacher = getAlertCounts(courseStudents);
            const teacherCourseId = `teacher-course-${courseId}`;

            return (
              <details
                key={courseId}
                data-section-id={teacherCourseId}
                open={expandedIds.includes(teacherCourseId)}
                className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-dark dark:text-white">
                      Course:{" "}
                      <span className="font-bold text-primary">{courseId}</span>
                    </span>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                      <span>
                        Classes held:{" "}
                        <span className="font-semibold text-dark dark:text-white">
                          {classesHeld}
                        </span>
                      </span>
                      <span>
                        Average attendance:{" "}
                        <span className="font-semibold text-dark dark:text-white">
                          {averageAttendance.toFixed(1)}%
                        </span>
                      </span>
                      <span>
                        GPA alerts:{" "}
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {courseAlertsTeacher.gpaYellow}
                        </span>
                        {" | "}
                        <span className="font-semibold text-red">
                          {courseAlertsTeacher.gpaRed}
                        </span>
                      </span>
                      <span>
                        Attendance alerts:{" "}
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {courseAlertsTeacher.attYellow}
                        </span>
                        {" | "}
                        <span className="font-semibold text-red">
                          {courseAlertsTeacher.attRed}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-dark-6 transition-transform group-open:rotate-180 dark:text-dark-5">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-stroke bg-white px-2 py-3 dark:border-dark-3 dark:bg-gray-dark">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 border-b border-stroke bg-white dark:bg-gray-dark dark:border-dark-3 [&>tr]:border-stroke dark:[&>tr]:border-dark-3">
                      <TableRow className="border-none uppercase [&>th]:text-center [&>th]:bg-white [&>th]:dark:bg-gray-dark">
                        <TableHead className="min-w-[140px] !text-left">
                          Name
                        </TableHead>
                        <TableHead className="min-w-[100px] !text-left">
                          SAP ID
                        </TableHead>
                        <TableHead className="min-w-[80px] !text-left">
                          Course
                        </TableHead>
                        <TableHead className="text-center">GPA</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">
                          Attendance %
                        </TableHead>



                        <TableHead className="min-w-[80px] !text-left">
                          Intervention Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseStudents.map((student) => {
                        const trendSymbol =
                          student.gpa.trend === "up"
                            ? "↗"
                            : student.gpa.trend === "down"
                              ? "↘"
                              : "→";
                        const absent =
                          student.attendance.total_classes_held -
                          student.attendance.classes_attended;
                        const gpaColor =
                          student.gpa.alert_level === "critical"
                            ? "text-red font-semibold"
                            : student.gpa.alert_level === "warning"
                              ? "text-amber-600 dark:text-amber-400 font-semibold"
                              : "text-dark dark:text-white";
                        const attColor =
                          student.attendance.alert_level === "critical"
                            ? "text-red font-semibold"
                            : student.attendance.alert_level === "warning"
                              ? "text-amber-600 dark:text-amber-400 font-semibold"
                              : "text-dark dark:text-white";

                        return (
                          <TableRow
                            className="text-center text-base font-medium text-dark dark:text-white"
                            key={student.sap_id}
                          >
                            <TableCell className="!text-left font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell className="!text-left text-dark-6">
                              {student.sap_id}
                            </TableCell>
                            <TableCell className="!text-left">
                              {student.course_id}
                            </TableCell>
                            <TableCell className={cn(gpaColor)}>
                              {student.gpa.current}
                              <span
                                className="ml-1 text-dark-6"
                                title={student.gpa.trend}
                              >
                                {trendSymbol}
                              </span>
                              {student.gpa.change !== 0 && (
                                <span
                                  className={cn(
                                    "ml-1 text-xs",
                                    student.gpa.change < 0
                                      ? "text-red"
                                      : "text-green",
                                  )}
                                >
                                  ({student.gpa.change > 0 ? "+" : ""}
                                  {student.gpa.change})
                                </span>
                              )}
                            </TableCell>


                            <TableCell>
                              {student.attendance.classes_attended}
                            </TableCell>
                            <TableCell>{absent}</TableCell>
                            <TableCell className={cn(attColor)}>
                              {student.attendance.attendance_percentage.toFixed(
                                1,
                              )}
                              %
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <InterventionStatusBadge status={getLatestInterventionStatusForStudent(student.sap_id)} />
                                <StudentActionDropdown student={student} latestResult={null} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
