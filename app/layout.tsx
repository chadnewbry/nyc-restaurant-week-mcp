import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "NYC Restaurant Week MCP — 612 prix-fixe restaurants, on tap for your AI",
  description:
    "A free, open MCP server for NYC Restaurant Week Summer 2026. Let Claude, Cursor, or any MCP client search 612 participating restaurants by cuisine, price, neighborhood, and date — with menus and OpenTable links.",
  openGraph: {
    title: "NYC Restaurant Week MCP",
    description:
      "612 prix-fixe restaurants, searchable by your AI. Cuisine, price, neighborhood, dates, menus, reservations.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
