"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AuthProvider: () => AuthProvider,
  useAuth: () => useAuth
});
module.exports = __toCommonJS(src_exports);

// src/context.tsx
var import_react = require("react");
var import_auth = require("firebase/auth");
var import_jsx_runtime = require("react/jsx-runtime");
var AuthContext = (0, import_react.createContext)(void 0);
var AuthProvider = ({ children }) => {
  const [user, setUser] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const auth = (0, import_auth.getAuth)();
  (0, import_react.useEffect)(() => {
    const unsubscribe = (0, import_auth.onAuthStateChanged)(auth, (user2) => {
      setUser(user2);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);
  const signIn = async (email, password) => {
    try {
      await (0, import_auth.signInWithEmailAndPassword)(auth, email, password);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign in"));
      throw error2;
    }
  };
  const signUp = async (email, password) => {
    try {
      await (0, import_auth.createUserWithEmailAndPassword)(auth, email, password);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign up"));
      throw error2;
    }
  };
  const signOut = async () => {
    try {
      await (0, import_auth.signOut)(auth);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to sign out"));
      throw error2;
    }
  };
  const resetPassword = async (email) => {
    try {
      await (0, import_auth.sendPasswordResetEmail)(auth, email);
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to reset password"));
      throw error2;
    }
  };
  const updateEmail = async (email) => {
    try {
      if (user) {
        await (0, import_auth.updateEmail)(user, email);
      }
    } catch (error2) {
      setError(error2 instanceof Error ? error2 : new Error("Failed to update email"));
      throw error2;
    }
  };
  const updatePassword = async (password) => {
    try {
      if (user) {
        await (0, import_auth.updatePassword)(user, password);
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthContext.Provider, { value, children: !loading && children });
};
var useAuth = () => {
  const context = (0, import_react.useContext)(AuthContext);
  if (context === void 0) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthProvider,
  useAuth
});
