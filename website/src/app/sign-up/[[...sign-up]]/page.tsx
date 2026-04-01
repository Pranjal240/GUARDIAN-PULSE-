import { SignUp } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import Image from 'next/image'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#1C2B1E] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 mb-2">
          <Image src="/logo/logo.png" width={60} height={60} alt="Guardian Pulse" className="rounded-2xl" />
          <div className="text-center">
            <h1 className="font-poppins font-bold text-[#D4B896] text-2xl">Guardian Pulse</h1>
            <p className="text-[#A8B5A2] text-sm mt-1">Create your admin account</p>
          </div>
        </div>

        <SignUp 
          appearance={{
            elements: {
              card: 'bg-transparent shadow-none border-none p-0 w-full',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            },
          }}
        />
      </div>
    </div>
  )
}
