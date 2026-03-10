import { X } from 'lucide-react'
import { Button } from './Button'

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  footer 
}) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-900/90 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div 
          className={`inline-block align-bottom bg-white rounded-xl shadow-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                {typeof title === 'string' ? (
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wider">
                    {title}
                  </h3>
                ) : (
                  <div className="text-xl font-bold text-gray-900 uppercase tracking-wider">
                    {title}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-300 hover:scale-110 ml-4"
              >
                <X size={24} />
              </button>
            </div>
            <div className="text-gray-700">{children}</div>
          </div>
          
          {footer && (
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse relative z-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
