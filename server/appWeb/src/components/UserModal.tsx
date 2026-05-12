import { User } from "firebase/auth";

interface UserModalProps {
    user: User | null;
    onClose: () => void;
    onConfirm: () => void;
}

export function UserModal({ user, onClose, onConfirm }: UserModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
                <h1 className="mb-4 text-2xl font-bold">Usuario</h1>
                <p className="mb-4 text-lg">{user?.email}</p>
                <p className="mb-4 text-lg">{user?.uid}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
                    >
                        Aceptar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}