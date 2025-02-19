import React from 'react';
import { Link } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="welcome-screen flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Chat App</h1>
      <Link to="/signin">
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Sign In
        </button>
      </Link>
    </div>
  );
};

export default WelcomeScreen;