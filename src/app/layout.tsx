import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Manager",
  description: "A simple website for managing poker games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-poppins">{children}</body>
    </html>
  );
}
