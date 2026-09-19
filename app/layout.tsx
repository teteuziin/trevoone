import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PwaRegistry } from "@/components/pwa/pwa-registry";
import { BrandWallpaper } from "@/components/brand/brand-wallpaper";
import { NetworkStatusToast } from "@/components/pwa/network-status-toast";
import { BetaWatermark } from "@/components/brand/beta-watermark";
import { SafeBoundary } from "@/components/ui/safe-boundary";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  display: "swap",
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
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("trevo_theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}else if(t==="light"){document.documentElement.setAttribute("data-theme","light");}else{document.documentElement.removeAttribute("data-theme");}}catch(e){}})();`;

const assetRecoveryBootstrapScript = `(function(){try{var K="trevo_asset_recovery_ts";function getStoredTs(){try{return window.sessionStorage?window.sessionStorage.getItem(K):(window.__trevo_rec_ts||null);}catch(e){return window.__trevo_rec_ts||null;}}function setStoredTs(v){try{if(window.sessionStorage)window.sessionStorage.setItem(K,v);}catch(e){}window.__trevo_rec_ts=v;}function isAssetErr(e,t){if(e&&(e.name==="ChunkLoadError"||(e.message&&(e.message.indexOf("Loading chunk")!==-1||e.message.indexOf("Failed to fetch dynamically imported module")!==-1))))return true;if(t&&t.tagName&&(t.tagName==="SCRIPT"||t.tagName==="LINK")){var s=t.src||t.href||"";if(s.indexOf("/_next/static/")!==-1)return true;}return false;}function onErr(ev){var err=ev.error||(ev.reason?ev.reason:null);var tgt=ev.target;if(!isAssetErr(err,tgt))return;var last=getStoredTs();var now=Date.now();if(last&&(now-Number(last))<15000)return;setStoredTs(String(now));if(navigator.serviceWorker&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:"SKIP_WAITING"});}var u=new URL(window.location.href);u.searchParams.set("_r",String(now));window.location.replace(u.toString());}window.addEventListener("error",onErr,true);window.addEventListener("unhandledrejection",onErr);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: assetRecoveryBootstrapScript }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)] relative">
        <BrandWallpaper />
        <SafeBoundary name="NetworkStatusToast">
          <NetworkStatusToast />
        </SafeBoundary>
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
        <BetaWatermark />
        <SafeBoundary name="PwaRegistry">
          <PwaRegistry />
        </SafeBoundary>
      </body>
    </html>
  );
}
