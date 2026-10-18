import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Civic Operations | Personnel Portal",
  description: "Secure applicant and personnel workspace for Civic Operations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
