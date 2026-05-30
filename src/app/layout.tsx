import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { APP_NAME } from "../lib/constants";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Private AI-assisted Math practice for NUET preparation with instructor review and gated student results.",
  applicationName: APP_NAME,
  keywords: [
    "NUET",
    "math practice",
    "entrance exam",
    "AI tutoring",
    "Next.js",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="relative flex min-h-full flex-col">{children}</div>
      </body>
    </html>
  );
}
