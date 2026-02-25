import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

/** Matches Intervention-Form fields for intervention history. */
export type InterventionRecord = {
  id: string;
  student_sap_id: string;
  date: string; // YYYY-MM-DD
  outreach_mode: string; // email | phone-call | meeting
  remarks: string;
  status: string; // initiated | in-progress | referred | resolved
  performed_at: string; // ISO date
};

const STORE_DIR = ".data";
const STORE_FILENAME = "intervention-store.json";

function getStorePath(): string {
  return path.join(process.cwd(), STORE_DIR, STORE_FILENAME);
}

function readStore(): InterventionRecord[] {
  const storePath = getStorePath();
  if (!existsSync(storePath)) return [];
  try {
    const raw = readFileSync(storePath, "utf-8");
    const data = JSON.parse(raw) as InterventionRecord[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeStore(records: InterventionRecord[]): void {
  const storePath = getStorePath();
  const dir = path.dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(storePath, JSON.stringify(records, null, 2), "utf-8");
}

/** All interventions for a student, newest first. */
export function getInterventionsByStudentSapId(
  sapId: string
): InterventionRecord[] {
  const stored = readStore();
  return stored
    .filter((r) => r.student_sap_id === sapId)
    .sort(
      (a, b) =>
        new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()
    );
}

/** Latest intervention status for this student (for badge). Returns null when no intervention. */
export function getLatestInterventionStatusForStudent(
  sapId: string
): string | null {
  const list = getInterventionsByStudentSapId(sapId);
  return list.length > 0 ? list[0].status : null;
}

export type InterventionStatsCounts = {
  notStarted: number;
  initiated: number;
  "in-progress": number;
  referred: number;
  resolved: number;
};

/**
 * For a given set of student SAP IDs (e.g. all students in alert for the user),
 * returns counts per intervention status. "Not Started" = in alert but no action taken.
 * Sum of all counts equals sapIds.length.
 */
export function getInterventionStatsForStudents(
  sapIds: string[]
): InterventionStatsCounts {
  const stored = readStore();
  const latestBySapId = new Map<string, InterventionRecord>();
  for (const r of stored) {
    const existing = latestBySapId.get(r.student_sap_id);
    if (
      !existing ||
      new Date(r.performed_at).getTime() > new Date(existing.performed_at).getTime()
    ) {
      latestBySapId.set(r.student_sap_id, r);
    }
  }
  let notStarted = 0;
  let initiated = 0;
  let inProgress = 0;
  let referred = 0;
  let resolved = 0;
  for (const sapId of sapIds) {
    const record = latestBySapId.get(sapId);
    const status = record?.status ?? null;
    if (status === null) notStarted += 1;
    else if (status === "initiated") initiated += 1;
    else if (status === "in-progress") inProgress += 1;
    else if (status === "referred") referred += 1;
    else if (status === "resolved") resolved += 1;
    else notStarted += 1;
  }
  return {
    notStarted,
    initiated,
    "in-progress": inProgress,
    referred,
    resolved,
  };
}

export function recordIntervention(
  studentSapId: string,
  data: {
    date: string;
    outreach_mode: string;
    remarks: string;
    status: string;
  }
): void {
  const stored = readStore();
  const record: InterventionRecord = {
    id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    student_sap_id: studentSapId,
    date: data.date,
    outreach_mode: data.outreach_mode,
    remarks: data.remarks,
    status: data.status,
    performed_at: new Date().toISOString(),
  };
  stored.push(record);
  writeStore(stored);
  revalidatePath("/");
  revalidatePath(`/students/${studentSapId}`);
}
