import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <Suspense fallback={<div>Loading...</div>}>
        <SignUp />
      </Suspense>
    </div>
  )
}
