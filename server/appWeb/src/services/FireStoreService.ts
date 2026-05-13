import {
    collection,
    getDocs,
    addDoc,
    where,
    QuerySnapshot,
    type DocumentData,
    query,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
} from "firebase/firestore";
import { Api } from "../types";
import { fireStore } from "../FirebaseConfig";

/**
 * Clase para crear y gestionar bases de datos de Firebase.
 */
export class FirebaseService {
    userCollectionRef: string;

    constructor(uid: string = "") {
        this.userCollectionRef =
            uid !== ""
                ? `usuarios/${uid}`
                : `usuarios`;
    }

    setCollection = (path: string) => {
        this.userCollectionRef = `usuarios/${path}`;
    };

    getAllUserApis = async () => {
        try {
            const colRef = collection(fireStore, `${this.userCollectionRef}`);
            const snapshot = await getDocs(colRef);
            return snapshot.empty ? null : this.getData<Api>(snapshot);
        } catch (e: any) {
            console.log(e);
            return null;
        }
    };

    getUserApis = async (apis: Api[]) => {
        try {
            const result = await this.getAllUserApis();
            if (result != null) {
                const apiData = apis.map((api) => result.find((item) => item.api_name === api.api_name)).filter((item) => item != undefined)
                return apiData;
            }
            return [];
        } catch (e) {
            console.log(e);
            return [];
        }
    };

    getByIdentifier = async <T>(compare: string, identifier: string) => {
        try {
            const collRef = collection(fireStore, this.userCollectionRef);
            const q = query(collRef, where(compare, "==", identifier));
            const snapshot = await getDocs(q);
            const data = this.getData<T>(snapshot);
            if (data != null) {
                return data[0];
            }
            return null;
        } catch (e: any) {
            console.log(e);
            return null;
        }
    };

    add = async (data: any) => {
        try {
            const colRef = collection(fireStore, this.userCollectionRef);
            return await addDoc(colRef, data);
        } catch (e) {
            console.log(e);
        }
    };

    createDoc = (name: string) => {
        return doc(fireStore, this.userCollectionRef, name);
    };

    exists = async () => {
        try {
            collection(fireStore, this.userCollectionRef);
            return true;
        } catch (e) {
            return false;
        }
    };

    private getData = <T>(
        snapshot: QuerySnapshot<DocumentData, DocumentData>,
    ) => {
        return snapshot.empty
            ? null
            : snapshot.docs
                .map((doc) => doc.data() as T)
                .filter((val) => val != undefined);
    };

    delete = async (
        identifier: string[],
        compare: string[],
    ): Promise<boolean> => {
        try {
            const collRef = collection(fireStore, this.userCollectionRef);
            const conditions = compare.map((item, index) =>
                where(item, "==", identifier[index]),
            );

            const q = query(collRef, ...conditions);

            const snapshot = await getDocs(q);
            if (snapshot.empty) return false;

            await deleteDoc(snapshot.docs[0].ref);
            return true;
        } catch (e) {
            return false;
        }
    };

    update = async (uid: string, updated: any) => {
        try {
            const docRef = doc(fireStore, this.userCollectionRef, uid);
            await updateDoc(docRef, updated);
        } catch (e) {
            console.log(e);
        }
    };

    saveApi = async (name: string, data: any) => {
        try {
            const docRef = doc(fireStore, this.userCollectionRef, name);
            await setDoc(docRef, data);
        } catch (e) {
            console.log(e);
        }
    };

    deleteApiDoc = async (name: string) => {
        try {
            const docRef = doc(fireStore, this.userCollectionRef, name);
            await deleteDoc(docRef);
        } catch (e) {
            console.log(e);
        }
    };
}

/**
 * Constante creada para gestionar los usuarios de la app.
 */
export const firebaseServiceUser = new FirebaseService();
