import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, ChevronDown } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-100">
            Lower Environment Deployment Platform
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          <div className="relative group">
            <button className="flex items-center space-x-2 p-2 text-gray-300 hover:text-gray-100 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">{user?.name}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700">
                {user?.email}
              </div>
              <button
                onClick={logout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;