import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zeon Analytics",
  description: "Build By Zeon",
  icons: {
    icon: '/logo_red.jpeg?v=2',
    shortcut: '/logo_red.jpeg?v=2',
    apple: '/logo_red.jpeg?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo_red.jpeg?v=2" type="image/jpeg" />
        <link rel="shortcut icon" href="/logo_red.jpeg?v=2" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo_red.jpeg?v=2" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
