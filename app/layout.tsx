import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Civic Operations | Personnel CAD",
  description: "Roleplay community personnel and shift management portal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
