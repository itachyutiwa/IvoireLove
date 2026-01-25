import React, { useState } from 'react';
import { IoLocation, IoClose } from 'react-icons/io5';
import { isMobile, isIOS, isAndroid } from '@/utils/platform';

interface LocationMessageProps {
  lat: number;
  lng: number;
  isOwn: boolean;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({ lat, lng, isOwn }) => {
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&markers=color:0x${isOwn ? 'F26E27' : '12C43F'}%7C${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`;
  
  const handleClick = () => {
    if (isMobile()) {
      setShowMobileOptions(true);
    } else {
      // Sur desktop, ouvrir directement dans le navigateur
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleOpenGoogleMaps = () => {
    // Essayer d'ouvrir l'app, sinon ouvrir dans le navigateur
    if (isIOS() || isAndroid()) {
      const appUrl = isIOS() 
        ? `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=14`
        : `geo:${lat},${lng}?q=${lat},${lng}`;
      
      // Essayer d'ouvrir l'app
      window.location.href = appUrl;
      
      // Si l'app n'est pas installée, ouvrir dans le navigateur après un délai
      setTimeout(() => {
        window.open(googleMapsUrl, '_blank');
      }, 500);
    } else {
      window.open(googleMapsUrl, '_blank');
    }
    setShowMobileOptions(false);
  };

  const handleOpenWaze = () => {
    window.location.href = wazeUrl;
    setShowMobileOptions(false);
  };

  const handleOpenBrowser = () => {
    window.open(googleMapsUrl, '_blank');
    setShowMobileOptions(false);
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="cursor-pointer rounded-lg overflow-hidden hover:opacity-90 transition-opacity bg-white shadow-sm"
        style={{ maxWidth: '100%', width: '100%' }}
      >
        {/* Carte statique ou iframe */}
        <div className="relative w-full h-48 bg-gray-200">
          {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
            <img
              src={staticMapUrl}
              alt="Position sur la carte"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback vers OpenStreetMap si l'image ne charge pas
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const iframe = document.createElement('iframe');
                  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
                  iframe.width = '100%';
                  iframe.height = '100%';
                  iframe.style.border = 'none';
                  iframe.setAttribute('loading', 'lazy');
                  iframe.setAttribute('title', 'Position sur la carte');
                  parent.appendChild(iframe);
                }
              }}
            />
          ) : (
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              loading="lazy"
              title="Position sur la carte"
            />
          )}
          
          {/* Overlay avec icône de localisation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`${isOwn ? 'bg-[#F26E27]' : 'bg-white'} px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2`}>
              <IoLocation className={isOwn ? 'text-white' : 'text-[#F26E27]'} size={20} />
              <span className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                {isMobile() ? 'Ouvrir la localisation' : 'Voir sur la carte'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Informations en bas - style WhatsApp */}
        <div className={`px-3 py-2.5 ${isOwn ? 'bg-[#F26E27]' : 'bg-white'}`}>
          <div className="flex items-center space-x-2">
            <IoLocation className={isOwn ? 'text-white' : 'text-[#F26E27]'} size={16} />
            <p className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-900'}`}>
              Ma position actuelle
            </p>
          </div>
          <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Modal pour les options mobiles */}
      {showMobileOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50" onClick={() => setShowMobileOptions(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ouvrir la localisation</h3>
              <button
                onClick={() => setShowMobileOptions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <IoClose size={24} />
              </button>
            </div>
            
            <button
              onClick={handleOpenGoogleMaps}
              className="w-full flex items-center space-x-3 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F26E27] transition-colors text-left"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <IoLocation className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Google Maps</p>
                <p className="text-xs text-gray-500">Ouvrir dans l'application</p>
              </div>
            </button>

            <button
              onClick={handleOpenWaze}
              className="w-full flex items-center space-x-3 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F26E27] transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">W</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Waze</p>
                <p className="text-xs text-gray-500">Ouvrir dans l'application</p>
              </div>
            </button>

            <button
              onClick={handleOpenBrowser}
              className="w-full flex items-center space-x-3 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#F26E27] transition-colors text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <IoLocation className="text-gray-600" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Navigateur web</p>
                <p className="text-xs text-gray-500">Ouvrir dans le navigateur</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

