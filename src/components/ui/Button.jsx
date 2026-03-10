export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  onClick,
  type = 'button',
  transparent = false,
  customColor,
  ...props 
}) => {
  const baseClasses = 'btn relative overflow-hidden'
  
  // Transparent variants with glass effect
  const transparentVariants = {
    primary: transparent 
      ? 'bg-primary-500/20 backdrop-blur-md border border-primary-500/40 text-primary-700 hover:bg-primary-500/30 hover:border-primary-500/60 shadow-lg shadow-primary-500/20'
      : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40',
    secondary: transparent
      ? 'bg-gray-500/20 backdrop-blur-md border border-gray-500/40 text-gray-700 hover:bg-gray-500/30 hover:border-gray-500/60 shadow-md'
      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 hover:from-gray-200 hover:to-gray-300 shadow-md',
    danger: transparent
      ? 'bg-red-500/20 backdrop-blur-md border border-red-500/40 text-red-700 hover:bg-red-500/30 hover:border-red-500/60 shadow-lg shadow-red-500/20'
      : 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40',
    outline: transparent
      ? 'bg-white/30 backdrop-blur-md border-2 border-primary-500/50 text-primary-600 hover:bg-primary-500/20 hover:border-primary-500/70 shadow-md'
      : 'bg-white/80 backdrop-blur-sm text-primary-600 border-2 border-primary-600 hover:bg-primary-50 shadow-md hover:shadow-lg',
  }
  
  const variantClasses = transparentVariants[variant] || transparentVariants.primary
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  }

  // Custom color styling if provided
  const customStyle = customColor ? {
    backgroundColor: transparent ? `${customColor}20` : customColor,
    borderColor: transparent ? `${customColor}60` : 'transparent',
    color: transparent ? customColor : '#ffffff',
    boxShadow: transparent ? `0 4px 15px ${customColor}30` : `0 4px 15px ${customColor}40`,
  } : {}

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses} ${sizeClasses[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={customStyle}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 opacity-0 hover:opacity-100" />
      <span className="relative z-10">{children}</span>
    </button>
  )
}
