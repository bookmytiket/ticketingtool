import { useState, useEffect } from 'react'

export const Laptop3D = ({ children, isOpen, onOpen }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="relative w-full flex items-center justify-center min-h-[600px] py-12">
      {/* Container with 3D perspective */}
      <div 
        className="relative"
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        }}
      >
        {/* Laptop Container */}
        <div 
          className="relative"
          style={{
            width: '600px',
            height: isOpen ? '450px' : '50px',
            transition: 'height 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Screen (Top Part) - Opens upward */}
          <div
            className="absolute inset-0"
            style={{
              transform: isOpen ? 'rotateX(0deg)' : 'rotateX(-85deg)',
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Screen Outer Frame */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-t-2xl"
              style={{
                boxShadow: isOpen 
                  ? '0 25px 70px rgba(0, 0, 0, 0.4), 0 0 50px rgba(14, 165, 233, 0.25)'
                  : '0 15px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Screen Bezel */}
              <div className="absolute inset-2 rounded-xl bg-black overflow-hidden">
                {/* Screen Content Area */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out 0.5s',
                  }}
                >
                  {isOpen && (
                    <div className="h-full p-6 overflow-y-auto" style={{ animation: 'fadeIn 0.5s ease-in' }}>
                      {children}
                    </div>
                  )}
                  
                  {/* Screen Glow Effect */}
                  {isOpen && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, transparent 60%)',
                        animation: 'glowPulse 3s ease-in-out infinite',
                      }}
                    />
                  )}
                  
                  {/* Screen Reflection */}
                  {isOpen && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%)',
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Screen Hinge Line */}
              <div 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-1.5 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-full"
                style={{
                  transform: isOpen 
                    ? 'translateX(-50%) translateY(0px)' 
                    : 'translateX(-50%) translateY(25px)',
                  transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
          
          {/* Keyboard Base (Bottom Part) - Always visible */}
          <div
            className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-700 rounded-b-2xl"
            style={{
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.1)',
              zIndex: 1,
            }}
          >
            {/* Keyboard Keys Visual Effect */}
            <div className="absolute inset-2 flex items-center justify-center gap-1.5">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-5 bg-gradient-to-b from-gray-600 to-gray-700 rounded shadow-inner"
                  style={{
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            
            {/* Trackpad */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-28 h-9 bg-gray-900 rounded-lg shadow-inner border border-gray-700" />
          </div>
        </div>
        
        {/* Sign In Button (shown when laptop is closed) */}
        {!isOpen && (
          <div 
            className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 z-20"
            style={{
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <button
              onClick={onOpen}
              type="button"
              className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold text-lg shadow-2xl shadow-primary-500/40 hover:shadow-3xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Sign In
            </button>
          </div>
        )}
        
        {/* Ambient Glow Effect */}
        <div 
          className="absolute -inset-32 pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)',
            opacity: isOpen ? 1 : 0.4,
            transition: 'opacity 1.5s ease-in-out',
            filter: 'blur(60px)',
          }}
        />
      </div>
    </div>
  )
}
