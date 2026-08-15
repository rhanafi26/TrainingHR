import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="max-w-6xl mx-auto px-4 pt-4">
      <div className="glass-card rounded-full px-6 py-3 flex justify-between items-center shadow-lg">
        {/* Logo */}
        <Link to={user?.role === 'admin' ? '/dashboard-hr' : '/dashboard'}>
          <h1 className="text-xl font-bold text-primary-700 flex items-center gap-2">
            <span></span> Training System
          </h1>
        </Link>
        
        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Navigation Links for User */}
          {user?.role === 'user' && (
            <Link 
              to="/riwayat" 
              className="text-sm text-gray-600 hover:text-primary-500 transition-colors px-3 py-1.5 rounded-full hover:bg-primary-50"
            >
              Riwayat
            </Link>
          )}
          
          {/* User Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-full">
            <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-semibold">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <span className="hidden sm:inline">{user?.full_name}</span>
            <span className="text-xs text-gray-400 hidden md:inline">
              ({user?.role === 'admin' ? 'Admin' : 'User'})
            </span>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="btn-primary text-sm px-4 py-1.5"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;