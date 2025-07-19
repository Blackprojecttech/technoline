import type { Metadata, Viewport } from 'next'
import { Inter, Nunito } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })
const nunito = Nunito({ 
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TechnoLine Store - Интернет-магазин мобильной электроники',
  description: 'Интернет-магазин мобильной электроники TechnoLine - широкий ассортимент телефонов, планшетов, аксессуаров по выгодным ценам',
  keywords: 'мобильная электроника, телефоны, планшеты, аксессуары, TechnoLine, интернет-магазин',
  authors: [{ name: 'TechnoLine Store' }],
  verification: {
    google: 'YEGlkz27iZo3rGzbVTvAo2GU6Yr0i4-cc5KD8u9D2h8',
    yandex: 'bc58ca38f950ca9f',
    other: {
      'yandex-verification': 'f486024372609946',
      'google-site-verification': 'YcWIBonnHbPK76LgQC0NxMcaY4f7OW0bRTkgmSVAST0',
    }
  },
  openGraph: {
    title: 'TechnoLine Store - Интернет-магазин мобильной электроники',
    description: 'Интернет-магазин мобильной электроники TechnoLine',
    url: 'https://techno-line.store',
    siteName: 'Интернет-магазин мобильной электроники TechnoLine',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'TechnoLine Store',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/* Яндекс.Метрика */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              ym(48448394, "init", {
                   clickmap:true,
                   trackLinks:true,
                   accurateTrackBounce:true,
                   webvisor:true
              });
            `,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/48448394" style={{position: 'absolute', left: '-9999px'}} alt="" />
          </div>
        </noscript>
        
        {/* Предзагрузка ресурсов Yandex Metrica */}
        <link rel="preload" href="https://mc.yandex.ru/metrika/tag.js" as="script" />
        <link rel="preload" href="https://mc.yandex.ru/watch/48448394" as="image" />
        
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-2W2PRSS56K"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-2W2PRSS56K');
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${nunito.variable}`}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
} 