import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PVC Visual Configurator AR",
  description:
    "Мобильное веб-приложение для визуализации ПВХ окон и дверей в реальном интерьере.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full bg-[#eff5fc] text-[#102a47] antialiased">{children}</body>
    </html>
  );
}
