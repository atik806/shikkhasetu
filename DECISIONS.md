# Decisions

Choices made where the spec (`SYSTEM_PROMPT.md`) was open. Rule used: protect the parent's right to
know and the child's privacy.

1. **IndexedDB instead of localStorage** for the mock database. A whole school (360 students, a
   term of attendance, three exams) is several MB; localStorage is ~5 MB and synchronous.
2. **Attendance stored per section per day** (`AttendanceSheet` with `entries: { studentId: status }`)
   rather than one record per student per day. Same information, ~10× smaller in the browser.
   The backend can store per-student rows.
3. **Service contracts are TypeScript types derived from the mock** (`type ResultService = typeof mockResultService`)
   plus a typed `Services` registry. An API implementation must `satisfies` the same type.
4. **Class teacher is derived, not a role.** `Section.classTeacherId` grants
   `CLASS_TEACHER_PERMISSIONS` for that section only.
5. **ACKNOWLEDGED is derived** (a current result version with ≥1 acknowledgment). Overdue =
   published, no acknowledgment, past `publishedAt + ackDeadlineDays`.
6. **Correction keeps positions** from the previous version (recomputing every classmate's position
   after one correction would silently change other students' cards). The new version resets
   acknowledgment and re-notifies guardians.
7. **Class position** is set only when every section of that class is published.
8. **Anomaly flags never block.** "Same device as the student" is *low* (families share phones) and
   alone does not raise follow-up. Late-night acknowledgments are not flagged.
9. **Wrong PIN**: 3 wrong PINs lock PIN entry for 15 minutes and SMS the guardian. Failed PIN and
   OTP attempts are counted into the `failed_attempts` flag.
10. **Feature-phone flow**: the teacher always **calls the registered number** (we show a `tel:`
    link to it); codes from incoming calls are never accepted.
11. **Students never see who/when/how** an acknowledgment happened — only yes/no.
12. **Fees never hide a result.** "Hold the printed card for dues" only disables printing.
13. **Messages**: teacher ↔ guardian only, tied to one student. Parent messages outside office hours
    are delivered the next morning. A thread marked "complaint" alerts the head teacher.
14. **Gate**: duplicate = same student, same direction, within 2 minutes. Late = after shift start +
    grace. Checking OUT before the shift ends requires a reason and who picked the child up.
15. **Mock session cookie** (`ss_session`, base64 `{u, r}`) exists only so `proxy.ts` can redirect;
    it is not signed and not httpOnly. Clearly marked in code.
16. **Next 16 instant-navigation validation** is set to `manual-warning`: pages read browser-only data,
    so they render after a client splash by design.
17. **Seed codes are deterministic** (reproducible demo). Every code generated at runtime
    (verification codes, OTPs, slips) uses `crypto.getRandomValues`.
18. **Dev panel is on** in this demo build (it is how you read OTPs). Set `NEXT_PUBLIC_DEMO=0` to hide it.

## Proposed (not built)

* Real-time sync between devices (needs the backend).
* Photo upload for students and ID cards.
* Per-period attendance UI (the setting and the mismatch wording exist; the register is daily).
* Competency-based (new curriculum) report template.
