import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
} from "firebase/firestore";
import { auth, fireStore } from "../FirebaseConfig";
import type { UserData } from "../types";
import { firebaseAuth } from "./LogInService";

/**
 * Servicio para gestionar usuarios desde el panel de administración
 */
export const adminService = {
    /**
     * Obtiene todos los usuarios de la colección de usuarios
     */
    getAllUsers: async (): Promise<(UserData & { id: string })[]> => {
        try {
            const usersCollection = collection(fireStore, "usuarios");
            const snapshot = await getDocs(usersCollection);
            
            const users: (UserData & { id: string })[] = [];
            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                users.push({
                    id: docSnapshot.id,
                    uid: data.uid || docSnapshot.id,
                    email: data.email || "",
                    role: data.role || "usuario",
                    apis: data.apis || [],
                } as UserData & { id: string });
            });
            
            return users;
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
            return [];
        }
    },

    /**
     * Actualiza el rol de un usuario
     */
    updateUserRole: async (userId: string, newRole: "admin" | "usuario"): Promise<boolean> => {
        try {
            const userDocRef = doc(fireStore, "usuarios", userId);
            await updateDoc(userDocRef, { role: newRole });
            return true;
        } catch (error) {
            console.error("Error al actualizar rol:", error);
            return false;
        }
    },

    /**
     * Elimina un usuario (solo el documento de Firestore)
     */
    deleteUser: async (userId: string): Promise<boolean> => {
        try {
            const userDocRef = doc(fireStore, "usuarios", userId);
            await deleteDoc(userDocRef);
            return true;
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            return false;
        }
    },

    /**
     * Busca usuarios por email
     */
    searchUsersByEmail: async (email: string): Promise<(UserData & { id: string })[]> => {
        try {
            const usersCollection = collection(fireStore, "usuarios");
            const q = query(usersCollection, where("email", ">=", email), where("email", "<=", email + "\uf8ff"));
            const snapshot = await getDocs(q);
            
            const users: (UserData & { id: string })[] = [];
            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                users.push({
                    id: docSnapshot.id,
                    uid: data.uid || docSnapshot.id,
                    email: data.email || "",
                    role: data.role || "usuario",
                    apis: data.apis || [],
                } as UserData & { id: string });
            });
            
            return users;
        } catch (error) {
            console.error("Error al buscar usuarios:", error);
            return [];
        }
    },

    /**
     * Obtiene el número total de usuarios
     */
    getUserCount: async (): Promise<number> => {
        try {
            const users = await adminService.getAllUsers();
            return users.length;
        } catch (error) {
            console.error("Error al obtener conteo de usuarios:", error);
            return 0;
        }
    },
};
