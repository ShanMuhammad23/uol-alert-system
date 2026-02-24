"use client";

import { useRouter } from "next/navigation";
import InterventionForm from "@/components/Forms/Intervention-Form";
import type { InterventionFormData } from "@/components/Forms/Intervention-Form";
import { recordIntervention } from "@/app/(home)/intervention-actions";

type Props = { studentSapId: string; onSuccess?: () => void };

export function InterventionFormWithAction({ studentSapId, onSuccess }: Props) {
  const router = useRouter();

  const handleSubmit = async (data: InterventionFormData) => {
    await recordIntervention(studentSapId, {
      date: data.date,
      outreachMode: data.outreachMode,
      remarks: data.remarks,
      status: data.status,
    });
    router.refresh();
    onSuccess?.();
  };

  return <InterventionForm onSubmit={handleSubmit} />;
}
