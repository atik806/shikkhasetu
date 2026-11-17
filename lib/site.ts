/**
 * Public-site configuration. Replace contact details before going live.
 */
export const SITE = {
  name: "ShikkhaSetu",
  nameBn: "শিক্ষাসেতু",
  tagline: "The school app that parents can trust",
  description:
    "School management for Bangladeshi schools: results that reach parents directly with a verified acknowledgment, live gate and class attendance alerts, fees, homework and notices — in Bangla and English.",
  email: "hello@shikkhasetu.com", // TODO: replace with the real inbox
  city: "Dhaka, Bangladesh",
  hours: "Saturday–Thursday, 9:00 AM – 6:00 PM",
};

export const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/parents", label: "For parents" },
  { href: "/security", label: "Trust & security" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export const FOOTER_LINKS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/features#results", label: "Result acknowledgment" },
      { href: "/features#attendance", label: "Gate & attendance" },
      { href: "/login", label: "Live demo" },
    ],
  },
  {
    title: "For",
    links: [
      { href: "/parents", label: "Parents (অভিভাবক)" },
      { href: "/features#teachers", label: "Teachers" },
      { href: "/features#admin", label: "Head teachers & office" },
      { href: "/features#gate", label: "Gate staff" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact & demo" },
      { href: "/faq", label: "FAQ" },
      { href: "/security", label: "Trust & security" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/verify/SS-DEMO", label: "Verify a result card" },
    ],
  },
];
