// Environment configuration for data sources
export interface AppConfig {
  xanoBaseUrl: string
  dataSource: 'live' | 'test'
  isDevelopment: boolean
  isProduction: boolean
}

function getEnvironment(): 'development' | 'production' {
  // In Next.js static export, we need to detect environment at runtime
  if (typeof window !== 'undefined') {
    // Client-side detection
    const hostname = window.location.hostname
    
    // Production: GitHub Pages or custom domain
    if (hostname.includes('github.io') || hostname === 'your-custom-domain.com') {
      return 'production'
    }
    
    // Development: localhost or local network
    return 'development'
  }
  
  // Server-side fallback (during build)
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export function getConfig(): AppConfig {
  const env = getEnvironment()
  const isDevelopment = env === 'development'
  const isProduction = env === 'production'
  
  return {
    xanoBaseUrl: 'https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF',
    dataSource: isDevelopment ? 'test' : 'live',
    isDevelopment,
    isProduction
  }
}