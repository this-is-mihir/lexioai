import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/axios'

export const DEFAULT_PLATFORM_SETTINGS = {
  timestamp: null,
  branding: {
    platformName: 'Lexio AI',
    logoUrl: '',
    faviconUrl: '',
    watermarkUrl: '',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    accentColor: '#06B6D4',
  },
  general: {
    siteName: 'Lexioai',
    supportEmail: 'support@lexioai.com',
    maintenanceMode: false,
    maintenanceMessage: "We're upgrading our systems. We'll be back soon!",
    allowNewRegistrations: true,
    defaultPlan: 'free',
  },
  legal: {
    termsOfService: '',
    privacyPolicy: '',
    lastUpdated: null,
  },
}

const fetchPlatformSettings = async () => {
  const res = await authApi.get('/public/settings')
  return res?.data?.data || DEFAULT_PLATFORM_SETTINGS
}

export default function usePlatformSettings() {
  const query = useQuery({
    queryKey: ['public-platform-settings'],
    queryFn: fetchPlatformSettings,
    staleTime: 60_000,
    retry: 1,
  })

  const settings = useMemo(() => {
    const incoming = query.data || DEFAULT_PLATFORM_SETTINGS

    return {
      timestamp: incoming.timestamp || incoming.updatedAt || null,
      branding: {
        ...DEFAULT_PLATFORM_SETTINGS.branding,
        ...(incoming.branding || {}),
      },
      general: {
        ...DEFAULT_PLATFORM_SETTINGS.general,
        ...(incoming.general || {}),
      },
      legal: {
        ...DEFAULT_PLATFORM_SETTINGS.legal,
        ...(incoming.legal || {}),
      },
    }
  }, [query.data])

  return {
    ...query,
    settings,
  }
}
