import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://signaldesk-henna.vercel.app"),
  title: "SignalDesk — Market signals. Real evidence. Better decisions.",
  description:
    "Decision-support for Panta markets: live market signals, fresh evidence, counterevidence, and clear research before action.",
  openGraph: {
    title: "SignalDesk — Market signals. Real evidence. Better decisions.",
    description:
      "Decision-support for Panta markets with live market signals, fresh evidence, counterevidence, and clear research before action.",
    url: "https://signaldesk-henna.vercel.app",
    siteName: "SignalDesk",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SignalDesk — Market signals. Real evidence. Better decisions.",
    description:
      "Decision-support for Panta markets with live signals and fresh evidence.",
  },
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
