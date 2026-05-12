import { useState } from "react";

export interface CustomTextFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    prefixIcon?: string;
    type?: string;
    label?: string;
}

export default function CustomTextField({ value, onChange, placeholder, type, prefixIcon, label }: CustomTextFieldProps) {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="relative">
            {label && <label className="block text-textSoft text-sm font-semibold mb-2">{label}</label>}
            <div className="relative flex items-center">
                {prefixIcon && <i className={`fas ${prefixIcon} absolute left-4 text-textMuted text-sm z-10`}></i>}
                <input
                    type={type === "password" ? showPassword ? "text" : "password" : type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="bg-surface border border-borderNormal rounded-xl w-full py-3 pl-11 pr-4 text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primaryGlow outline-none transition-all"
                    placeholder={placeholder}
                />
                {type === "password" && <i className={`fas ${showPassword ? "fa-eye" : "fa-eye-slash"} absolute right-4 text-textMuted text-sm cursor-pointer`} onClick={() => setShowPassword(!showPassword)}></i>}
            </div>
        </div>
    );
}