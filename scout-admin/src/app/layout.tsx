import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "../components/TopNav";
import { DebugProbe } from "../components/DebugProbe";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Otomate Management",
  description: "Internal dashboards for Otomate operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* #region agent log */}
        <DebugProbe runId="nav-debug-run1" />
        {/* #endregion */}
        <TopNav />
        {children}
      </body>
    </html>
  );
}
