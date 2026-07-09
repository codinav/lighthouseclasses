import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/lib/providers";
import { AppUpdateCheck } from "@/components/app/update-check";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz"],
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lighthouseclasses.com"),
  title: {
    default: "Lighthouse Classes — Guiding Every Learner Towards Excellence",
    template: "%s · Lighthouse Classes",
  },
  description:
    "Learn Urdu, English, and Persian from India's finest teachers — script, conversation, poetry, and calligraphy. Live classes, structured courses, and mentorship that actually works.",
  keywords: ["learn Urdu", "Urdu script", "Nastaliq", "spoken English", "IELTS", "learn Persian", "Farsi", "ghazal", "Urdu poetry", "online courses"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Lighthouse Classes",
    description: "Guiding Every Learner Towards Excellence.",
    type: "website",
    locale: "en_IN",
    siteName: "Lighthouse Classes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lighthouse Classes",
    description: "Guiding Every Learner Towards Excellence.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#161210" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid flash — light by default */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('lh_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${display.variable} ${sans.variable}`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy-900 focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <AppUpdateCheck />
      </body>
    </html>
  );
}
