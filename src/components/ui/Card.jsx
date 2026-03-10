export const Card = ({ 
  children, 
  className = '',
  title,
  actions,
  onClick,
  style
}) => {
  return (
    <div 
      className={`card ${className}`}
      onClick={onClick}
      style={style}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/50">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {title}
            </h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}
