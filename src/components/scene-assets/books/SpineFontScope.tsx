import { Noto_Sans, Noto_Sans_SC, Noto_Sans_Tamil } from "next/font/google";

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

const FONT_VARIABLES = `${notoSans.variable} ${notoSansSC.variable} ${notoSansTamil.variable}`;

export default function SpineFontScope({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div
    className={FONT_VARIABLES}
    data-spine-font-scope
    style={{ display: "contents" }}
  >
    {children}
  </div>;
}
