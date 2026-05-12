interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

export default function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors: Record<string, string> = {
    purple: 'bg-primaryGlow text-primary',
    green:  'bg-successBg text-success',
    red:    'bg-dangerBg text-danger',
    blue:   'bg-infoBg text-info',
  };
  return (
    <div className="bg-card border border-borderNormal rounded-2xl p-5 flex items-center gap-4 hover:border-borderLight hover:-translate-y-0.5 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${colors[color]}`}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div className="text-xs text-textMuted font-medium">{label}</div>
        <div className="text-3xl font-extrabold leading-none text-textMain mt-1">{value}</div>
      </div>
    </div>
  );
}
