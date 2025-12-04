import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyles = "py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95 text-sm compact-button";
  
  const variants = {
    primary: "bg-brand-yellow text-brand-dark hover:bg-yellow-400",
    secondary: "bg-brand-dark text-white hover:bg-gray-800",
    outline: "border-2 border-brand-dark text-brand-dark hover:bg-brand-light"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};