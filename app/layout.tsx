import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sourceSerif = localFont({
  src: [
    {
      path: "./fonts/SourceSerif4.ttf",
      style: "normal",
      weight: "200 900",
    },
    {
      path: "./fonts/SourceSerif4-Italic.ttf",
      style: "italic",
      weight: "200 900",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const switzerSemibold = localFont({
  src: "./fonts/Switzer-Semibold.woff2",
  weight: "600",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "musicversum",
  description: "A vinyl-first music player.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${switzerSemibold.variable} h-full antialiased`}
    >
      <body className="h-full bg-white text-black font-sans">
        {children}
      </body>
    </html>
  );
}
