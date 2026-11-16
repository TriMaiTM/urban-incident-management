import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ thống Tiếp nhận & Điều phối Sự cố Đô thị Đà Nẵng",
  description:
    "Nền tảng tiếp nhận, phân loại AI DeepSeek và điều phối xử lý sự cố hạ tầng đô thị TP Đà Nẵng",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
