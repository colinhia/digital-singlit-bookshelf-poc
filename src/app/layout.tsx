import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_SC, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  weight: "700",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-spine-latin",
});

const notoSansSC = Noto_Sans_SC({
  weight: "700",
  display: "swap",
  preload: false,
  variable: "--font-spine-chinese",
});

const notoSansTamil = Noto_Sans_Tamil({
  weight: "700",
  subsets: ["tamil"],
  display: "swap",
  preload: false,
  variable: "--font-spine-tamil",
});

export const metadata: Metadata = {
  title: "The SingLit Room",
  description: "Step inside a digital library of Singapore literature.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVariables = `${notoSans.variable} ${notoSansSC.variable} ${notoSansTamil.variable}`;
  return <html lang="en" className={fontVariables}><body>{children}</body></html>;
}
