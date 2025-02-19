import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { User } from "firebase/auth";
import { auth } from "./firebase";
import Chat from "./components/Chat";
import SignIn from "./components/SignIn";
import Profile from "./components/Profile";

const App: React.FC = () => {
  console.log("App component started rendering");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("useEffect in App component triggered");
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed", user ? "User logged in" : "No user");
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    console.log("App is in loading state");
    return <div>Loading...</div>;
  }

  console.log("App component finished rendering", user ? "User present" : "No user");

  return (
    <Router>
      <div className="app min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/chat" /> : <SignIn />} />
          <Route path="/chat" element={user ? <Chat user={user} /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;