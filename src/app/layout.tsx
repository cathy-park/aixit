import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AixitStorageMigrationBootstrap } from "@/components/storage/AixitStorageMigrationBootstrap";
import { AixitSupabaseSyncProvider } from "@/components/storage/AixitSupabaseSyncProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Workflow Navigator",
  description: "Navigate AI workflows, steps, and run status.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50 text-zinc-950">
        <AixitSupabaseSyncProvider />
        <AixitStorageMigrationBootstrap />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
