import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { messageService } from '@/services/messageService';
import { socketService } from '@/services/socketService';
import { useSubscription } from '@/hooks/useSubscription';
import { formatRelativeTime } from '@/utils/helpers';
import { IoPaperPlane, IoImage, IoClose } from 'react-icons/io5';
import { User } from '@/types';
import toast from 'react-hot-toast';

interface ChatWindowProps {
  otherUser: User;
  onClose: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ otherUser, onClose }) => {
  const { user } = useAuthStore();
  const { checkLimit } = useSubscription();
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = user && otherUser 
    ? [user.id, otherUser.id].sort().join('_')
    : null;

  useEffect(() => {
    if (conversationId) {
      // S'assurer que le socket est connecté
      socketService.connect();
      loadMessages();
      // Attendre un peu pour que le socket soit prêt
      setTimeout(() => {
        socketService.joinConversation(conversationId);
      }, 300);
    }
    return () => {
      if (conversationId) {
        socketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    // S'assurer que le socket est connecté
    socketService.connect();
    
    let cleanup: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Attendre que le socket soit disponible
    const setupListeners = (): (() => void) | void => {
      const socket = socketService.getSocket();
      if (!socket) {
        timeoutId = setTimeout(setupListeners, 200);
        return;
      }

      const handleNewMessage = (message: any) => {
        if (message.conversationId === conversationId) {
          setMessages((prev) => {
            // Éviter les doublons
            if (prev.find((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          scrollToBottom();
        }
      };

      const handleMessageSent = (message: any) => {
        if (message.conversationId === conversationId) {
          setMessages((prev) => {
            // Éviter les doublons
            if (prev.find((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });
          scrollToBottom();
        }
      };

      socket.on('message:new', handleNewMessage);
      socket.on('message:sent', handleMessageSent);
      
      cleanup = () => {
        socket.off('message:new', handleNewMessage);
        socket.off('message:sent', handleMessageSent);
      };
    };

    setupListeners();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !previewImage) || !user || !otherUser) return;

    // En développement : ne pas bloquer l'envoi de messages
    // La vérification sera faite côté backend qui autorise tout en développement
    if (!import.meta.env.DEV) {
      // Vérifier les limites en production uniquement
      const limit = await checkLimit();
      if (!limit.canSend) {
        if (limit.remaining === 0) {
          toast.error('Limite de messages atteinte');
        } else {
          toast.error(`Il vous reste ${limit.remaining} message(s)`);
        }
        return;
      }
    }

    try {
      let sentMessage;
      if (previewImage) {
        sentMessage = await messageService.sendMessage(otherUser.id, messageText || 'Photo', 'image', previewImage);
        setPreviewImage(null);
      } else {
        sentMessage = await messageService.sendMessage(otherUser.id, messageText);
      }
      
      // Ajouter le message immédiatement à l'interface
      if (sentMessage) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === sentMessage.id)) {
            return prev;
          }
          return [...prev, sentMessage];
        });
        scrollToBottom();
      }
      
      setMessageText('');
      
      // Recharger les messages pour s'assurer qu'on a la dernière version
      setTimeout(() => loadMessages(), 300);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
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

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-50">
        <div className="flex items-center space-x-3">
          {otherUser.photos && otherUser.photos.length > 0 && (
            <img
              src={(() => {
                const photo = otherUser.photos[0];
                return photo.startsWith('http') 
                  ? photo 
                  : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
              })()}
              alt={otherUser.firstName}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{otherUser.firstName}</h3>
            <p className="text-xs text-gray-500">En ligne</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <IoClose size={24} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="text-center text-gray-500">Chargement...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-2">Envoyez le premier message !</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id;
            const isImage = message.type === 'image' && message.imageUrl;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {isImage ? (
                    <div>
                      <img
                        src={(() => {
                          const imgUrl = message.imageUrl || '';
                          return imgUrl.startsWith('http') 
                            ? imgUrl 
                            : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${imgUrl}`;
                        })()}
                        alt="Message photo"
                        className="max-w-full h-auto rounded-lg mb-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Image';
                        }}
                      />
                      {message.content && message.content !== 'Photo' && (
                        <p className="mt-2">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-primary-100' : 'text-gray-500'
                    }`}
                  >
                    {formatRelativeTime(message.timestamp)}
                    {isOwn && message.read && (
                      <span className="ml-1">✓✓</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {previewImage && (
          <div className="mb-3 relative">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-xs h-32 object-cover rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-1 bg-primary-600 text-white rounded-full hover:bg-primary-700"
            >
              <IoClose size={16} />
            </button>
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
            className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoPaperPlane size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

