import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Guardian Pulse — Admin Dashboard',
  description: 'Real-time medical monitoring dashboard for healthcare professionals',
  icons: { icon: '/logo/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#D4B896',
          colorTextOnPrimaryBackground: '#141A14',
          colorBackground: '#1C2B1E',
          colorInputBackground: '#111811',
          colorInputText: '#F0E6D3',
          colorText: '#F0E6D3',
          colorTextSecondary: '#A8B5A2',
          colorNeutral: '#4A6741',
          colorDanger: '#E05252',
          colorSuccess: '#5CB85C',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
        },
        elements: {
          card: 'bg-[#1C2B1E] border border-[rgba(212,184,150,0.12)] shadow-xl',
          socialButtonsBlockButton: '!bg-[#243028] hover:!bg-[#2E3D30] !border-[rgba(212,184,150,0.2)]',
          socialButtonsBlockButtonText: '!text-[#D4B896] font-semibold',
          formFieldLabel: '!text-[#D4B896]',
          formFieldLabelRow: '!text-[#D4B896]',
          footerActionText: '!text-[#D4B896]',
          footerActionLink: '!text-[#D4B896] hover:text-[#C4A882]',
          formFieldInput: '!bg-[#111811] !text-[#F0E6D3] !border-[rgba(212,184,150,0.2)]',
          dividerText: '!text-[#9BA897]',
          dividerLine: '!bg-[rgba(212,184,150,0.15)]',
          formButtonPrimary: '!bg-gradient-to-r !from-[#D4B896] !to-[#C4A882] !text-[#141A14] font-semibold',
          alertText: '!text-[#F2E8D9]',
          formFieldErrorText: '!text-[#E05252]',
          formFieldSuccessText: '!text-[#5CB85C]',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/logo/logo.png" />
        </head>
        <body className="bg-[#1C2B1E] text-[#F2E8D9] font-inter antialiased" suppressHydrationWarning>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#2A3D2E',
                color: '#F2E8D9',
                border: '1px solid rgba(212,184,150,0.2)',
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
