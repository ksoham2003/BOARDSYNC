import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="flex justify-between items-center px-8 py-3 bg-black border-b border-zinc-800 sticky top-0 z-50">
      <Link to="/" className="text-xl font-black tracking-widest text-white flex items-center gap-2">
        <span className="bg-white text-black text-xs px-2 py-0.5 rounded font-black">BS</span>
        BOARDSYNC
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
          <Avatar className="h-8 w-8 border border-zinc-700">
            {user?.avatar && (
              <AvatarImage 
                src={user.avatar} 
                alt={user.name} 
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-zinc-800 text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-white">{user?.name}</span>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
