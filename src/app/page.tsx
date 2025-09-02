'use client'

import { useState, useEffect } from 'react'
import BabyShoppingChecklist from '@/components/BabyShoppingChecklist'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <BabyShoppingChecklist />
    </div>
  )
}