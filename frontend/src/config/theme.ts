/**
 * Theme Configuration
 * 
 * Customize transparent colors and glass effects here.
 * All color values support rgba, hex, or CSS color names.
 */

export const themeConfig = {
  // Sidebar transparent colors
  sidebar: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%)',
    backdropBlur: 'blur(20px) saturate(180%)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    activeItemBg: 'rgba(14, 165, 233, 0.15)', // primary-500/15
    activeItemBorder: 'rgba(14, 165, 233, 0.3)', // primary-500/30
    hoverItemBg: 'rgba(255, 255, 255, 0.4)',
  },

  // TopBar transparent colors
  topbar: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
    backdropBlur: 'blur(20px) saturate(180%)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },

  // Button transparent colors
  buttons: {
    primary: {
      transparent: {
        background: 'rgba(14, 165, 233, 0.2)', // primary-500/20
        border: 'rgba(14, 165, 233, 0.4)', // primary-500/40
        text: '#0369a1', // primary-700
        hoverBg: 'rgba(14, 165, 233, 0.3)', // primary-500/30
        hoverBorder: 'rgba(14, 165, 233, 0.6)', // primary-500/60
      },
    },
    secondary: {
      transparent: {
        background: 'rgba(107, 114, 128, 0.2)', // gray-500/20
        border: 'rgba(107, 114, 128, 0.4)', // gray-500/40
        text: '#374151', // gray-700
        hoverBg: 'rgba(107, 114, 128, 0.3)', // gray-500/30
        hoverBorder: 'rgba(107, 114, 128, 0.6)', // gray-500/60
      },
    },
    danger: {
      transparent: {
        background: 'rgba(239, 68, 68, 0.2)', // red-500/20
        border: 'rgba(239, 68, 68, 0.4)', // red-500/40
        text: '#dc2626', // red-700
        hoverBg: 'rgba(239, 68, 68, 0.3)', // red-500/30
        hoverBorder: 'rgba(239, 68, 68, 0.6)', // red-500/60
      },
    },
  },

  // Custom color presets (optional - use customColor prop)
  customColors: {
    purple: '#a855f7',
    green: '#10b981',
    orange: '#f97316',
    pink: '#ec4899',
    indigo: '#6366f1',
  },
}

/**
 * Usage Examples:
 * 
 * 1. Use transparent button:
 *    <Button variant="primary" transparent>Click me</Button>
 * 
 * 2. Use custom color:
 *    <Button variant="primary" transparent customColor="#a855f7">Purple Button</Button>
 * 
 * 3. Access theme config:
 *    import { themeConfig } from '../config/theme'
 *    const sidebarBg = themeConfig.sidebar.background
 */

export default themeConfig

