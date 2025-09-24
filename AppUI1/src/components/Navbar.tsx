import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  path: string;
}

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navigationItems: NavItem[] = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'oauth', label: 'OAuth Setup', path: '/oauth' },
    { id: 'documentation', label: 'Documentation', path: '/documentation' },
    { id: 'analytics', label: 'Analytics', path: '/analytics' },
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4 h-16">
        {/* Brand/Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex items-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L4 9V23L16 29L28 23V9L16 3Z" fill="#6366F1"/>
              <path d="M16 9L10 12V20L16 23L22 20V12L16 9Z" fill="#A855F7"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900 tracking-tight">ContentStack</span>
        </Link>

        {/* Navigation Links */}
        <ul className="flex items-center gap-8">
          {navigationItems.map((item) => (
            <li key={item.id} className="relative">
              <Link
                to={item.path}
                className={`flex items-center py-2 text-sm font-medium transition-colors relative ${
                  isActiveRoute(item.path) 
                    ? 'text-indigo-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
                {isActiveRoute(item.path) && (
                  <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <div className="flex items-center">
          <Link 
            to="/oauth" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Get Started
          </Link>
          </div>
      </div>
    </nav>
  );
};