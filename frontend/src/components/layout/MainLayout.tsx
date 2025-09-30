import React from 'react';
import { 
  LayoutGrid, 
  Rocket, 
  PlusCircle, 
  GitBranch, 
  CloudCog, 
  Activity, 
  Settings
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItemProps[] = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/deployments', icon: Rocket, label: 'Deployments' },
  { to: '/deployments/create', icon: PlusCircle, label: 'Create Deployment' },
  { to: '/repositories', icon: GitBranch, label: 'Git Repositories' },
  { to: '/gcp-projects', icon: CloudCog, label: 'GCP Projects' },
  { to: '/activity', icon: Activity, label: 'Activity' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const NavItem: React.FC<{ item: NavItemProps }> = ({ item }) => (
  <NavLink 
    to={item.to} 
    className={({ isActive }) =>
      `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`
    }
  >
    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
    <span>{item.label}</span>
  </NavLink>
);

export const MainNavigation: React.FC = () => (
  <nav className="flex-1 px-4 pb-4 space-y-1">
    {navItems.map((item) => (
      <NavItem key={item.to} item={item} />
    ))}
  </nav>
);

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              Deploy Platform
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <MainNavigation />

        {/* Version */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Version 1.0.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export default MainLayout;