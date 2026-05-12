interface Props {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function AlertModal({ message, onConfirm, onCancel }: Props) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-textMain">Alerta</h2>
                    <button
                        onClick={onCancel}
                        className="text-textSoft hover:text-textMain transition-colors"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                <p className="text-textSoft mb-6">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-textSoft hover:text-textMain border border-borderNormal rounded-md transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-primary text-white rounded-md transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}