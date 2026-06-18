import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Signal Intelligence — Advanced Financial Analysis",
  description:
    "Ingest 10-K/10-Q filings and earnings transcripts, extract financial statements, and generate investment memos with AI.",
  keywords: [
    "financial analysis",
    "10-K",
    "10-Q",
    "earnings transcript",
    "investment memo",
    "AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full bg-surface-secondary text-text-primary antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
