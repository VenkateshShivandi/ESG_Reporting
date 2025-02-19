import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { log } from '../logger';

const SignIn: React.FC = () => {
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      log("info", "User signed in successfully");
      navigate('/chat');
    } catch (error) {
      log("error", "Failed to sign in with Google");
    }
  };

  return (
    <div className="sign-in flex flex-col items-center justify-center min-h-screen bg-[#FEE846]">
      <img src="/static/logo.png" alt="Logo" className="mb-8 w-80" />
      <h1 className="text-4xl font-bold mb-4 text-[#F24D6C]">Welcome to the Quote Assistant</h1>
      <p className="text-2xl mb-4 text-[#F8912E]">Sign in to get a quote!</p>
      <p className="text-lg mb-8 text-black text-center max-w-md">
        If you're a wholesaler in search of the best peaches on earth, you've found the perfect place.
      </p>
      <button
        onClick={signInWithGoogle}
        className="bg-[#F24D6C] hover:bg-[#F24D6C] text-white hover:text-[#FEE846] font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default SignIn;