import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    type User,
} from "firebase/auth";
import {
    getFirestore,
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
} from "firebase/firestore";
import { UserData } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyC-l4wevzwLNuoeuUrv8gWqnqbbkUBt0-M",
    authDomain: "gestion-api-rest-dam.firebaseapp.com",
    projectId: "gestion-api-rest-dam",
    storageBucket: "gestion-api-rest-dam.firebasestorage.app",
    messagingSenderId: "181457370400",
    appId: "1:181457370400:web:dc460dc4f9c86cbef82b45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const fireStore = getFirestore(app);

/**
 * Constante que para manejar el sistema de authentication de Firebase.
 */
export const firebaseAuth = {
    signIn: async (email: string, passwd: string): Promise<User | undefined> => {
        try {
            var user;
            await signInWithEmailAndPassword(auth, email, passwd).then(
                (userCredential) => {
                    user = userCredential.user;
                },
            );
            return user;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    },
    logOut: async () => {
        try {
            await signOut(auth);
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    },
    createUser: async (
        email: string,
        passwd: string,
    ): Promise<User | undefined> => {
        try {
            var user;
            await createUserWithEmailAndPassword(auth, email, passwd).then(
                (userCredential) => {
                    user = userCredential.user;
                },
            );
            return user;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    },
    changePasswd: async (user: User, newPassword: string) =>
        await updatePassword(user, newPassword)
            .then(() => true)
            .catch(() => false),
    changePasswdEmail: async (email: string) =>
        await sendPasswordResetEmail(auth, email),
    changePasswdWithLastPasswd: async (
        user: UserData | null,
        newPasswd: string,
        passwd: string,
        confirmPasswd: string,
    ): Promise<boolean> =>
        await firebaseAuth
            .signIn(user?.user!.email ?? "", passwd)
            .then(async (user): Promise<boolean> => {
                if (user && newPasswd == confirmPasswd) {
                    return await firebaseAuth.changePasswd(user, newPasswd);
                } else {
                    return false;
                }
            })
            .catch(() => false),
};

// /**
//  * Clase para crear y gestionar bases de datos de Firebase.
//  */
// export class FirebaseService {
//   _collectionName: string;

//   constructor(collection: string = "") {
//     this._collectionName =
//       collection !== ""
//         ? `usuarios/${collection}`
//         : `usuarios`;
//   }

//   getAll = async <T>() => {
//     try {
//       const colRef = collection(fireStore, this._collectionName);
//       const snapshot = await getDocs(colRef);
//       return snapshot.empty ? null : this.getData<T>(snapshot);
//     } catch (e: any) {
//       console.log(e);
//       return null;
//     }
//   };

//   getUserDevices = async (devices: string[]) => {
//     try {
//       const deviceData = devices.map(async (item) => {
//         item.trim();
//         const result = await firebaseServiceDevice.getByIdentifier(
//           item.split(" - ")[0],
//           "identifier",
//         );
//         return result?.data;
//       });
//       const results = await Promise.all(deviceData);
//       return results
//         .filter((item) => item !== undefined)
//         .map((item, index): FirebaseDataType => {
//           const title = devices[index];
//           return { ...item, identifier: title };
//         });
//     } catch (e) {
//       console.log(e);
//     }
//   };

//   getByIdentifier = async (identifier: string, compare: string) => {
//     try {
//       const collRef = collection(fireStore, this._collectionName);
//       const q = query(collRef, where(compare, "==", identifier));
//       const snapshot = await getDocs(q);
//       const data = this.getData<FirebaseDataType>(snapshot);
//       if (data != null) {
//         return { data: data[0], uid: snapshot.docs[0].id };
//       }
//     } catch (e: any) {
//       console.log(e);
//     }
//   };

//   add = async (data: any) => {
//     try {
//       const colRef = collection(fireStore, this._collectionName);
//       return await addDoc(colRef, data);
//     } catch (e) {
//       console.log(e);
//     }
//   };

//   createDoc = (name: string) => {
//     return doc(fireStore, this._collectionName, name);
//   };

//   exists = async () => {
//     try {
//       collection(fireStore, this._collectionName);
//       return true;
//     } catch (e) {
//       return false;
//     }
//   };

//   private getData = <T>(
//     snapshot: QuerySnapshot<DocumentData, DocumentData>,
//   ) => {
//     return snapshot.empty
//       ? null
//       : snapshot.docs
//           .map((doc) => doc.data() as T)
//           .filter((val) => val != undefined);
//   };

//   delete = async (
//     identifier: string[],
//     compare: string[],
//   ): Promise<boolean> => {
//     try {
//       const collRef = collection(fireStore, this._collectionName);
//       const conditions = compare.map((item, index) =>
//         where(item, "==", identifier[index]),
//       );

//       const q = query(collRef, ...conditions);

//       const snapshot = await getDocs(q);
//       if (snapshot.empty) return false;

//       await deleteDoc(snapshot.docs[0].ref);
//       return true;
//     } catch (e) {
//       return false;
//     }
//   };

//   update = async (uid: string, updated: any) => {
//     try {
//       const docRef = doc(fireStore, this._collectionName, uid);
//       await updateDoc(docRef, updated);
//     } catch (e) {
//       console.log(e);
//     }
//   };
// }

/**
 * Constante creada para gestionar los usuarios de la app.
 */
// export const firebaseServiceUser = new FirebaseService("usuarios", "");

