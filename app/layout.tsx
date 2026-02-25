import type { Metadata } from "next";
import { Inter, Alexandria } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "FIRMA B2B",
  description: "B2B order management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${alexandria.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
