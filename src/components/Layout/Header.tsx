import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Menu } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/src/assets/Logo.png" 
                alt="FundiConnect Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">FundiConnect</span>
              <div className="text-xs text-orange-600 font-medium hidden sm:block">Skilled Hands Across Africa</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-orange-600 transition-colors">
                  Dashboard
                </Link>
                {user.profile?.role === 'client' && (
                  <Link to="/search" className="text-gray-700 hover:text-orange-600 transition-colors">
                    Find Fundis
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="text-gray-700 hover:text-orange-600 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>

          <button className="md:hidden">
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>
    </header>
  );
}