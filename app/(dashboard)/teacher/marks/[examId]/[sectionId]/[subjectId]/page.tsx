"use client";

import { useParams } from "next/navigation";
import { MarksGrid } from "@/features/results/components/marks-grid";

export default function MarksEntry() {
  const p = useParams<{ examId: string; sectionId: string; subjectId: string }>();
  return <MarksGrid examId={p.examId} sectionId={p.sectionId} subjectId={p.subjectId} backHref="/teacher/marks" />;
}
