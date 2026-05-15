import { UserData } from "../types";

interface UserAdminCardProps {
    user: UserData;
    handleChangeRole: (userId: string, newRole: "admin" | "usuario") => void;
    setDeleteConfirm: (user: UserData) => void;
    actionLoading: boolean;
}

export default function UserAdminCard({ user, handleChangeRole, setDeleteConfirm, actionLoading }: UserAdminCardProps) {
    return (
        <div
            key={user.uid}
            className="bg-card border border-borderNormal rounded-xl p-4 hover:border-borderLight transition-all cursor-pointer"
        >
            <div className="flex items-center justify-between flex-wrap gap-4">
                {/* User Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-user text-primary"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-textMain truncate">
                            {user.email}
                        </p>
                        <code className="text-xs text-textMuted truncate block">
                            {user.uid}
                        </code>
                    </div>
                </div>
                {/* Role Badge */}
                <div className="flex items-center gap-2">
                    <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${user.role === "admin"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                    >
                        {user.role === "admin" ? "Admin" : "Usuario"}
                    </span>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                    {user.role === "usuario" ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleChangeRole(user.uid, "admin");
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50"
                            title="Promover a Admin"
                        >
                            <i className="fas fa-crown mr-1"></i> Promover
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleChangeRole(user.uid, "usuario");
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-all disabled:opacity-50"
                            title="Degradar a Usuario"
                        >
                            <i className="fas fa-user mr-1"></i> Degradar
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(user);
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50"
                        title="Eliminar usuario"
                    >
                        <i className="fas fa-trash mr-1"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}