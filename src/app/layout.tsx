import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The SingLit Room",
  description: "Step inside a digital library of Singapore literature.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
