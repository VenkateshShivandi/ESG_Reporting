import React from "react";
import { User } from "firebase/auth";
import { auth } from "../firebase";
import { log } from "../logger";

interface ProfileProps {
  user: User;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      log("info", "User signed out successfully");
    } catch (error) {
      log("error", "Failed to sign out");
    }
  };

  return (
    <div className="profile p-4">
      <h2 className="text-2xl font-bold mb-4">Perfil</h2>
      <p>Nombre: {user.displayName}</p>
      <p>Email: {user.email}</p>
      <button
        onClick={handleSignOut}
        className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default Profile;