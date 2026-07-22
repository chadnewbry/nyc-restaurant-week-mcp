import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt" });

export const metadata: Metadata = {
  title: "NYC Restaurant Week Quest — chat your way to 612 prix-fixe restaurants",
  description:
    "An 8-bit guide to NYC Restaurant Week Summer 2026. Chat with CHEF-BOT to search 612 participating restaurants by cuisine, price, neighborhood, and date — menus and OpenTable links included. Free MCP server for developers.",
  openGraph: {
    title: "NYC Restaurant Week Quest",
    description:
      "Press start to feast: chat-search all 612 NYC Restaurant Week restaurants. 8-bit style. Free MCP server included.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable}`}>
      <body>{children}</body>
    </html>
  );
}
