import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Rocket, 
  Plus,
  Settings,
  GitBranch,
  Cloud,
  Activity,
  Server,
  Layers,
  BarChart3,
  DollarSign,
  Shield,
  Users
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Environments', 
      href: '/environments', 
      icon: Server,
      description: 'Manage lower environments' 
    },
    { 
      name: 'Create Environment', 
      href: '/environments/create', 
      icon: Plus,
      description: 'Provision new environment' 
    },
    { 
      name: 'Deployments', 
      href: '/deployments', 
      icon: Rocket,
      description: 'Application deployments' 
    },
    { 
      name: 'Resource Monitor', 
      href: '/resources', 
      icon: BarChart3,
      description: 'Resource usage & optimization' 
    },
    { 
      name: 'Cost Management', 
      href: '/costs', 
      icon: DollarSign,
      description: 'Cost tracking & budgets' 
    },
    { 
      name: 'Git Repositories', 
      href: '/repositories', 
      icon: GitBranch,
      description: 'Source code repositories' 
    },
    { 
      name: 'Cloud Projects', 
      href: '/cloud-projects', 
      icon: Cloud,
      description: 'GCP/AWS/Azure projects' 
    },
    { 
      name: 'Access Control', 
      href: '/access', 
      icon: Users,
      description: 'User permissions & roles' 
    },
    { 
      name: 'Activity Logs', 
      href: '/activity', 
      icon: Activity,
      description: 'Audit trails & monitoring' 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      description: 'Platform configuration' 
    },
  ];

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-semibold text-gray-100">Lower Env</h1>
            <p className="text-xs text-gray-400">Management Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-900 text-blue-300 border-r-2 border-blue-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
              }`
            }
            title={item.description}
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <div className="flex items-center mb-1">
            <Shield className="h-3 w-3 mr-1" />
            <span>Secure & Compliant</span>
          </div>
          <div>Version 1.0.0</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;