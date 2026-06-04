import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPA Studio",
  description: "Control center for AI-orchestrated automation workflows"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="studio-header">
          <div className="studio-header-inner">
            <Link href="/" className="studio-brand">
              RPA Studio
            </Link>
            <div className="studio-nav-wrap">
              <span className="studio-nav-label">Menu</span>
              <nav className="studio-nav" aria-label="Primary">
                <Link href="/" className="studio-nav-link">
                  Home
                </Link>
                <Link href="/downloads" className="studio-nav-link studio-nav-link-accent">
                  Downloads
                </Link>
              </nav>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
