import type { Metadata } from "next";
import { Fraunces, DM_Sans, Lora } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { ThemeSyncer } from "@/components/ThemeSyncer";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Horizon",
  description: "Spatial task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="bioluminescent">
      <body
        className={`${fraunces.variable} ${dmSans.variable} ${lora.variable} ${GeistMono.variable} bg-bg-primary text-text-primary min-h-screen antialiased`}
        style={{ fontFamily: "var(--font-body), sans-serif" }}
      >
        <ThemeSyncer />
        {children}
      </body>
    </html>
  );
}
