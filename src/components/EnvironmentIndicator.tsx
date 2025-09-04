'use client'

import { useEffect, useState } from 'react'
import { getConfig, AppConfig } from '../services/config'

export default function EnvironmentIndicator() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  if (!config) return null

  return (
    <div className={`fixed top-2 right-2 px-2 py-1 text-xs rounded-lg shadow-md z-50 ${
      config.isDevelopment 
        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
        : 'bg-green-100 text-green-800 border border-green-200'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          config.isDevelopment ? 'bg-yellow-500' : 'bg-green-500'
        }`}></span>
        <span className="font-medium">
          {config.isDevelopment ? 'DEV' : 'PROD'} • {config.dataSource}
        </span>
      </div>
    </div>
  )
}