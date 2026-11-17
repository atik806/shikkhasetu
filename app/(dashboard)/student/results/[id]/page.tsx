"use client";

import { useParams } from "next/navigation";
import { ResultPage } from "@/features/results/components/result-page";

export default function StudentResultDetail() {
  const { id } = useParams<{ id: string }>();
  return <ResultPage id={id} backHref="/student/results" />;
}
