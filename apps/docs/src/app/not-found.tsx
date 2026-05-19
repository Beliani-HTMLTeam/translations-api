'use client'

import { JSX } from 'react'
import Link from 'next/link'

import '../styles/not-found.css'
import ArrowLeftOutlineIcon from '@iconify-react/basil/arrow-left-outline'

const NotFound = (): JSX.Element => {
  return (
    <div className="not-found">
      <h1>Page Not Found</h1>
      <p>The page you are looking for is gone!</p>
      <Link href="/">
        <ArrowLeftOutlineIcon />
        go back
      </Link>
    </div>
  )
}

export default NotFound
