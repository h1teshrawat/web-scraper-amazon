import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocioMonkey — Amazon Product Intelligence",
  description: "A refined interface for Amazon product intelligence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
