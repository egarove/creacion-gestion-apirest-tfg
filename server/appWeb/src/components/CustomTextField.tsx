import { useState } from "react";

export interface CustomTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefixIcon?: string;
  type?: string;
  label?: string;
  className?: string;
  error?: string;
}

export default function CustomTextField({
  value,
  onChange,
  placeholder,
  type,
  prefixIcon,
  label,
  className,
  error,
}: CustomTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="relative">
      {label && (
        <label className={`block text-sm font-semibold mb-2 ${error ? 'text-red-500' : 'text-textSoft'
          }`}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefixIcon && (
          <i
            className={`fas ${prefixIcon} absolute left-4 text-textMuted text-sm z-10`}
          ></i>
        )}
        <input
          type={
            type === "password" ? (showPassword ? "text" : "password") : type
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-surface border rounded-xl w-full py-3 pr-4 text-sm text-textMain outline-none transition-all ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-borderNormal focus:border-primary focus:ring-2 focus:ring-primaryGlow'
            } ${prefixIcon ? "pl-11" : "pl-4"} ${className || ""}`}
          placeholder={placeholder}
        />
        {type === "password" && (
          <i
            className={`fas ${showPassword ? "fa-eye" : "fa-eye-slash"} absolute right-4 text-textMuted text-sm cursor-pointer`}
            onClick={() => setShowPassword(!showPassword)}
          ></i>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs font-medium mt-1 flex items-center">
          <i className="fas fa-exclamation-circle mr-1"></i>
          {error}
        </p>
      )}
    </div>
  );
}
