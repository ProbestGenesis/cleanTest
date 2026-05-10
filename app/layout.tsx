import StackProvider from "@/components/provider/stackProvider"
import { Geist_Mono, Noto_Sans } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import MainLayout from "@/components/utils/MainLayout"
import { SSEProvider } from "@/components/provider/SSEProvider"
import { cn } from "@/lib/utils"
import "./globals.css"

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        notoSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <StackProvider>
            <SSEProvider />
            <MainLayout>{children}</MainLayout>
          </StackProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
