export const Select = ({ 
  label, 
  error, 
  className = '', 
  required = false,
  options = [],
  placeholder = 'Select an option',
  buttonStyle = false,
  ...props 
}) => {
  return (
    <div className={buttonStyle ? '' : 'mb-4'}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${buttonStyle ? 'mb-1.5' : 'mb-1.5'}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={buttonStyle ? 'relative' : ''}>
        <select
          className={`input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${buttonStyle ? 'bg-white/30 backdrop-blur-md border-2 border-primary-500/50 text-primary-600 hover:bg-primary-500/20 hover:border-primary-500/70 shadow-md focus:bg-primary-500/20 focus:border-primary-500/70 h-[42px]' : ''} ${className} cursor-pointer`}
          style={buttonStyle ? { height: '42px' } : {}}
          {...props}
        >
          {!props.value && placeholder && (
            <option value="" className="bg-white text-gray-900" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="bg-white text-gray-900"
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
