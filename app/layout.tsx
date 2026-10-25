import type { Metadata } from "next";
import { League_Spartan, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const leagueSpartan = League_Spartan({
  variable: "--font-league-spartan",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Masuk Google - Robotika Universitas Sebelas Maret",
  description: "Sistem Autentikasi dan Portal Masuk Resmi Google SSO untuk Pengurus, Riset, dan Anggota Robotika UNS.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F9F8" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${leagueSpartan.variable} ${jetbrainsMono.variable} h-full antialiased bg-[#F9F9F8] dark:bg-[#09090b]`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F9F9F8] dark:bg-[#09090b] text-[#18181b] dark:text-zinc-100 transition-colors duration-150 overscroll-none">
        {children}
      </body>
    </html>
  );
}
