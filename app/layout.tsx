import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegistry } from "@/components/pwa/pwa-registry";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Trevo One",
  description: "Saúde, performance e acompanhamento em um só lugar.",
  applicationName: "Trevo One",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trevo One",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#111814" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("trevo_theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}else if(t==="light"){document.documentElement.setAttribute("data-theme","light");}else{document.documentElement.removeAttribute("data-theme");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]">
        {children}
        <PwaRegistry />
      </body>
    </html>
  );
}

