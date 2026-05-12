import type { Toast } from '../types';

interface ToastListProps {
  toasts: Toast[];
}

export default function ToastList({ toasts }: ToastListProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[500] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`bg-card border border-borderLight rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm font-medium min-w-[260px] max-w-[360px] pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-toast-in border-l-4 ${
            t.type === 'success' ? 'border-l-success' : t.type === 'error' ? 'border-l-danger' : 'border-l-info'
          }`}
        >
          <div className="text-base shrink-0">
            {t.type === 'success' && <i className="fas fa-check-circle text-success"></i>}
            {t.type === 'error'   && <i className="fas fa-exclamation-circle text-danger"></i>}
            {t.type === 'info'    && <i className="fas fa-info-circle text-info"></i>}
          </div>
          <div className="flex-1 text-textMain">{t.msg}</div>
        </div>
      ))}
    </div>
  );
}
