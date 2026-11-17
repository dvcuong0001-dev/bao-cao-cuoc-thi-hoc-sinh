import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "Báo cáo cuộc thi học sinh",
  description: "Theo dõi và thu minh chứng tham gia cuộc thi của học sinh",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-800 antialiased`}>{children}</body>
    </html>
  );
}
