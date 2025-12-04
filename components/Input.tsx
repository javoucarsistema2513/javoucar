import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  type = "text", 
  icon, 
  error,
  className = '',
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full mb-3 ${className}`}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 icon-small">
            {icon}
          </div>
        )}
        <input
          type={inputType}
          className={`w-full rounded-xl border-2 bg-white py-2.5 ${icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'} text-gray-900 placeholder-gray-400 focus:border-brand-yellow focus:ring-brand-yellow focus:outline-none transition-colors text-sm ${error ? 'border-red-500' : 'border-gray-200'} compact-form`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};