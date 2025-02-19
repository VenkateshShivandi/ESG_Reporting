import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, PlusSquare } from 'lucide-react';

const BottomTabBar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav bg-[#F24D6C] shadow-lg fixed bottom-0 left-0 right-0 flex justify-around items-center p-4">
      <Link
        to="/"
        className={`text-2xl ${location.pathname === '/' ? 'text-[#FEE846]' : 'text-white'}`}
      >
        <Home size={24} />
      </Link>
      <Link
        to="/new-quote"
        className={`text-2xl ${location.pathname === '/new-quote' ? 'text-[#FEE846]' : 'text-white'}`}
      >
        <PlusSquare size={24} />
      </Link>
      <Link
        to="/profile"
        className={`text-2xl ${location.pathname === '/profile' ? 'text-[#FEE846]' : 'text-white'}`}
      >
        <User size={24} />
      </Link>
    </nav>
  );
};

export default BottomTabBar;