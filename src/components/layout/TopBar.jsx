import { Menu, Bell, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const TopBar = ({ onMenuClick }) => {
  const { user } = useAuth()

  return (
    <header 
      className="h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 border-b"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none transition-colors duration-200 p-2 rounded-lg hover:bg-white/40 backdrop-blur-sm"
        >
          <Menu size={24} />
        </button>
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={20} />
          <input
            type="text"
            placeholder="Search tickets..."
            className="pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-gray-900 placeholder-gray-400 w-64 text-sm transition-all duration-300"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button 
          className="relative text-gray-600 hover:text-gray-900 focus:outline-none transition-colors duration-200 p-2 rounded-lg hover:bg-white/40 backdrop-blur-sm"
        >
          <Bell size={24} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{user?.email || ''}</p>
          </div>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.9) 0%, rgba(2, 132, 199, 0.95) 100%)',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
