import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "设计走查 · Design QA",
  description:
    "设计稿与开发截图对照：一致度、优先级与逐条可执行差异，供开发直接改 UI。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
