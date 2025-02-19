// src/context.tsx
import { createContext, useContext, useState, useEffect } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { jsx } from "react/jsx-runtime";
var AuthContext = createContext(void 0);
var AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user2) => {
      setUser(user2);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);
  const signIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign in"));
      throw error2;
    }
  };
  const signUp = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign up"));
      throw error2;
    }
  };
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign out"));
      throw error2;
    }
  };
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to reset password"));
      throw error2;
    }
  };
  const updateEmail = async (email) => {
    try {
      if (user) {
        await firebaseUpdateEmail(user, email);
      }
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to update email"));
      throw error2;
    }
  };
  const updatePassword = async (password) => {
    try {
      if (user) {
        await firebaseUpdatePassword(user, password);
      }
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to update password"));
      throw error2;
    }
  };
  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children: !loading && children });
};
var useAuth = () => {
  const context = useContext(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export {
  AuthProvider,
  useAuth
};
