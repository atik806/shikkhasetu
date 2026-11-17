"use client";

import { useParams } from "next/navigation";
import { StudentProfile } from "@/features/students/student-profile";

export default function TeacherStudent() {
  const { id } = useParams<{ id: string }>();
  return <StudentProfile id={id} backHref="/teacher/section" resultHrefBase="/teacher/results/view" />;
}
