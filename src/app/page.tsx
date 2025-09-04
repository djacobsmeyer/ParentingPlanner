'use client'

import { useState, useEffect } from 'react'
import BabyShoppingChecklist from '@/components/BabyShoppingChecklist'
import EnvironmentIndicator from '@/components/EnvironmentIndicator'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <EnvironmentIndicator />
      <BabyShoppingChecklist />
    </div>
  )
}