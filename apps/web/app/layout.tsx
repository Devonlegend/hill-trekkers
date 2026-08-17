import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hilltrekkersclub.com"),
  title: {
    default: "The Hill Trekkers Club",
    template: "%s · The Hill Trekkers Club",
  },
  description:
    "Walk up mountains, lift each other up. Hikes, camping, and community adventures across Nigeria.",
  openGraph: {
    title: "The Hill Trekkers Club",
    description:
      "Walk up mountains, lift each other up. Hikes, camping, and community adventures across Nigeria.",
    type: "website",
    locale: "en_NG",
    siteName: "The Hill Trekkers Club",
    images: [
      {
        url: "https://picsum.photos/seed/hill-trekkers-summit/1200/630",
        width: 1200,
        height: 630,
        alt: "Trekkers standing on a Nigerian summit at sunrise",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hill Trekkers Club",
    description:
      "Walk up mountains, lift each other up. Hikes, camping, and community adventures across Nigeria.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <AuthProvider>
          <Navbar />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}