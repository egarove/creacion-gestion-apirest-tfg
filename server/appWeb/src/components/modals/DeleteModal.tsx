import { useState } from 'react';

interface DeleteModalProps {
  target: string;
  close: () => void;
  confirm: () => void;
}

export default function DeleteModal({ target, close, confirm }: DeleteModalProps) {
  const [input, setInput] = useState<string>('');
  return (
    <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-[420px] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 pb-2 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-dangerBg text-danger flex items-center justify-center text-3xl mb-4">
            <i className="fas fa-trash"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Eliminar <span className="text-danger">{target}</span></h3>
          <p className="text-sm text-textMuted mb-6">Esta acción es irreversible. Se eliminarán los contenedores y datos.</p>
          <div className="w-full text-left">
            <div className="text-xs text-textMuted mb-1">Escribe el nombre exacto para confirmar:</div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-card border border-borderNormal rounded-xl p-3 text-center text-sm font-mono focus:border-danger outline-none"
              placeholder={target}
            />
          </div>
        </div>
        <div className="p-6 pt-4 flex gap-3">
          <button onClick={close} className="flex-1 px-4 py-2.5 rounded-xl border border-borderLight text-textSoft hover:text-textMain font-semibold text-sm">Cancelar</button>
          <button onClick={confirm} disabled={input !== target} className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
