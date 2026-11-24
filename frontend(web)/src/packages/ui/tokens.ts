/**
 * EthioAlert Design System Tokens
 * Derived from the Crisis Operations Console aesthetic
 */

export const THEME_COLORS = {
  canvas: '#0c1417',
  sidebar: '#09181b',
  surface: '#111d21',
  surfaceHighlight: '#16282d',
  border: '#1b2e34',
  borderLight: '#243e46',
  
  teal: {
    accent: '#2dd4bf', // teal-400
    container: '#133e42',
    hover: '#1a4e54',
    text: '#5eead4',
  },

  severity: {
    critical: {
      bg: '#3b1418',
      text: '#fca5a5',
      border: '#7f1d1d',
      icon: '#ef4444',
      badgeBg: 'bg-red-950/80',
      badgeText: 'text-red-300',
      badgeBorder: 'border-red-800',
    },
    high: {
      bg: '#3d2614',
      text: '#fdba74',
      border: '#9a3412',
      icon: '#f97316',
      badgeBg: 'bg-orange-950/80',
      badgeText: 'text-orange-300',
      badgeBorder: 'border-orange-800',
    },
    medium: {
      bg: '#3b3014',
      text: '#fde047',
      border: '#854d0e',
      icon: '#f59e0b',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-300',
      badgeBorder: 'border-amber-800',
    },
    low: {
      bg: '#133832',
      text: '#86efac',
      border: '#14532d',
      icon: '#10b981',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-800',
    },
  },

  metricBadges: {
    alerts: {
      container: 'bg-[#3b1418] text-[#ef4444]',
      border: 'border-red-900/50',
    },
    reports: {
      container: 'bg-[#3b3014] text-[#f59e0b]',
      border: 'border-amber-900/50',
    },
    sos: {
      container: 'bg-[#3d2614] text-[#f97316]',
      border: 'border-orange-900/50',
    },
    users: {
      container: 'bg-[#133832] text-[#10b981]',
      border: 'border-emerald-900/50',
    },
  },
} as const
