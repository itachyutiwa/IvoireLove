import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IoHome, IoHeart, IoChatbubbles, IoPerson, IoFilter, IoSettings } from 'react-icons/io5';
import { useNavigationCounts } from '@/hooks/useNavigationCounts';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { socketService } from '@/services/socketService';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, updateUser, presenceMode, setPresenceMode } = useAuthStore();
  const { newProfilesCount, matchesCount, unreadMessagesCount } = useNavigationCounts();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isUpdatingPresence, setIsUpdatingPresence] = useState(false);

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

  const handlePresenceChange = async (mode: 'online' | 'offline') => {
    if (!user) return;
    setIsUpdatingPresence(true);
    try {
      await userService.updateOnlineStatus(mode === 'online');
      setPresenceMode(mode);
      updateUser({
        ...user,
        isOnline: mode === 'online',
        lastActive: new Date().toISOString(),
      });
      if (mode === 'online') {
        socketService.connect();
      } else {
        socketService.disconnect();
      }
    } catch (e) {
      // Ne pas bloquer l'UI si l'API échoue
    } finally {
      setIsUpdatingPresence(false);
    }
  };

  const navItems: Array<{
    path: string;
    icon: any;
    label: string;
    badge?: number;
    isProfile?: boolean;
  }> = [
    {
      path: '/discover',
      icon: IoHome,
      label: 'Découvrir',
      badge: newProfilesCount > 0 ? newProfilesCount : undefined,
    },
    {
      path: '/matches',
      icon: IoHeart,
      label: 'Matchs',
      badge: matchesCount > 0 ? matchesCount : undefined,
    },
    {
      path: '/messages',
      icon: IoChatbubbles,
      label: 'Messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { path: '/filter', icon: IoFilter, label: 'Filtre' },
    { path: '/profile', icon: IoPerson, label: 'Profil', isProfile: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white via-primary-50 to-secondary-50 border-t-2 border-primary-200 z-30 md:hidden shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isProfile = item.isProfile;
          
          if (isProfile && user) {
            return (
              <div key={item.path} className="relative flex-1 h-full" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
                    (location.pathname === '/profile' || location.pathname === '/settings')
                      ? 'text-primary-600 bg-primary-100 rounded-t-lg border-t-2 border-primary-400' 
                      : 'text-gray-600'
                  }`}
                >
                  <div className="relative flex flex-col items-center space-y-1">
                    {user.photos && user.photos.length > 0 ? (
                      <img
                        src={user.photos[0].startsWith('http') 
                          ? user.photos[0] 
                          : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${user.photos[0]}`}
                        alt={user.firstName}
                        className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/28x28?text=Photo';
                        }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white">
                        <IoPerson size={16} className="text-gray-600" />
                      </div>
                    )}
                    <span className="text-xs font-medium leading-tight">{user.firstName}</span>
                  </div>
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden z-50">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        location.pathname === '/profile' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      <IoPerson size={18} />
                      <span className="text-sm font-medium">Profil</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-200 ${
                        location.pathname === '/settings' ? 'bg-primary-50 text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      <IoSettings size={18} />
                      <span className="text-sm font-medium">Paramètres</span>
                    </Link>

                    <div className="border-t border-gray-200 px-3 py-3">
                      <p className="text-[11px] font-semibold text-gray-500 mb-2 text-center">Présence</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePresenceChange('online')}
                          disabled={isUpdatingPresence}
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                            presenceMode === 'online'
                              ? 'bg-green-50 border-green-400 text-green-700'
                              : 'bg-white border-gray-200 text-gray-700'
                          } ${isUpdatingPresence ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          On
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresenceChange('offline')}
                          disabled={isUpdatingPresence}
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                            presenceMode === 'offline'
                              ? 'bg-red-50 border-red-400 text-red-700'
                              : 'bg-white border-gray-200 text-gray-700'
                          } ${isUpdatingPresence ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          Off
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive ? 'text-primary-600 bg-primary-100 rounded-t-lg border-t-2 border-primary-400' : 'text-gray-600'
              }`}
            >
              <div className="relative">
                {item.icon === IoHeart ? (
                  <Icon size={24} style={isActive ? { 
                    background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#F26E27'
                  } : { 
                    color: '#6b7280'
                  }} />
                ) : (
                  <Icon size={24} />
                )}
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-[#F26E27] text-white text-xs font-semibold rounded-full h-5 px-1.5 flex items-center justify-center min-w-[20px] shadow-md">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

