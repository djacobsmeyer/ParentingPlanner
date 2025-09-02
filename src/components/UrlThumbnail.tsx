'use client'

import { useState, useEffect } from 'react'

interface UrlThumbnailProps {
  url: string
  className?: string
}

interface UrlMetadata {
  title?: string
  description?: string
  image?: string
  domain?: string
}

export default function UrlThumbnail({ url, className = '' }: UrlThumbnailProps) {
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url || !url.startsWith('http')) {
      setMetadata(null)
      return
    }

    setLoading(true)
    setError(false)

    // Extract domain for fallback
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      setMetadata({ domain })
    } catch (e) {
      setError(true)
      setLoading(false)
      return
    }

    // Fetch metadata using a CORS proxy service
    fetchUrlMetadata(url)
      .then(data => {
        setMetadata(prev => ({ ...prev, ...data }))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [url])

  async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
    try {
      // Use a CORS proxy service to fetch the page
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      const data = await response.json()
      
      if (!data.contents) throw new Error('No content')
      
      const html = data.contents
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      // Extract Open Graph and meta tags
      const title = 
        doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
        doc.querySelector('title')?.textContent ||
        ''
      
      const description = 
        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
        ''
      
      const image = 
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
        ''
      
      return { title, description, image }
    } catch (error) {
      throw new Error('Failed to fetch metadata')
    }
  }

  if (!url || !url.startsWith('http')) {
    return null
  }

  if (loading) {
    return (
      <div className={`flex items-center p-3 bg-gray-50 rounded-lg border ${className}`}>
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !metadata) {
    return (
      <div className={`flex items-center p-3 bg-gray-50 rounded-lg border ${className}`}>
        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {metadata?.domain || 'Link'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {url}
          </p>
        </div>
      </div>
    )
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors ${className}`}
    >
      <div className="flex items-center space-x-3">
        {metadata.image ? (
          <img 
            src={metadata.image} 
            alt={metadata.title || 'Thumbnail'}
            className="w-12 h-12 object-cover rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {metadata.title || metadata.domain || 'Link'}
          </p>
          {metadata.description && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {metadata.description}
            </p>
          )}
          <p className="text-xs text-blue-600 truncate mt-1">
            {metadata.domain}
          </p>
        </div>
      </div>
    </a>
  )
}