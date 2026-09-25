import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalDesk — Prediction Market Intelligence",
  description: "AI research and market intelligence powered by Panta.",
};

export default function RootLayout({
  children,
}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
