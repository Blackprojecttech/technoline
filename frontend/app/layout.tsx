import type { Metadata, Viewport } from 'next'
import { Inter, Nunito } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import NotificationDrawerClient from '@/components/layout/NotificationDrawerClient';
import PullToRefresh from '@/components/PullToRefresh';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PWALoadingScreen from '@/components/PWALoadingScreen';
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt';

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
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
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
        {/* Иконки */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="apple-touch-icon" href="/icon-192.png" sizes="192x192" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS Safari PWA метатеги */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TechnoLine" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* iOS Splash Screen */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Цветовая схема */}
        <meta name="theme-color" content="#2563eb" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e40af" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-navbutton-color" content="#2563eb" />
        
        {/* PWA метатеги для всех браузеров */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="TechnoLine" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Дополнительные метатеги для улучшения PWA */}
        <meta name="apple-mobile-web-app-orientation" content="portrait" />
        <meta name="screen-orientation" content="portrait" />
        <meta name="full-screen" content="yes" />
        <meta name="browsermode" content="application" />
        
        {/* Service Worker регистрация */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        
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
          <PWALoadingScreen />
          <PullToRefresh />
          {children}
          <NotificationDrawerClient />
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
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