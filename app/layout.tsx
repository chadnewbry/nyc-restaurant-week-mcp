import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { RESTAURANTS } from "@/lib/data";
import { Nav } from "./nav";

const COUNT = RESTAURANTS.length;

const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt" });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nycrestaurantweek.app"),
  title: "ask rick — NYC Restaurant Week, guided by a resident rat",
  description:
    `A minimal 8-bit guide to NYC Restaurant Week Summer 2026. Ask Rick, the resident rat, to search ${COUNT} participating restaurants by cuisine, price, neighborhood, and date — menus and OpenTable links included. Free MCP server for developers.`,
  openGraph: {
    title: "ask rick — NYC Restaurant Week",
    description:
      `Rick the resident rat knows every kitchen in the city. Chat-search all ${COUNT} NYC Restaurant Week restaurants, or watch him ride the subway to your pick on the live map.`,
    url: "/",
    siteName: "ask rick",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ask rick — NYC Restaurant Week",
    description:
      `Rick the resident rat knows every kitchen in the city. Chat-search all ${COUNT} NYC Restaurant Week restaurants.`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
