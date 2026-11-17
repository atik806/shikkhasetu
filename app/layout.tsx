import type { Metadata, Viewport } from "next";
import { Inter, Hind_Siliguri, Baloo_Da_2, Caveat } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bangla = Hind_Siliguri({ variable: "--font-bangla", subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"] });
// Rounded, friendly display face that covers both Bangla and English headings.
const baloo = Baloo_Da_2({ variable: "--font-baloo", subsets: ["bengali", "latin"], weight: ["500", "600", "700", "800"] });
// Handwriting accent for doodles and sticky notes.
const caveat = Caveat({ variable: "--font-handwriting", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://shikkhasetu.com"),
  title: { default: "ShikkhaSetu — School management", template: "%s · ShikkhaSetu" },
  description: "Results that reach parents directly, verified acknowledgments, and real-time attendance for Bangladeshi schools.",
  applicationName: "ShikkhaSetu",
  openGraph: {
    type: "website",
    siteName: "ShikkhaSetu",
    locale: "en_BD",
    title: "ShikkhaSetu — The school app parents can trust",
    description: "Results that reach parents directly with a verified acknowledgment, and attendance alerts the same morning. Bangla & English.",
    images: [{ url: "/images/school/girls-with-books.jpg", alt: "Students holding their books at school in Bangladesh" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${bangla.variable} ${baloo.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
