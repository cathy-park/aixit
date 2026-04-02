import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AixitStorageMigrationBootstrap } from "@/components/storage/AixitStorageMigrationBootstrap";
import { AixitSupabaseSyncProvider } from "@/components/storage/AixitSupabaseSyncProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AIXIT",
  description: "AIXIT — workflow navigation.",
  icons: {
    icon: [{ url: "/favicon-v2.png?v=5", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon-v2.png?v=5", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E1E21",
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
        <meta name="theme-color" content="#1E1E21" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon-v2.png?v=5" type="image/png" sizes="64x64" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-v2.png?v=5" sizes="180x180" />
      </head>
      <body className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50 text-zinc-950">
        <AuthProvider>
          <AixitSupabaseSyncProvider />
          <AixitStorageMigrationBootstrap />
          {children}
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
