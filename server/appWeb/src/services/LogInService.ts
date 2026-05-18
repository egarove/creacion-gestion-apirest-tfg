import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updatePassword,
    type User,
    type UserCredential,
} from "firebase/auth";
import { auth } from "../FirebaseConfig";


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
    signInWithGoogle: async (): Promise<UserCredential> => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    },
    changePasswdWithLastPasswd: async (
        user: User | null,
        newPasswd: string,
        passwd: string,
        confirmPasswd: string,
    ): Promise<boolean> =>
        await firebaseAuth
            .signIn(user!.email ?? "", passwd)
            .then(async (user): Promise<boolean> => {
                if (user && newPasswd == confirmPasswd) {
                    return await firebaseAuth.changePasswd(user, newPasswd);
                } else {
                    return false;
                }
            })
            .catch(() => false),
};