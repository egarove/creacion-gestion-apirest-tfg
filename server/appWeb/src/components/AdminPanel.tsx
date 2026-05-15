import { useState, useEffect } from "react";
import { adminService } from "../services/AdminService";
import { useContextStore } from "../contextZustand";
import type { UserData } from "../types";
import { v4 as uuidv4 } from "uuid";
import StatCard from "./StatCard";
import DeleteModal from "./modals/DeleteModal";
import CustomTextField from "./CustomTextField";
import UserAdminCard from "./UserAdminCard";

export default function AdminPanel() {
    const context = useContextStore();
    const [users, setUsers] = useState<UserData[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "usuario">("all");
    const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);

    // Cargar usuarios
    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await adminService.getAllUsers();
            setUsers(allUsers);
            filterUsers(allUsers, search, roleFilter);
        } catch (error) {
            context.addToast({
                id: uuidv4(),
                msg: "Error al cargar usuarios",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = (
        usersList: UserData[],
        searchTerm: string,
        role: "all" | "admin" | "usuario"
    ) => {
        let filtered = usersList;

        if (searchTerm) {
            filtered = filtered.filter(
                (user) =>
                    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (role !== "all") {
            filtered = filtered.filter((user) => user.role === role);
        }

        setFilteredUsers(filtered);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        filterUsers(users, search, roleFilter);
    }, [search, roleFilter, users]);

    const handleChangeRole = async (userId: string, newRole: "admin" | "usuario") => {
        setActionLoading(true);
        try {
            const success = await adminService.updateUserRole(userId, newRole);
            if (success) {
                const updatedUsers = users.map((u) =>
                    u.uid === userId ? { ...u, role: newRole } : u
                );
                setUsers(updatedUsers);
                context.addToast({
                    id: uuidv4(),
                    msg: `Rol actualizado a ${newRole}`,
                    type: "success",
                });
            } else {
                context.addToast({
                    id: uuidv4(),
                    msg: "Error al actualizar el rol",
                    type: "error",
                });
            }
        } catch (error) {
            context.addToast({
                id: uuidv4(),
                msg: "Error al actualizar el rol",
                type: "error",
            });
        } finally {
            setActionLoading(false);
        }
    };

    // Eliminar usuario
    const handleDeleteUser = async (user: UserData) => {
        setActionLoading(true);
        try {
            const success = await adminService.deleteUser(user.uid);
            if (success) {
                const updatedUsers = users.filter((u) => u.uid !== user.uid);
                setUsers(updatedUsers);
                setDeleteConfirm(null);
                context.addToast({
                    id: uuidv4(),
                    msg: "Usuario eliminado correctamente",
                    type: "success",
                });
            } else {
                context.addToast({
                    id: uuidv4(),
                    msg: "Error al eliminar el usuario",
                    type: "error",
                });
            }
        } catch (error) {
            context.addToast({
                id: uuidv4(),
                msg: "Error al eliminar el usuario",
                type: "error",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const adminCount = users.filter((u) => u.role === "admin").length;
    const userCount = users.filter((u) => u.role === "usuario").length;

    return (
        <main className="ml-[270px] flex-1 p-8 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold leading-none">Gestión de Usuarios</h1>
                <p className="text-sm text-textMuted mt-2">
                    Administra los roles y usuarios de la aplicación
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard 
                    label="Total Usuarios"
                    value={users.length}
                    icon="fas fa-users"
                    color="text-primary"
                />

                <StatCard 
                    label="Administradores"
                    value={adminCount}
                    icon="fas fa-user-shield"
                    color="text-amber-400"
                />

                <StatCard 
                    label="Usuarios Estándar"
                    value={userCount}
                    icon="fas fa-user"
                    color="text-blue-400"
                />
            </div>

            {/* Controls */}
            <div className="bg-card border border-borderNormal rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <CustomTextField
                            value={search}
                            onChange={(e) => setSearch(e)}
                            placeholder="Buscar por email o UID"
                            prefixIcon="fa-search"
                            className="bg-bg border border-borderNormal rounded-lg px-3 py-2.5 text-sm text-textSoft outline-none focus:border-primary transition-all w-full"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="flex bg-bg rounded-lg overflow-hidden border border-borderNormal">
                        {["all", "admin", "usuario"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setRoleFilter(f as "all" | "admin" | "usuario")}
                                className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${roleFilter === f
                                    ? "bg-primary text-white"
                                    : "text-textMuted hover:text-textMain"
                                    }`}
                            >
                                {f === "all"
                                    ? "Todas"
                                    : f === "admin"
                                        ? "Administradores"
                                        : "Usuarios Estándar"}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={loadUsers}
                        disabled={loading}
                        className="bg-bg border border-borderNormal rounded-lg px-4 py-2.5 text-textSoft hover:text-textMain hover:border-borderLight transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        <i className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}></i>
                    </button>
                </div>
            </div>

            {/* Users Table/List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-card border border-borderNormal rounded-2xl">
                    <i className="fas fa-spinner animate-spin text-3xl text-primary mb-4"></i>
                    <p className="text-textSoft">Cargando usuarios...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 bg-card border-2 border-dashed border-borderNormal rounded-2xl gap-4 text-center">
                    <div className="text-5xl text-borderLight">
                        <i className="fas fa-inbox"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-textSoft">
                        {users.length === 0 ? "No hay usuarios" : "Sin resultados"}
                    </h3>
                    <p className="text-sm text-textMuted">
                        {users.length === 0
                            ? "No hay usuarios en la aplicación"
                            : "Ajusta los filtros de búsqueda"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredUsers.map((user) => (
                        <UserAdminCard
                            key={user.uid}
                            user={user}
                            handleChangeRole={handleChangeRole}
                            setDeleteConfirm={setDeleteConfirm}
                            actionLoading={actionLoading}
                        />
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <DeleteModal 
                    target={deleteConfirm.email ?? deleteConfirm.uid}
                    confirm={() => handleDeleteUser(deleteConfirm)}
                    close={() => setDeleteConfirm(null)}
                />
            )}
        </main>
    );
}
