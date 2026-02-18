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
import type { AppUser, Student, Department, Course } from "@/app/(home)/fetch";
import Link from "next/link";

type PropsType = {
  className?: string;
  selectedAlert?: string;
  user?: AppUser | null;
};

// Helper function to extract program prefix from course ID (e.g., "CS101" -> "CS")
function getProgramFromCourse(courseId: string): string {
  // Extract alphabetic prefix from course ID
  const match = courseId.match(/^([A-Z]+)/);
  return match ? match[1] : courseId.substring(0, 2);
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

export async function TopChannels({
  className,
  selectedAlert = "all",
  user,
}: PropsType) {
  const { students } = await getStudentsByAlert(
    selectedAlert,
    { page: 1, pageSize: 100000 },
    user,
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
        <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
          Students by alert
        </h2>
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
                  className="group rounded-md border border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-dark dark:text-white">
                        Department:{" "}
                        <span className="font-bold text-primary">{department.name}</span>
                      </span>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dark-6 dark:text-dark-5">
                        <span>
                          Total students:{" "}
                          <span className="font-semibold text-dark dark:text-white">
                            {deptStudents.length}
                          </span>
                        </span>
                        <span>
                          GPA alerts:{" "}
                          <span className="font-semibold text-red">
                            {deptGpaAlerts}
                          </span>
                        </span>
                        <span>
                          Attendance alerts:{" "}
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {deptAttendanceAlerts}
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
                      {programEntries.map(([programId, programCourses]) => {
                        const courseEntries = Object.entries(programCourses).sort(
                          ([a], [b]) => a.localeCompare(b),
                        );
                        const programStudents = Object.values(programCourses).flat();
                        const programGpaAlerts = programStudents.filter(
                          (s) => s.gpa.alert_level !== null,
                        ).length;
                        const programAttendanceAlerts = programStudents.filter(
                          (s) => s.attendance.alert_level !== null,
                        ).length;

                        return (
                          <details
                            key={programId}
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
                                    GPA alerts:{" "}
                                    <span className="font-semibold text-red">
                                      {programGpaAlerts}
                                    </span>
                                  </span>
                                  <span>
                                    Attendance alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {programAttendanceAlerts}
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
                                  const gpaAlerts = courseStudents.filter(
                                    (s) => s.gpa.alert_level !== null,
                                  ).length;
                                  const attendanceAlerts = courseStudents.filter(
                                    (s) => s.attendance.alert_level !== null,
                                  ).length;

                                  return (
                                    <details
                                      key={courseId}
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
                                              <span className="font-semibold text-red">
                                                {gpaAlerts}
                                              </span>
                                            </span>
                                            <span>
                                              Attendance alerts:{" "}
                                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                {attendanceAlerts}
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
                                          <TableHeader>
                                            <TableRow className="border-none uppercase [&>th]:text-center">
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
                                                Actions
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
                                                    <Link href={`/students/${student.sap_id}`}>
                                                      <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="lucide lucide-eye-icon lucide-eye"
                                                      >
                                                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                                        <circle cx="12" cy="12" r="3" />
                                                      </svg>
                                                    </Link>
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

  // For HoD, show nested structure: Program -> Course -> Students
  if (user?.role === "hod") {
    const data = await getFullData();
    const grouped = groupStudentsForHod(students);
    const programEntries = Object.entries(grouped).sort(([a], [b]) =>
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
            {programEntries.map(([programId, programCourses]) => {
              const courseEntries = Object.entries(programCourses).sort(
                ([a], [b]) => a.localeCompare(b),
              );
              const programStudents = Object.values(programCourses).flat();
              const programGpaAlerts = programStudents.filter(
                (s) => s.gpa.alert_level !== null,
              ).length;
              const programAttendanceAlerts = programStudents.filter(
                (s) => s.attendance.alert_level !== null,
              ).length;

              return (
                <details
                  key={programId}
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
                          <span className="font-semibold text-red">
                            {programGpaAlerts}
                          </span>
                        </span>
                        <span>
                          Attendance alerts:{" "}
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {programAttendanceAlerts}
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
                        const gpaAlerts = courseStudents.filter(
                          (s) => s.gpa.alert_level !== null,
                        ).length;
                        const attendanceAlerts = courseStudents.filter(
                          (s) => s.attendance.alert_level !== null,
                        ).length;

                        return (
                          <details
                            key={courseId}
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
                                    <span className="font-semibold text-red">
                                      {gpaAlerts}
                                    </span>
                                  </span>
                                  <span>
                                    Attendance alerts:{" "}
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                      {attendanceAlerts}
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
                                <TableHeader>
                                  <TableRow className="border-none uppercase [&>th]:text-center">
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
                                      Actions
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
                                          <Link href={`/students/${student.sap_id}`}>
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="1"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="lucide lucide-eye-icon lucide-eye"
                                            >
                                              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                              <circle cx="12" cy="12" r="3" />
                                            </svg>
                                          </Link>
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
            const gpaAlerts = courseStudents.filter(
              (s) => s.gpa.alert_level !== null,
            ).length;
            const attendanceAlerts = courseStudents.filter(
              (s) => s.attendance.alert_level !== null,
            ).length;

            return (
              <details
                key={courseId}
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
                        <span className="font-semibold text-red">
                          {gpaAlerts}
                        </span>
                      </span>
                      <span>
                        Attendance alerts:{" "}
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {attendanceAlerts}
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
                    <TableHeader>
                      <TableRow className="border-none uppercase [&>th]:text-center">
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
                          Actions
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
                              <Link href={`/students/${student.sap_id}`}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-eye-icon lucide-eye"
                                >
                                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Link>
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
