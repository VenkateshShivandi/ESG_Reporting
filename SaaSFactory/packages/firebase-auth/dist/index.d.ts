import React$1 from 'react';
import { User } from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateEmail: (email: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
}
interface AuthProviderProps {
    children: React.ReactNode;
}

declare const AuthProvider: React$1.FC<AuthProviderProps>;
declare const useAuth: () => AuthContextType;

export { AuthContextType, AuthProvider, useAuth };
