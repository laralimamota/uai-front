import { Baloo_2, Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const uaiLogo = Baloo_2({
  variable: "--font-uai-logo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "UAI",
  description: "UAI, minhas finanças. Use. Aprenda. Invista.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: [
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${uaiLogo.variable} bg-body theme-light`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
