"use client";

import { useParams } from "next/navigation";
import { ResultPage } from "@/features/results/components/result-page";

export default function TeacherResultView() {
  const { id } = useParams<{ id: string }>();
  return <ResultPage id={id} backHref="/teacher/acknowledgments" />;
}
