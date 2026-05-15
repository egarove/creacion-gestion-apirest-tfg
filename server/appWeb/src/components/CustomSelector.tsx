
interface CustomSelectorProps {
    options: { value: string; label: string }[];
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
}

export default function CustomSelector({ options, value, onChange, className }: CustomSelectorProps) {
    return (
        <div className={`custom-selector`}>
            <select 
            value={value} 
            onChange={(e) => onChange && onChange(e.target.value)} 
            
            className={`bg-bg border border-borderNormal rounded-lg px-3 py-2 text-xs text-textSoft outline-none cursor-pointer focus:border-primary transition-all ${className || ""}`}

            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}