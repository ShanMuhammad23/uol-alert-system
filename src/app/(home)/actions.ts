"use server";

import {
  recordStudentAction as saveStudentAction,
} from "@/data/student-actions-store";
import type { StudentActionType } from "@/data/student-actions";

export async function recordStudentAction(
  studentSapId: string,
  actionType: StudentActionType
): Promise<void> {
  saveStudentAction(studentSapId, actionType, "improved");
}
