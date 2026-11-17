import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CreditCard, KeyRound, MessageSquare, Phone, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckList, Faq, FeatureCard, PageHero, Section, SectionHeading } from "@/components/marketing/blocks";
import { ParentResultScreen, PhoneFrame, SmsBubble } from "@/components/marketing/mockups";
import { RoundPhoto, SnapshotPhoto, StickyNote } from "@/components/marketing/doodles";

export const metadata: Metadata = {
  title: "For parents · অভিভাবকদের জন্য",
  description: "How ShikkhaSetu works for parents: attendance alerts, results you acknowledge with your PIN, fees, homework and messages — in Bangla.",
};

export default function Parents() {
  return (
    <div lang="bn">
      <PageHero
        eyebrow="অভিভাবকদের জন্য · For parents"
        title="সন্তানের খবর, সরাসরি আপনার ফোনে"
        lead="স্কুলে পৌঁছাল কি না, ক্লাসে আছে কি না, পরীক্ষায় কেমন করল — সব খবর আপনি নিজেই পাবেন, সন্তানের মাধ্যমে নয়।"
        aside={
          <>
            <SnapshotPhoto src="/images/school/girl-with-bangla-book.jpg" alt="A smiling girl holding her Bangla textbook on the road to school" caption="আমার বাংলা বই 📖" rotate="rotate-[3deg]" aspect="aspect-[4/5]" className="mx-auto w-[78%]" priority sizes="(min-width: 1024px) 360px, 78vw" />
            <StickyNote color="leaf" className="absolute -bottom-4 -left-2 w-44 rotate-[-5deg] text-lg">৭:২৮ — স্কুলে পৌঁছেছে ✓</StickyNote>
          </>
        }
      >
        <p className="max-w-2xl text-muted-foreground" lang="en">Know when your child reaches school, whether they stayed in class, and how they did in exams — directly, not through your child.</p>
      </PageHero>

      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="প্রতিদিন" title="প্রতিদিন যা জানবেন" />
            <CheckList
              className="mt-8"
              items={[
                "সন্তান গেটে পৌঁছালে সাথে সাথে বার্তা",
                "ক্লাসে অনুপস্থিত বা দেরি হলে বার্তা — এটি বন্ধ করা যায় না",
                "গেটে এসেছে কিন্তু ক্লাসে নেই — এমন হলে তখনই জানবেন",
                "আগে ছুটি নিলে ওই দিনগুলোর জন্য অনুপস্থিতির বার্তা আসবে না",
                "আজকের বাড়ির কাজ ও ডায়েরি, স্কুলের নোটিশ",
              ]}
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <RoundPhoto src="/images/school/smiling-children.jpg" alt="Smiling schoolchildren in rural Bangladesh" aspect="aspect-[16/9]" className="mb-2 w-full max-w-md" sizes="(min-width: 1024px) 450px, 92vw" />
            <SmsBubble time="৭:২৮" tone="success">✅ রহিম সকাল ৭:২৮-এ স্কুলে পৌঁছেছে।</SmsBubble>
            <SmsBubble time="৮:০৬" tone="alert">⚠️ তানভীর গেটে এসেছে কিন্তু ক্লাসে অনুপস্থিত। শ্রেণি শিক্ষককে জানানো হয়েছে।</SmsBubble>
            <SmsBubble time="১১:১০">🚪 নুসরাত ১১:১০-এ স্কুল থেকে বের হয়েছে। কারণ: অসুস্থ, নিয়ে গেছেন: চাচা।</SmsBubble>
          </div>
        </div>
      </Section>

      <Section tone="cream">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex justify-center"><PhoneFrame><ParentResultScreen /></PhoneFrame></div>
          <div>
            <SectionHeading eyebrow="ফলাফল" title="ফলাফল দেখে নিজেই নিশ্চিত করুন" lead="কাগজে সই করার বদলে অ্যাপে তিনটি ধাপ। এতে শ্রেণি শিক্ষক জানবেন যে আপনি সত্যিই ফলাফল দেখেছেন।" />
            <ol className="mt-8 space-y-4">
              {[
                ["১", "ফলাফল খুলুন", "নম্বর, গ্রেড, জিপিএ, অবস্থান ও শিক্ষকের মন্তব্য দেখুন।"],
                ["২", "আপনার পিন দিন", "স্কুল অফিসে আপনি যে পিন সেট করেছেন। সন্তানকে কখনো বলবেন না।"],
                ["৩", "এসএমএস কোড দিন", "স্কুলে নিবন্ধিত আপনার নম্বরে ৬ অঙ্কের কোড আসবে। ব্যস, হয়ে গেল।"],
              ].map(([n, t, b]) => (
                <li key={n} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">{n}</span>
                  <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{b}</p></div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted-foreground">আপনি নিশ্চিত করলে অন্য অভিভাবককেও এসএমএস যাবে। চাইলে শ্রেণি শিক্ষককে বার্তা লিখতে বা সাক্ষাতের সময় নিতে পারবেন।</p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading align="center" eyebrow="আরও যা পাবেন" title="এক অ্যাপেই সব" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard color="primary" icon={<CreditCard />} title="বেতন পরিশোধ">বিকাশ, নগদ বা রকেটে বেতন ও পরীক্ষার ফি দিন, রসিদ সাথে সাথে।</FeatureCard>
          <FeatureCard color="coral" icon={<MessageSquare />} title="শিক্ষকের সাথে কথা">সন্তানের শিক্ষককে বার্তা পাঠান। অফিস সময়ের পরে পাঠালে পরদিন সকালে পৌঁছাবে।</FeatureCard>
          <FeatureCard color="sky" icon={<BellRing />} title="ছুটির আবেদন">আগে থেকে ছুটির আবেদন করুন, শ্রেণি শিক্ষক অনুমোদন দেবেন।</FeatureCard>
          <FeatureCard color="sun" icon={<Phone />} title="সাধারণ ফোনেও চলে">স্মার্টফোন না থাকলেও সব খবর এসএমএসে পাবেন। ফলাফল নিশ্চিত করতে শিক্ষক স্কুল থেকে আপনাকে ফোন করবেন।</FeatureCard>
          <FeatureCard color="leaf" icon={<Smartphone />} title="একাধিক সন্তান">এক অ্যাকাউন্টে সব সন্তানের খবর, এক ছোঁয়ায় বদলান।</FeatureCard>
          <FeatureCard color="grape" icon={<ShieldCheck />} title="আপনার নিয়ন্ত্রণে">কোন কোন ডিভাইসে আপনার অ্যাকাউন্ট খোলা আছে দেখুন, অচেনা হলে বন্ধ করুন।</FeatureCard>
        </div>
      </Section>

      <Section tone="cream">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <SectionHeading eyebrow="শুরু করবেন কীভাবে" title="অ্যাকাউন্ট খোলা হয় স্কুল অফিসে" lead="নিজে নিজে অ্যাকাউন্ট খোলা যায় না — যাতে সন্তান অভিভাবক সেজে অ্যাকাউন্ট খুলতে না পারে।" />
            <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
              <KeyRound className="size-5 shrink-0 text-primary" aria-hidden />
              <span>স্কুল আপনাকে একটি <b>অ্যাক্টিভেশন স্লিপ</b> দেবে। এটি সন্তানের হাতে দেবেন না।</span>
            </div>
          </div>
          <Faq
            items={[
              { q: "পিন ভুলে গেলে কী করব?", a: "স্কুল অফিসে নিজে গিয়ে নতুন পিন সেট করুন। পিন বদলালে সব অভিভাবককে জানানো হয়।" },
              { q: "ফোন নম্বর বদলাতে চাই।", a: "শুধু স্কুল অফিস নম্বর বদলাতে পারে, আপনার পরিচয় যাচাই করে। পুরনো নম্বরেও একটি এসএমএস যাবে।" },
              { q: "সন্তান যদি আমার ফোন ব্যবহার করে?", a: "অ্যাপে নিরাপত্তা পাতায় দেখুন কোথায় কোথায় আপনার অ্যাকাউন্ট খোলা। পিন কখনো সন্তানকে বলবেন না। অন্য অভিভাবকও প্রতিটি নিশ্চিতকরণের বার্তা পান।" },
              { q: "এসএমএসের জন্য কি টাকা লাগবে?", a: "না। এসএমএসের খরচ স্কুল বহন করে।" },
            ]}
          />
        </div>
        <div className="mt-12 text-center"><Button size="lg" render={<Link href="/login" />}>অ্যাপে প্রবেশ করুন</Button></div>
      </Section>
    </div>
  );
}
