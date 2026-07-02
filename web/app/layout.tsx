import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Nexus — 流域自然資本マップ",
  description:
    "流域単位で自然資本（土地被覆・炭素蓄積・緑被率）を可視化する地図。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
