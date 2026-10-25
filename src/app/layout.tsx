import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hanzi · Tiếng Trung đời thường cho người Việt",
  description:
    "Học 48 cách nói tiếng Trung tự nhiên qua hội thoại thực tế, pinyin, âm thanh, flashcard và luyện tập. Giải thích bằng tiếng Việt, học mỗi ngày một chút.",
  applicationName: "Hanzi",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f7f3",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(JSON.parse(localStorage.getItem('hanzi-vietnamese-v1')||'{}').settings?.theme==='dark')document.documentElement.dataset.theme='dark'}catch{}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
