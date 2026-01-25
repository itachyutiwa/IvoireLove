import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { User } from '@/types';
import { getAge } from '@/utils/helpers';
import { IoLocationOutline, IoHeart, IoClose, IoStar, IoChevronBack, IoChevronForward, IoRadioButtonOn, IoThumbsUp, IoThumbsDown } from 'react-icons/io5';

interface ProfileCardProps {
  user: User;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  onSwipeComplete?: () => void;
  showStats?: boolean;
  hideSuperlike?: boolean;
  isMatched?: boolean;
  customHeight?: string;
  customPhotoHeight?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  onSwipe,
  onSwipeComplete,
  showStats = true,
  hideSuperlike = false,
  isMatched = false,
  customHeight,
  customPhotoHeight,
}) => {
  const [exitX, setExitX] = useState(0);
  const [exitY, setExitY] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    // Si déjà matché, désactiver les swipes
    if (isMatched) return;
    
    const threshold = 100;
    
    if (Math.abs(info.offset.x) > threshold) {
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
      setTimeout(() => {
        onSwipeComplete?.();
      }, 300);
    } else if (info.offset.y < -threshold && !hideSuperlike) {
      setExitY(-1000);
      onSwipe('up');
      setTimeout(() => {
        onSwipeComplete?.();
      }, 300);
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
      exit={{ x: exitX, y: exitY, opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute w-full h-full"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col" style={{ minHeight: customHeight || '500px', maxHeight: customHeight || '500px' }}>
        {/* Galerie de photos */}
        <div className="relative bg-gray-200 flex-shrink-0" style={{ height: customPhotoHeight || '300px' }}>
          {user.photos && user.photos.length > 0 ? (
            <>
              <img
                src={(() => {
                  const photo = user.photos[currentPhotoIndex] || user.photos[0];
                  // Construire l'URL complète si c'est une URL relative
                  return photo.startsWith('http') 
                    ? photo 
                    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                })()}
                alt={user.firstName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Si l'image ne charge pas, utiliser une image par défaut
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600?text=Photo';
                }}
              />
              
              {/* Navigation des photos */}
              {user.photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const photosLength = user.photos?.length || 0;
                      setCurrentPhotoIndex((prev) =>
                        prev === 0 ? photosLength - 1 : prev - 1
                      );
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <IoChevronBack size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const photosLength = user.photos?.length || 0;
                      setCurrentPhotoIndex((prev) =>
                        prev === photosLength - 1 ? 0 : prev + 1
                      );
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                  >
                    <IoChevronForward size={24} />
                  </button>
                  
                  {/* Indicateurs de photos */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {(user.photos || []).map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(index);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentPhotoIndex
                            ? 'bg-white'
                            : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <IoStar size={64} />
            </div>
          )}
          
          {/* Badge vérifié */}
          {user.verified && (
            <div className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
              <IoStar size={16} />
              <span>Vérifié</span>
            </div>
          )}
        </div>

        {/* Informations */}
        <div className="flex-1 p-6 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.firstName}, {getAge(user.dateOfBirth)}
                </h2>
                <div className="relative flex-shrink-0">
                  {user.isOnline ? (
                    <>
                      <IoRadioButtonOn 
                        size={16} 
                        className="text-green-500" 
                        style={{ filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.8))' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      </span>
                    </>
                  ) : (
                    <>
                      <IoRadioButtonOn 
                        size={16} 
                        className="text-red-500" 
                        style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {user.location && (
              <div className="flex items-center text-gray-600 mb-3">
                <IoLocationOutline size={18} className="mr-1 flex-shrink-0" />
                <span className="text-sm truncate">
                  {[
                    user.location.quartier,
                    user.location.city,
                    user.location.commune,
                    user.location.region,
                    user.location.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}

            {user.bio && (
              <p className="text-gray-700 mb-3 line-clamp-2 text-sm">{user.bio}</p>
            )}

            {/* Statistiques likes/dislikes */}
            {showStats && user.stats && (
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex items-center space-x-1.5 bg-white border-2 border-green-500 rounded-full px-2.5 py-1 flex-shrink-0">
                  <IoThumbsUp size={16} className="text-green-500" />
                  <span className="text-xs font-semibold text-gray-900">{user.stats.likes || 0}</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-white border-2 border-red-500 rounded-full px-2.5 py-1 flex-shrink-0">
                  <IoThumbsDown size={16} className="text-red-500" />
                  <span className="text-xs font-semibold text-gray-900">{user.stats.dislikes || 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-center space-x-6 pt-4 border-t border-gray-200 flex-shrink-0 ${hideSuperlike ? 'space-x-8' : ''}`}>
            <button
              onClick={() => {
                if (isMatched) return;
                setExitX(-1000);
                onSwipe('left');
                setTimeout(() => onSwipeComplete?.(), 300);
              }}
              disabled={isMatched}
              className={`p-4 rounded-full transition-colors ${
                isMatched 
                  ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <IoClose size={28} className="text-gray-700" />
            </button>
            {!hideSuperlike && (
              <button
                onClick={() => {
                  if (isMatched) return;
                  setExitY(-1000);
                  onSwipe('up');
                  setTimeout(() => onSwipeComplete?.(), 300);
                }}
                disabled={isMatched}
                className={`p-4 rounded-full transition-colors ${
                  isMatched 
                    ? 'bg-secondary-100 cursor-not-allowed opacity-50' 
                    : 'bg-secondary-100 hover:bg-secondary-200'
                }`}
              >
                <IoStar size={28} className="text-secondary-600" />
              </button>
            )}
            <button
              onClick={() => {
                if (isMatched) return;
                setExitX(1000);
                onSwipe('right');
                setTimeout(() => onSwipeComplete?.(), 300);
              }}
              disabled={isMatched}
              className={`p-4 rounded-full transition-colors ${
                isMatched 
                  ? 'bg-red-100 cursor-not-allowed' 
                  : 'bg-primary-100 hover:bg-primary-200'
              }`}
            >
              <IoHeart 
                size={28} 
                className={isMatched ? 'text-red-600' : ''}
                style={!isMatched ? { 
                  background: 'linear-gradient(to right, #F26E27, #FFFFFF, #12C43F)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#F26E27'
                } : { color: '#dc2626' }}
              />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

