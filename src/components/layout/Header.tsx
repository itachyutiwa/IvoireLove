import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigationCounts } from '@/hooks/useNavigationCounts';
import { Button } from '@/components/ui/Button';
import { IoChatbubbles, IoPerson, IoHeart, IoLogOut, IoFilter, IoSettings, IoChevronDown } from 'react-icons/io5';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { subscription, isTrial, timeRemaining } = useSubscription();
  const { newProfilesCount, matchesCount, unreadMessagesCount } = useNavigationCounts();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-gradient-to-r from-white via-primary-50 to-secondary-50 border-b-2 border-primary-200 sticky top-0 z-30 shadow-sm">
      {/* Bandeau d'essai */}
      {isTrial && subscription && (
        <div className="bg-gradient-to-r from-[#F26E27] via-[#FFFFFF] to-[#12C43F] text-gray-900 py-2 px-4 text-center text-sm border-b-2 border-primary-300">
          <span className="font-medium">
            Période d'essai : {timeRemaining} restant • {subscription.messageLimit - subscription.messagesUsed} message{subscription.messageLimit - subscription.messagesUsed > 1 ? 's' : ''} disponible{subscription.messageLimit - subscription.messagesUsed > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <IoHeart className="text-2xl animate-pulse" style={{ 
              background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#F26E27'
            }} />
            <span className="text-xl font-bold bg-gradient-to-r from-[#F26E27] via-[#FFFFFF] to-[#12C43F] bg-clip-text text-transparent">IvoireLove</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/discover"
                className={`px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors font-medium flex items-center space-x-2 relative ${
                  location.pathname === '/discover' ? 'text-primary-600 bg-primary-100 border-2 border-primary-300' : 'text-gray-700'
                }`}
              >
                <span>Découvrir</span>
                {newProfilesCount > 0 && (
                  <span className="bg-[#F26E27] text-white text-xs font-semibold rounded-full h-5 px-2 flex items-center justify-center min-w-[20px]">
                    {newProfilesCount > 9 ? '9+' : newProfilesCount}
                  </span>
                )}
              </Link>
              <Link
                to="/matches"
                className={`px-4 py-2 rounded-lg hover:bg-secondary-100 transition-colors font-medium flex items-center space-x-2 relative ${
                  location.pathname === '/matches' ? 'text-secondary-600 bg-secondary-100 border-2 border-secondary-300' : 'text-gray-700'
                }`}
              >
                <IoHeart style={{ 
                  background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#F26E27'
                }} />
                <span>Matchs</span>
                {matchesCount > 0 && (
                  <span className="bg-[#F26E27] text-white text-xs font-semibold rounded-full h-5 px-2 flex items-center justify-center min-w-[20px]">
                    {matchesCount > 9 ? '9+' : matchesCount}
                  </span>
                )}
              </Link>
              <Link
                to="/messages"
                className={`px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors font-medium flex items-center space-x-2 relative ${
                  location.pathname === '/messages' ? 'text-primary-600 bg-primary-100 border-2 border-primary-300' : 'text-gray-700'
                }`}
              >
                <IoChatbubbles />
                <span>Messages</span>
                {unreadMessagesCount > 0 && (
                  <span className="bg-[#F26E27] text-white text-xs font-semibold rounded-full h-5 px-2 flex items-center justify-center min-w-[20px]">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </Link>
              <Link
                to="/filter"
                className={`px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors font-medium flex items-center space-x-1 ${
                  location.pathname === '/filter' ? 'text-primary-600 bg-primary-100 border-2 border-primary-300' : 'text-gray-700'
                }`}
              >
                <IoFilter />
                <span>Filtre</span>
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`px-4 py-2 rounded-lg hover:bg-secondary-100 transition-colors font-medium flex items-center space-x-2 ${
                    (location.pathname === '/profile' || location.pathname === '/settings') 
                      ? 'text-secondary-600 bg-secondary-100 border-2 border-secondary-300' 
                      : 'text-gray-700'
                  }`}
                >
                  {user.photos && user.photos.length > 0 ? (
                    <img
                      src={user.photos[0].startsWith('http') 
                        ? user.photos[0] 
                        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${user.photos[0]}`}
                      alt={user.firstName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32x32?text=Photo';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                      <IoPerson size={16} className="text-gray-600" />
                    </div>
                  )}
                  <span>{user.firstName}</span>
                  <IoChevronDown 
                    size={16} 
                    className={`transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden z-50">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        location.pathname === '/profile' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      <IoPerson size={20} />
                      <span className="font-medium">Profil</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-200 ${
                        location.pathname === '/settings' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      <IoSettings size={20} />
                      <span className="font-medium">Paramètres</span>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          )}

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/subscription')}
                >
                  {subscription?.type === 'trial' ? 'Passer Premium' : 'Abonnements'}
                </Button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Déconnexion"
                >
                  <IoLogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Connexion
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Inscription
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

