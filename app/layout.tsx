import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "MPLS Sentinel | Predictive Network Operations",
  description:
    "Offline predictive monitoring, incident intelligence, and approval-gated remediation for secure MPLS networks.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
