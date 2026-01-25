import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { userService } from '@/services/userService';
import { messageService } from '@/services/messageService';
import { socketService } from '@/services/socketService';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { User } from '@/types';
import { getAge, formatRelativeTime } from '@/utils/helpers';
import { ContactActions } from '@/components/contact/ContactActions';
import { LocationMessage } from '@/components/chat/LocationMessage';
import { MessagingMenu } from '@/components/contact/MessagingMenu';
import { IoChatbubbles, IoPaperPlane, IoImage, IoLocation, IoClose, IoThumbsUp, IoThumbsDown } from 'react-icons/io5';
import toast from 'react-hot-toast';

export const Matches: React.FC = () => {
  const { user } = useAuthStore();

  // Vérification de sécurité
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Veuillez vous connecter</p>
      </div>
    );
  }

  const {
    conversations = [],
    messages = {},
    isLoading: isLoadingMessages = false,
    setCurrentConversation,
    loadMessages,
    markAsRead,
  } = useMessageStore();
  const { checkLimit } = useSubscription();
  const [matches, setMatches] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<User | null>(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [showMessagingMenu, setShowMessagingMenu] = useState(false);
  const [messagingMenuMatch, setMessagingMenuMatch] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
    socketService.connect();
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Recharger les matchs quand on revient sur la page
  useEffect(() => {
    const handleFocus = () => {
      loadMatches();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Charger les conversations au démarrage
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await messageService.getConversations();
        useMessageStore.getState().setConversations(data);
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };
    loadConversations();
  }, []);

  // Gérer la conversation sélectionnée
  useEffect(() => {
    if (!selectedMatch || !user || !showChatWindow) {
      return;
    }

    const setupConversation = async () => {
      try {
        // Trouver la conversation avec ce match
        const conversation = conversations.find((c) => {
          if (!c.participants || !Array.isArray(c.participants)) return false;
          const otherUserId = c.participants.find((id) => id !== user.id);
          return otherUserId === selectedMatch.id;
        });

        // Créer ou utiliser l'ID de conversation
        const conversationId = conversation
          ? conversation.id
          : [user.id, selectedMatch.id].sort().join('_');

        setSelectedConversationId(conversationId);

        // Charger les messages même si la conversation n'existe pas encore dans la liste
        try {
          await loadMessages(conversationId);
        } catch (error: any) {
          console.error('Error loading messages:', error);
          // Si l'erreur est 404 ou 400, c'est normal pour une nouvelle conversation
          if (error?.response?.status !== 404 && error?.response?.status !== 400) {
            console.warn('Could not load messages, but continuing anyway');
          }
        }

        // Rejoindre la conversation via socket
        try {
          if (socketService && typeof socketService.joinConversation === 'function') {
            socketService.joinConversation(conversationId);
          }
        } catch (error) {
          console.error('Error joining conversation:', error);
        }

        // Marquer comme lu si la conversation existe
        if (conversation) {
          try {
            setCurrentConversation(conversationId);
            await markAsRead(conversationId);
          } catch (error) {
            console.error('Error marking as read:', error);
          }
        }
      } catch (error) {
        console.error('Error in conversation setup:', error);
        // Ne pas bloquer l'affichage en cas d'erreur
      }
    };

    setupConversation();
  }, [selectedMatch?.id, user?.id, showChatWindow, conversations.length]);

  // Scroll automatique
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversationId && messages[selectedConversationId]) {
      setTimeout(() => scrollToBottom(), 200);
    }
  }, [messages, selectedConversationId]);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getMatches();
      // Charger les statistiques pour chaque match
      const matchesWithStats = await Promise.all(
        (data || []).map(async (match) => {
          try {
            const stats = await userService.getUserStats(match.id);
            return { ...match, stats };
          } catch (error) {
            console.error(`Error loading stats for match ${match.id}:`, error);
            return { ...match, stats: { likes: 0, dislikes: 0 } };
          }
        })
      );
      setMatches(matchesWithStats);
    } catch (error: any) {
      console.error('Error loading matches:', error);
      toast.error('Erreur lors du chargement des matchs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagingClick = (match: User) => {
    setMessagingMenuMatch(match);
    setShowMessagingMenu(true);
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !previewImage) || !selectedMatch || !user) return;

    if (import.meta.env.DEV) {
      // En développement, on laisse le backend gérer
    } else {
      const limit = await checkLimit();
      if (!limit.canSend) {
        if (limit.remaining === 0) {
          setShowSubscriptionModal(true);
        } else {
          toast.error(`Il vous reste ${limit.remaining} message(s)`);
        }
        return;
      }
    }

    try {
      let sentMessage: any = null;
      if (previewImage) {
        sentMessage = await messageService.sendMessage(selectedMatch.id, messageText || 'Photo', 'image', previewImage);
        setPreviewImage(null);
      } else {
        sentMessage = await messageService.sendMessage(selectedMatch.id, messageText);
      }

      if (sentMessage && selectedConversationId) {
        const { addMessage } = useMessageStore.getState();
        if (!sentMessage.conversationId && selectedConversationId) {
          sentMessage.conversationId = selectedConversationId;
        }
        addMessage(sentMessage);
        setTimeout(() => scrollToBottom(), 100);
      }

      setMessageText('');

      if (selectedConversationId) {
        setTimeout(async () => {
          try {
            await loadMessages(selectedConversationId);
            setTimeout(() => scrollToBottom(), 200);
          } catch (err) {
            console.error('Error reloading messages:', err);
          }
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi';
      if (import.meta.env.DEV && errorMessage.includes('Limite de messages')) {
        console.warn('Message limit error ignored in development:', errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await messageService.uploadMessagePhoto(file);
      const fullUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${imageUrl}`;
      setPreviewImage(fullUrl);
    } catch (error: any) {
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleShareLocation = async () => {
    if (!selectedMatch || !user) return;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            const locationText = `📍 Ma position actuelle: ${locationUrl}`;

            try {
              const sentMessage = await messageService.sendMessage(selectedMatch.id, locationText);
              if (sentMessage && selectedConversationId) {
                const { addMessage } = useMessageStore.getState();
                if (!sentMessage.conversationId && selectedConversationId) {
                  sentMessage.conversationId = selectedConversationId;
                }
                addMessage(sentMessage);
                setTimeout(() => scrollToBottom(), 100);
              }
              toast.success('Position partagée');
            } catch (error: any) {
              toast.error('Erreur lors du partage de la position');
            }
          },
          (_error) => {
            toast.error('Impossible d\'obtenir votre position');
          }
        );
      } else {
        toast.error('La géolocalisation n\'est pas disponible');
      }
    } catch (error) {
      toast.error('Erreur lors du partage de la position');
    }
  };

  const conversationMessages = selectedConversationId
    ? (messages[selectedConversationId] || [])
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des matchs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Vos Matchs</h1>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-600 mb-4">
            Vous n'avez pas encore de matchs
          </p>
          <p className="text-gray-500">
            Continuez à swiper pour trouver votre match !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-gradient-to-br from-white via-primary-50 to-secondary-50 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all border-2 border-primary-200 hover:border-primary-400 flex flex-col"
              style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}
            >
              <div className="relative flex-shrink-0" style={{ height: '300px' }}>
                <img
                  src={(() => {
                    if (!match.photos || match.photos.length === 0) {
                      return 'https://via.placeholder.com/300x400?text=Photo';
                    }
                    const photo = match.photos[0];
                    return photo.startsWith('http')
                      ? photo
                      : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                  })()}
                  alt={match.firstName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Photo';
                  }}
                />
                {match.verified && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                    Vérifié
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {match.firstName}, {getAge(match.dateOfBirth)}
                    </h2>
                    {match.isOnline !== undefined && (
                      <div className="relative flex-shrink-0">
                        {match.isOnline ? (
                          <>
                            <div
                              className="w-3 h-3 bg-green-500 rounded-full"
                              style={{
                                filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.8))',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                              }}
                              title="En ligne"
                            />
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            </span>
                          </>
                        ) : (
                          <div
                            className="w-3 h-3 bg-red-500 rounded-full"
                            style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}
                            title="Hors ligne"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  {match.location && (
                    <p className="text-sm text-gray-600 mb-3">
                      {match.location.city || match.location.region || 'Ville inconnue'}
                    </p>
                  )}

                  {/* Statistiques likes/dislikes */}
                  {match.stats && (
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-1.5 bg-white border-2 border-green-500 rounded-full px-2.5 py-1 flex-shrink-0">
                        <IoThumbsUp size={16} className="text-green-500" />
                        <span className="text-xs font-semibold text-gray-900">{match.stats.likes || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 bg-white border-2 border-red-500 rounded-full px-2.5 py-1 flex-shrink-0">
                        <IoThumbsDown size={16} className="text-red-500" />
                        <span className="text-xs font-semibold text-gray-900">{match.stats.dislikes || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions de contact */}
                  <div className="mb-3">
                    <ContactActions phone={match.phone} matchName={match.firstName} />
                  </div>
                </div>

                <div className="flex space-x-2 flex-shrink-0 mt-auto pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleMessagingClick(match)}
                    className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  >
                    <IoChatbubbles size={18} />
                    <span>Messagerie</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const lat = position.coords.latitude;
                              const lng = position.coords.longitude;
                              const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                              const locationText = `📍 Ma position actuelle: ${locationUrl}`;

                              try {
                                await messageService.sendMessage(match.id, locationText);
                                toast.success('Position partagée');
                              } catch (error: any) {
                                toast.error('Erreur lors du partage de la position');
                              }
                            },
                            (_error) => {
                              toast.error('Impossible d\'obtenir votre position');
                            }
                          );
                        } else {
                          toast.error('La géolocalisation n\'est pas disponible');
                        }
                      } catch (error) {
                        toast.error('Erreur lors du partage de la position');
                      }
                    }}
                    className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors flex items-center justify-center"
                    title="Partager ma position"
                  >
                    <IoLocation size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fenêtre de chat complète */}
      {showChatWindow && selectedMatch && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowChatWindow(false);
              setSelectedMatch(null);
              setSelectedConversationId(null);
              if (selectedConversationId) {
                socketService.leaveConversation(selectedConversationId);
              }
            }}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 rounded-lg">
                {/* En-tête de la conversation */}
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedMatch.photos && selectedMatch.photos.length > 0 ? (
                      <img
                        src={(() => {
                          const photo = selectedMatch.photos[0];
                          return photo.startsWith('http')
                            ? photo
                            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                        })()}
                        alt={selectedMatch.firstName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">${selectedMatch.firstName.charAt(0).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">
                        {selectedMatch.firstName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {`${selectedMatch.firstName} ${selectedMatch.lastName || ''}`}
                        </h2>
                        {selectedMatch.dateOfBirth && (
                          <p className="text-sm text-gray-500">
                            {getAge(selectedMatch.dateOfBirth)} ans
                          </p>
                        )}
                      </div>
                      {selectedMatch.isOnline !== undefined && (
                        <div className="relative">
                          {selectedMatch.isOnline ? (
                            <>
                              <div
                                className="w-3 h-3 bg-green-500 rounded-full"
                                style={{
                                  filter: 'drop-shadow(0 0 2px rgba(34, 197, 94, 0.8))',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                }}
                                title="En ligne"
                              />
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              </span>
                            </>
                          ) : (
                            <div
                              className="w-3 h-3 bg-red-500 rounded-full"
                              style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}
                              title="Hors ligne"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowChatWindow(false);
                      setSelectedMatch(null);
                      setSelectedConversationId(null);
                      if (selectedConversationId) {
                        socketService.leaveConversation(selectedConversationId);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IoClose size={24} />
                  </button>
                </div>

                {/* Zone de messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                  {isLoadingMessages ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26E27] mx-auto mb-4"></div>
                      <p>Chargement des messages...</p>
                    </div>
                  ) : conversationMessages && conversationMessages.length > 0 ? (
                    <>
                      {conversationMessages.map((message) => {
                        if (!message || !message.id) return null;

                        const isOwn = message.senderId === user?.id;
                        const isImage = message.type === 'image' && message.imageUrl;

                        // Détecter si c'est un message de position
                        const locationMatch = message.content?.match(/📍 Ma position actuelle: https:\/\/www\.google\.com\/maps\?q=([\d.-]+),([\d.-]+)/);
                        const isLocation = locationMatch !== null;
                        const locationLat = locationMatch ? parseFloat(locationMatch[1]) : null;
                        const locationLng = locationMatch ? parseFloat(locationMatch[2]) : null;

                        return (
                          <div
                            key={message.id}
                            className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md rounded-2xl shadow-sm ${isOwn
                                ? 'bg-[#F26E27] text-white rounded-tr-sm shadow-md'
                                : 'bg-white text-gray-900 border-2 border-secondary-200 rounded-tl-sm shadow-sm'
                                } ${isLocation ? 'p-0' : 'px-4 py-2'}`}
                            >
                              {isLocation && locationLat && locationLng ? (
                                <>
                                  <LocationMessage lat={locationLat} lng={locationLng} isOwn={isOwn} />
                                  {message.timestamp && (
                                    <div className={`px-3 py-1.5 ${isOwn ? 'bg-primary-700' : 'bg-gray-100'}`}>
                                      <p
                                        className={`text-xs flex items-center ${isOwn ? 'text-primary-100' : 'text-gray-500'
                                          }`}
                                      >
                                        <span>{formatRelativeTime(message.timestamp)}</span>
                                        {isOwn && message.read && (
                                          <span className="ml-1" title="Lu">✓✓</span>
                                        )}
                                        {isOwn && !message.read && (
                                          <span className="ml-1 text-primary-200" title="Envoyé">✓</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </>
                              ) : isImage ? (
                                <>
                                  <div className="space-y-1">
                                    <img
                                      src={(() => {
                                        try {
                                          const imgUrl = message.imageUrl || '';
                                          return imgUrl.startsWith('http')
                                            ? imgUrl
                                            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${imgUrl}`;
                                        } catch (err) {
                                          console.error('Error building image URL:', err);
                                          return 'https://via.placeholder.com/300x300?text=Image';
                                        }
                                      })()}
                                      alt="Message photo"
                                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                                      onClick={(e) => {
                                        const img = e.currentTarget;
                                        const newWindow = window.open('', '_blank');
                                        if (newWindow) {
                                          newWindow.document.write(`
                                        <html>
                                          <head><title>Image</title></head>
                                          <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                            <img src="${img.src}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                                          </body>
                                        </html>
                                      `);
                                        }
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Image';
                                      }}
                                    />
                                    {message.content && message.content !== 'Photo' && (
                                      <p className="mt-2">{message.content}</p>
                                    )}
                                  </div>
                                  {message.timestamp && (
                                    <p
                                      className={`text-xs mt-1 flex items-center ${isOwn ? 'text-primary-100' : 'text-gray-500'
                                        }`}
                                    >
                                      <span>{formatRelativeTime(message.timestamp)}</span>
                                      {isOwn && message.read && (
                                        <span className="ml-1" title="Lu">✓✓</span>
                                      )}
                                      {isOwn && !message.read && (
                                        <span className="ml-1 text-primary-200" title="Envoyé">✓</span>
                                      )}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="whitespace-pre-wrap break-words">{message.content || ''}</p>
                                  {message.timestamp && (
                                    <p
                                      className={`text-xs mt-1 flex items-center ${isOwn ? 'text-primary-100' : 'text-gray-500'
                                        }`}
                                    >
                                      <span>{formatRelativeTime(message.timestamp)}</span>
                                      {isOwn && message.read && (
                                        <span className="ml-1" title="Lu">✓✓</span>
                                      )}
                                      {isOwn && !message.read && (
                                        <span className="ml-1 text-primary-200" title="Envoyé">✓</span>
                                      )}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>Aucun message pour le moment</p>
                      <p className="text-sm mt-2">Envoyez le premier message !</p>
                    </div>
                  )}
                </div>

                {/* Zone de saisie */}
                <div className="bg-white border-t border-gray-200 p-4">
                  {previewImage && (
                    <div className="mb-3 relative inline-block">
                      <div className="relative">
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="max-w-xs max-h-48 rounded-lg object-cover border-2 border-primary-300"
                        />
                        <button
                          onClick={() => setPreviewImage(null)}
                          className="absolute -top-2 -right-2 p-1 bg-[#F26E27] text-white rounded-full hover:bg-[#c2581f] shadow-lg transition-colors"
                          title="Supprimer l'image"
                        >
                          <IoClose size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Ajouter une photo"
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                      ) : (
                        <IoImage size={20} />
                      )}
                    </button>
                    <button
                      onClick={handleShareLocation}
                      className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Partager ma position"
                    >
                      <IoLocation size={20} />
                    </button>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={previewImage ? "Ajouter un message (optionnel)..." : "Tapez un message..."}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={(!messageText.trim() && !previewImage) || uploadingImage}
                      className="p-3 bg-[#F26E27] text-white rounded-lg hover:bg-[#c2581f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <IoPaperPlane size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu de messagerie */}
      {showMessagingMenu && messagingMenuMatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowMessagingMenu(false);
              setMessagingMenuMatch(null);
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <MessagingMenu
                userId={messagingMenuMatch.id}
                phone={messagingMenuMatch.phone}
                matchName={messagingMenuMatch.firstName}
                otherUser={messagingMenuMatch}
                onClose={() => {
                  setShowMessagingMenu(false);
                  setMessagingMenuMatch(null);
                }}
                onDirectMessage={(user) => {
                  setSelectedMatch(user);
                  setShowChatWindow(true);
                  setShowMessagingMenu(false);
                  setMessagingMenuMatch(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

