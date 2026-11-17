import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="16 November 2026">
      <p>ShikkhaSetu provides school management software to schools. This policy explains what personal information is processed, why, and the choices available to schools, parents and students.</p>
      <h2>Who is responsible</h2>
      <p>Each school decides what student, guardian and staff information it enters, and is responsible for it. ShikkhaSetu processes that information on the school&apos;s behalf and only on its instructions.</p>
      <h2>What we process</h2>
      <ul>
        <li><strong>Students:</strong> name, student ID, class, roll, date of birth, blood group (optional), attendance, marks and results, homework status, fees.</li>
        <li><strong>Guardians:</strong> name, relationship, mobile number, optional NID number recorded by the school for verification, PIN (stored only as a hash), acknowledgments and messages.</li>
        <li><strong>Staff:</strong> name, contact details, role, teaching assignments.</li>
        <li><strong>Technical:</strong> device type and sign-in times, used to show parents where their account is signed in and to detect misuse.</li>
      </ul>
      <h2>Why</h2>
      <ul>
        <li>To run the school&apos;s attendance, results, fees and communication.</li>
        <li>To tell guardians about their own children by app and SMS.</li>
        <li>To protect accounts and detect suspicious acknowledgments.</li>
      </ul>
      <h2>Children</h2>
      <p>We collect only what the school needs. Students cannot message staff privately, public result verification shows a partly hidden name and no contact details, and student data is never used for advertising.</p>
      <h2>Sharing</h2>
      <p>We do not sell personal information. We use an SMS gateway to deliver messages and a hosting provider to store data, under agreements that limit use to providing the service. We disclose information when required by Bangladeshi law.</p>
      <h2>Retention</h2>
      <p>Data is kept while the school uses ShikkhaSetu. After the contract ends, the school can export its data; we delete it 90 days later unless the school asks otherwise or the law requires us to keep it.</p>
      <h2>Your choices</h2>
      <p>Parents can choose which non-essential alerts they receive. Absence, result and security alerts cannot be turned off. To see or correct information, contact the school office; the school can contact us for help.</p>
      <h2>Contact</h2>
      <p>Questions about this policy: <a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
    </LegalPage>
  );
}
