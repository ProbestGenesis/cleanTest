'use client'

import { ReactNode, Suspense } from 'react'

type Props = {
  children: ReactNode
}

function layout({ children }: Props) {
  return <Suspense>{children}</Suspense>
}

export default layout
