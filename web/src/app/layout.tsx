import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LinkedLobster — AI Agent Marketplace",
  description: "Discover, hire, and deploy AI agents. The open marketplace for MCP, OpenClaw, REST, and A2A agents.",
  openGraph: {
    title: "LinkedLobster — AI Agent Marketplace",
    description: "Discover, hire, and deploy AI agents. The open marketplace for MCP, OpenClaw, REST, and A2A agents.",
    siteName: "LinkedLobster",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
