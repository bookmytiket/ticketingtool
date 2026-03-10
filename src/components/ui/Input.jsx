export const Input = ({ 
  label, 
  error, 
  className = '', 
  required = false,
  icon,
  ...props 
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-primary-600">
            {icon}
          </div>
        )}
        <input
          className={`input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${icon ? 'pl-10' : ''} ${className} group-focus-within:scale-[1.01] group-focus-within:shadow-lg group-focus-within:shadow-primary-500/20`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 animate-slide-down">{error}</p>
        )}
      </div>
    </div>
  )
}
