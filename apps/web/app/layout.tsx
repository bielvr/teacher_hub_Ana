import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "Fikra",
    template: "%s | Fikra",
  },
  description: "Plataforma de ensino e gestão Fikra",
  icons: {
    icon: "/Logo.svg",
    shortcut: "/Logo.svg",
    apple: "/Logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} font-sans h-full antialiased`}>
      <head>
        <link rel="icon" href="/Logo.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${poppins.className} min-h-full flex flex-col font-sans`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
