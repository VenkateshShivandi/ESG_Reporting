import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { FirebaseConfig, AuthError } from './types';

export class FirebaseAuth {
    private auth;

    constructor(config: FirebaseConfig) {
        const app = initializeApp(config);
        this.auth = getAuth(app);
    }

    async signIn(email: string, password: string): Promise<User> {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw new AuthError('Sign in failed', error);
        }
    }

    async signUp(email: string, password: string): Promise<User> {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw new AuthError('Sign up failed', error);
        }
    }

    async logout(): Promise<void> {
        try {
            await signOut(this.auth);
        } catch (error) {
            throw new AuthError('Logout failed', error);
        }
    }

    onAuthChange(callback: (user: User | null) => void): () => void {
        return onAuthStateChanged(this.auth, callback);
    }

    getCurrentUser(): User | null {
        return this.auth.currentUser;
    }
}