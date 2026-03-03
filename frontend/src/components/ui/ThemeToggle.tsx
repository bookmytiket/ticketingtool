import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useSound } from '../../utils/soundEffects'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()
  const { playClick } = useSound()

  const handleToggle = () => {
    playClick()
    toggleTheme()
  }

  return (
    <button
      onClick={handleToggle}
      className="relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
      style={{
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 128, 255, 0.2))'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
        border: `2px solid ${theme === 'dark' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
      }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div
        className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg"
        style={{
          transform: theme === 'dark' ? 'translateX(0)' : 'translateX(24px)',
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #00ffff, #0080ff)'
            : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          boxShadow: theme === 'dark'
            ? '0 0 15px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.3)'
            : '0 0 15px rgba(251, 191, 36, 0.5), inset 0 0 10px rgba(245, 158, 11, 0.3)',
        }}
      >
        {theme === 'dark' ? (
          <Moon size={14} className="text-cyber-dark" />
        ) : (
          <Sun size={14} className="text-white" />
        )}
      </div>
    </button>
  )
}

