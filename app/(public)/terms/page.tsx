import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="16 November 2026">
      <p>These terms apply to schools that subscribe to ShikkhaSetu and to the staff, guardians and students who use it through their school.</p>
      <h2>The service</h2>
      <p>ShikkhaSetu provides web and mobile software for attendance, results, fees, notices and school communication. Features may change as the product improves; we will not remove a core feature during a paid term without notice.</p>
      <h2>Accounts</h2>
      <ul>
        <li>The school creates and manages all accounts. There is no public sign-up.</li>
        <li>Users must keep passwords and parent PINs private. Parents must not share their PIN with their children.</li>
        <li>The school is responsible for verifying guardians before linking them or changing their phone numbers.</li>
      </ul>
      <h2>Acknowledgments</h2>
      <p>A result acknowledgment records that the guardian&apos;s account confirmed the result using the guardian&apos;s PIN and a code sent to the registered phone, or that a teacher recorded it in person or by phone. It is strong evidence, not a guarantee that a specific person viewed the result.</p>
      <h2>Fees</h2>
      <p>Fees, if any, are set out in the written agreement with each school.</p>
      <h2>Acceptable use</h2>
      <p>Do not use the service to send unrelated marketing, to harass anyone, or to access data you are not authorised to see.</p>
      <h2>Data</h2>
      <p>The school owns its data. Our handling of personal information is described in the privacy policy.</p>
      <h2>Liability</h2>
      <p>The service is provided with reasonable care. We are not liable for indirect losses, and our total liability is limited to the fees paid in the previous twelve months, except where the law does not allow this limit.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Bangladesh, and disputes are subject to the courts of Dhaka.</p>
      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
    </LegalPage>
  );
}
