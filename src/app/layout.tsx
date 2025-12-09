import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import Providers from "@/components/Providers";
import CommandPalette from "@/components/ui/CommandPalette";

export const metadata: Metadata = {
  title: "Slotavo",
  description: "Smart scheduling for everyone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var localTheme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (localTheme === 'dark' || (!localTheme && supportDarkMode)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <Providers>
          <CommandPalette />
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}

