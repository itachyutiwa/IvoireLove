import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { messageService } from '@/services/messageService';
import { userService } from '@/services/userService';
import { socketService } from '@/services/socketService';
import { moderationService } from '@/services/moderationService';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { MessagingMenu } from '@/components/contact/MessagingMenu';
import { Modal } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/utils/helpers';
import { User } from '@/types';
import { IoPaperPlane, IoSearch, IoImage, IoClose, IoLocation, IoAdd, IoChevronDown, IoEllipsisVertical, IoMic } from 'react-icons/io5';
import { LocationMessage } from '@/components/chat/LocationMessage';
import toast from 'react-hot-toast';

export const Messages: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    isLoading: isLoadingMessages,
    setCurrentConversation,
    loadMessages,
    markAsRead,
  } = useMessageStore();
  
  // Gestion d'erreur globale pour éviter les écrans blancs
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Veuillez vous connecter</p>
        </div>
      </div>
    );
  }
  const { checkLimit } = useSubscription();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [showMessagingMenu, setShowMessagingMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const RISK_FLAG_THRESHOLD = 40;
  const [showConversationActions, setShowConversationActions] = useState(false);
  const conversationActionsRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('scam');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await loadConversations();
        socketService.connect();
      } catch (err: any) {
        console.error('Error initializing Messages page:', err);
        setError(err.message || 'Erreur lors du chargement');
      }
    };
    init();
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Fermer le menu "+" si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le menu "˅" des messages si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target as Node)) {
        setOpenMessageMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le menu actions conversation si clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (conversationActionsRef.current && !conversationActionsRef.current.contains(event.target as Node)) {
        setShowConversationActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Marquer comme lu immédiatement quand une conversation est sélectionnée
  useEffect(() => {
    if (selectedConversationId) {
      // Marquer comme lu immédiatement
      (markAsRead(selectedConversationId) as Promise<void>).catch((err: any) => {
        console.error('Error marking as read:', err);
      });
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    
    const loadConversationData = async () => {
      try {
        // Attendre que les conversations soient chargées si nécessaire
        let conversation = conversations.find((c) => c.id === selectedConversationId);
        
        // Si la conversation n'est pas trouvée, recharger les conversations
        if (!conversation && conversations.length === 0) {
          await loadConversations();
          conversation = useMessageStore.getState().conversations.find((c) => c.id === selectedConversationId);
        }
        
        if (conversation) {
          setCurrentConversation(selectedConversationId);
          
          // Charger les messages immédiatement et forcer le rechargement
          try {
            console.log('Loading messages for conversation:', selectedConversationId);
            await loadMessages(selectedConversationId);
            console.log('Messages loaded, scrolling to bottom...');
            // Scroll vers le bas après le chargement
            setTimeout(() => {
              scrollToBottom();
            }, 500);
          } catch (error: any) {
            console.error('Error loading messages:', error);
            toast.error('Erreur lors du chargement des messages: ' + (error.message || 'Erreur inconnue'));
          }
          
          socketService.joinConversation(selectedConversationId);
          // Marquer comme lu
          (markAsRead(selectedConversationId) as Promise<void>).catch((err: any) => {
            console.error('Error marking as read:', err);
          });
          
          // Charger les infos de l'autre utilisateur
          const otherUserId = conversation.participants?.find((id) => id !== user?.id);
          if (otherUserId) {
            // Si les infos sont déjà dans la conversation, les utiliser
            if (conversation.otherUser) {
              setOtherUser({
                id: conversation.otherUser.id,
                firstName: conversation.otherUser.firstName || '',
                lastName: conversation.otherUser.lastName || '',
                phone: undefined,
              } as User);
            }
            // Toujours essayer de charger depuis les matchs pour avoir le phone
            loadOtherUserInfo(otherUserId).catch((err) => {
              console.error('Error loading other user info:', err);
            });
          }
        } else {
          console.warn('Conversation not found:', selectedConversationId);
          toast.error('Conversation introuvable');
        }
      } catch (error: any) {
        console.error('Error in conversation selection effect:', error);
        toast.error('Erreur lors de la sélection de la conversation: ' + (error.message || 'Erreur inconnue'));
      }
    };
    
    loadConversationData();
    
    return () => {
      if (selectedConversationId) {
        socketService.leaveConversation(selectedConversationId);
      }
    };
  }, [selectedConversationId, conversations.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const otherUserInfo = conv.otherUser;
    
    // Rechercher dans le nom
    if (otherUserInfo) {
      const fullName = `${otherUserInfo.firstName} ${otherUserInfo.lastName}`.toLowerCase();
      if (fullName.includes(query)) return true;
    }
    
    // Rechercher dans le contenu du dernier message
    if (conv.lastMessage?.content) {
      if (conv.lastMessage.content.toLowerCase().includes(query)) return true;
    }
    
    return false;
  });

  const conversationMessages = selectedConversationId
    ? (messages[selectedConversationId] || [])
    : [];

  const getRiskWarning = (riskScore?: number, riskFlags?: string[]) => {
    const score = typeof riskScore === 'number' ? riskScore : 0;
    if (score < RISK_FLAG_THRESHOLD) return null;
    const flags = (riskFlags || []).slice(0, 2).join(', ');
    return {
      label: score >= 85 ? 'Message bloqué' : 'Message potentiellement suspect',
      details: flags ? `Signaux: ${flags}` : undefined,
    };
  };

  // Debug: afficher les messages chargés
  useEffect(() => {
    if (selectedConversationId) {
      console.log('=== DEBUG MESSAGES ===');
      console.log('Selected conversation ID:', selectedConversationId);
      console.log('Messages in store:', messages);
      console.log('Messages for this conversation:', messages[selectedConversationId]);
      console.log('Conversation messages array:', conversationMessages);
      console.log('Number of messages:', conversationMessages.length);
      console.log('=====================');
    }
  }, [selectedConversationId, messages, conversationMessages]);

  // Scroll automatique vers le bas quand les messages changent
  useEffect(() => {
    if (conversationMessages.length > 0 && selectedConversationId) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    }
  }, [conversationMessages.length, selectedConversationId]);

  const loadOtherUserInfo = async (userId: string) => {
    try {
      // Récupérer depuis les matchs (qui contiennent le phone)
      const matches = await userService.getMatches();
      const match = matches.find((m) => m.id === userId);
      if (match) {
        setOtherUser(match);
      } else {
        // Si pas dans les matchs, récupérer le profil de base
        // Pour l'instant, on crée un objet minimal
        setOtherUser({ id: userId, phone: undefined } as User);
      }
    } catch (error) {
      console.error('Error loading other user info:', error);
    }
  };

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await messageService.getConversations();
      useMessageStore.getState().setConversations(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedOtherUserId = () => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find((c) => c.id === selectedConversationId);
    if (!conversation?.participants?.length) return null;
    return conversation.participants.find((id) => id !== user?.id) || null;
  };

  const handleBlockUser = async () => {
    const otherUserId = getSelectedOtherUserId();
    if (!otherUserId) return;
    const ok = window.confirm("Bloquer cet utilisateur ? Vous ne verrez plus vos conversations ni profils respectifs.");
    if (!ok) return;

    try {
      setIsBlockingUser(true);
      await moderationService.blockUser(otherUserId);
      toast.success('Utilisateur bloqué');
      setShowConversationActions(false);
      setSelectedConversationId(null);
      await loadConversations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du blocage');
    } finally {
      setIsBlockingUser(false);
    }
  };

  const handleSubmitReport = async () => {
    const otherUserId = getSelectedOtherUserId();
    if (!otherUserId || !selectedConversationId) return;
    try {
      setIsSubmittingReport(true);
      await moderationService.reportUser({
        reportedUserId: otherUserId,
        reason: reportReason,
        details: reportDetails,
        conversationId: selectedConversationId,
      });
      toast.success('Signalement envoyé');
      setShowReportModal(false);
      setReportDetails('');
      setShowConversationActions(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du signalement');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !previewImage && !previewVoice) || !selectedConversationId || !user) return;

    // Trouver la conversation
    const conversation = conversations.find((c) => c.id === selectedConversationId);
    if (!conversation) return;

    // En développement : ne pas bloquer l'envoi de messages
    // La vérification sera faite côté backend qui créera automatiquement un abonnement si nécessaire
    if (import.meta.env.DEV) {
      // On laisse le backend gérer la vérification et la création d'abonnement
    } else {
      // Vérifier les limites en production
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

    const receiverId = conversation.participants.find((id) => id !== user.id);
    if (!receiverId) return;

    try {
      let sentMessage: any = null;
      if (previewImage) {
        // Envoyer une image
        sentMessage = await messageService.sendMessage(receiverId, messageText || 'Photo', 'image', previewImage, {
          replyToMessageId: replyToMessage?.id,
        });
        setPreviewImage(null);
      } else if (previewVoice) {
        sentMessage = await messageService.sendMessage(receiverId, messageText || 'Message vocal', 'audio', undefined, {
          voiceUrl: previewVoice,
          replyToMessageId: replyToMessage?.id,
        });
        setPreviewVoice(null);
      } else {
        // Envoyer un message texte
        sentMessage = await messageService.sendMessage(receiverId, messageText, 'text', undefined, {
          replyToMessageId: replyToMessage?.id,
        });
      }
      
      console.log('Message sent successfully:', sentMessage);
      
      // Ajouter le message immédiatement au store pour affichage instantané
      if (sentMessage && selectedConversationId) {
        const { addMessage } = useMessageStore.getState();
        // S'assurer que le message a le conversationId
        if (!sentMessage.conversationId && selectedConversationId) {
          sentMessage.conversationId = selectedConversationId;
        }
        addMessage(sentMessage);
        setTimeout(() => scrollToBottom(), 100);
      }
      
      setMessageText('');
      setReplyToMessage(null);
      
      // Recharger les messages depuis le serveur pour avoir la version complète
      if (selectedConversationId) {
        setTimeout(async () => {
          try {
            console.log('Reloading messages after send...');
            await loadMessages(selectedConversationId);
            setTimeout(() => {
              scrollToBottom();
            }, 200);
          } catch (err) {
            console.error('Error reloading messages:', err);
          }
        }, 500);
      }
    } catch (error: any) {
      // En développement, ne pas afficher les erreurs de limite de messages
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi';
      if (import.meta.env.DEV && errorMessage.includes('Limite de messages')) {
        // En développement, ignorer cette erreur car les messages sont illimités
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
      // Construire l'URL complète
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

  const handleVoiceSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier audio doit faire moins de 5MB');
      return;
    }

    setUploadingVoice(true);
    try {
      const voiceUrl = await messageService.uploadVoice(file);
      const fullUrl = voiceUrl.startsWith('http')
        ? voiceUrl
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${voiceUrl}`;
      setPreviewVoice(fullUrl);
    } catch (_error: any) {
      toast.error("Erreur lors de l'upload de l'audio");
    } finally {
      setUploadingVoice(false);
      if (voiceInputRef.current) {
        voiceInputRef.current.value = '';
      }
    }
  };

  const handleShareLocation = async () => {
    if (!selectedConversationId || !user) return;

    const conversation = conversations.find((c) => c.id === selectedConversationId);
    if (!conversation) return;

    const receiverId = conversation.participants.find((id) => id !== user.id);
    if (!receiverId) return;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            const locationText = `📍 Ma position actuelle: ${locationUrl}`;

            try {
              const sentMessage = await messageService.sendMessage(receiverId, locationText);
              if (sentMessage && selectedConversationId) {
                const { addMessage } = useMessageStore.getState();
                if (!sentMessage.conversationId && selectedConversationId) {
                  sentMessage.conversationId = selectedConversationId;
                }
                addMessage(sentMessage);
                setTimeout(() => scrollToBottom(), 100);
              }
              toast.success('Position partagée');
            } catch (_err: any) {
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
    } catch (_error) {
      toast.error('Erreur lors du partage de la position');
    }
  };

  const handleDeleteForEveryone = async (messageId: string, messageTimestamp?: string) => {
    if (!selectedConversationId) return;

    // Vérifier délai 24h côté UI (le backend vérifie aussi)
    if (messageTimestamp) {
      const createdAt = new Date(messageTimestamp).getTime();
      const maxDelayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - createdAt > maxDelayMs) {
        toast.error('Suppression pour tous possible uniquement dans les 24 heures');
        return;
      }
    }

    const ok = window.confirm('Supprimer ce message pour vous et le destinataire ? (max 24h)');
    if (!ok) return;

    try {
      await messageService.deleteMessage(messageId);
      // Mise à jour immédiate (le socket fera aussi le sync)
      useMessageStore.getState().markMessageDeleted?.(selectedConversationId, messageId, user?.id);
      toast.success('Message supprimé');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Impossible de supprimer le message');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-primary-600 mb-4 font-medium">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadConversations();
            }}
            className="btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex">
      {/* Liste des conversations */}
      <div className="w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Chargement...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery.trim() 
                ? `Aucune conversation trouvée pour "${searchQuery}"`
                : 'Aucune conversation'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUserId = conv.participants.find((id) => id !== user?.id);
              const otherUserInfo = conv.otherUser;
              const lastRisk = conv.lastMessage?.riskScore || 0;
              
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversationId(conv.id);
                    // Les messages seront chargés automatiquement dans le useEffect
                  }}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversationId === conv.id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Photo de profil */}
                    <div className="flex-shrink-0">
                      {otherUserInfo?.photos && otherUserInfo.photos.length > 0 ? (
                        <img
                          src={(() => {
                            const photo = otherUserInfo.photos[0];
                            return photo.startsWith('http') 
                              ? photo 
                              : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                          })()}
                          alt={otherUserInfo.firstName || 'Profil'}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback vers initiale si l'image ne charge pas
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && otherUserInfo?.firstName) {
                              parent.innerHTML = `<div class="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">${otherUserInfo.firstName.charAt(0).toUpperCase()}</div>`;
                            }
                          }}
                        />
                      ) : otherUserInfo?.firstName ? (
                        <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">
                          {otherUserInfo.firstName.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="font-semibold text-gray-900 truncate">
                            {otherUserInfo && otherUserInfo.firstName
                              ? `${otherUserInfo.firstName} ${otherUserInfo.lastName || ''}`
                              : `Utilisateur ${otherUserId?.slice(0, 8) || ''}`}
                          </span>
                          {lastRisk >= RISK_FLAG_THRESHOLD && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0"
                              title="Dernier message potentiellement suspect"
                            >
                              ⚠️
                            </span>
                          )}
                          {otherUserInfo?.isOnline !== undefined && (
                            <div className="relative flex-shrink-0">
                              {otherUserInfo.isOnline ? (
                                <>
                                  <div 
                                    className="w-2.5 h-2.5 bg-green-500 rounded-full"
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
                                  className="w-2.5 h-2.5 bg-red-500 rounded-full"
                                  style={{ filter: 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))' }}
                                  title="Hors ligne"
                                />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Afficher le badge uniquement pour les messages reçus (pas envoyés) et si la conversation n'est pas actuellement ouverte */}
                        {conv.unreadCount > 0 && 
                         conv.lastMessage && 
                         conv.lastMessage.senderId !== user?.id &&
                         selectedConversationId !== conv.id && (
                          <span className="bg-[#F26E27] text-white text-xs rounded-full px-2 py-1 flex-shrink-0 ml-2">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {otherUserInfo && (
                          <span className="text-xs text-gray-500 mr-2">
                            {otherUserInfo.age} ans
                          </span>
                        )}
                        {conv.lastMessage && conv.lastMessage.timestamp && (
                          <>
                            <p className={`text-sm truncate flex-1 ${conv.unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                              {conv.lastMessage.type === 'image' 
                                ? '📷 Photo' 
                                : conv.lastMessage.content || 'Message'}
                            </p>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {formatRelativeTime(conv.lastMessage.timestamp)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className="hidden md:flex flex-1 flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        {selectedConversationId ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(() => {
                    try {
                      const conversation = conversations.find((c) => c.id === selectedConversationId);
                      const otherUserInfo = conversation?.otherUser;
                      if (otherUserInfo && otherUserInfo.firstName) {
                        const statusText = otherUserInfo.isOnline
                          ? 'En ligne'
                          : otherUserInfo.lastActive
                            ? `En ligne ${formatRelativeTime(otherUserInfo.lastActive)}`
                            : 'Hors ligne';
                        return (
                          <>
                            {otherUserInfo.photos && otherUserInfo.photos.length > 0 ? (
                              <img
                                src={(() => {
                                  const photo = otherUserInfo.photos[0];
                                  return photo.startsWith('http') 
                                    ? photo 
                                    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${photo}`;
                                })()}
                                alt={otherUserInfo.firstName}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">${otherUserInfo.firstName.charAt(0).toUpperCase()}</div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-semibold">
                                {otherUserInfo.firstName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                  {`${otherUserInfo.firstName} ${otherUserInfo.lastName || ''}`}
                                </h2>
                                <p className={`text-sm ${otherUserInfo.isOnline ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                                  {statusText}
                                </p>
                              </div>
                              {otherUserInfo.isOnline !== undefined && (
                                <div className="relative">
                                  {otherUserInfo.isOnline ? (
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
                          </>
                        );
                      }
                      return <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>;
                    } catch (err) {
                      console.error('Error rendering conversation header:', err);
                      return <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>;
                    }
                  })()}
                </div>
                <div className="relative" ref={conversationActionsRef}>
                  <button
                    type="button"
                    onClick={() => setShowConversationActions((v) => !v)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                    title="Actions"
                    disabled={isBlockingUser}
                  >
                    <IoEllipsisVertical size={20} />
                  </button>
                  {showConversationActions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                      <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Signaler
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockUser}
                        disabled={isBlockingUser}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isBlockingUser ? 'Blocage…' : 'Bloquer'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-br from-primary-50 via-white to-secondary-50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {isLoadingMessages ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F26E27] mx-auto mb-4"></div>
                  <p>Chargement des messages...</p>
                </div>
              ) : conversationMessages.length > 0 ? (
                <>
                  {conversationMessages.map((message) => {
                    if (!message || !message.id) return null;
                    
                    const isOwn = message.senderId === user?.id;
                    const isImage = message.type === 'image' && message.imageUrl;
                    const isAudio = message.type === 'audio' && message.voiceUrl;
                    const canDeleteForAll =
                      isOwn &&
                      !!message.timestamp &&
                      Date.now() - new Date(message.timestamp).getTime() <= 24 * 60 * 60 * 1000;
                    const isDeleted = message.deletedForEveryone === true;
                    const riskWarning = getRiskWarning(message.riskScore, message.riskFlags);
                    const repliedMessage = message.replyToMessageId
                      ? conversationMessages.find((m: any) => m.id === message.replyToMessageId)
                      : null;
                    const reactionsObj: Record<string, string[]> = message.reactions || {};
                    const reactionEntries = Object.entries(reactionsObj).filter(
                      ([, ids]) => Array.isArray(ids) && ids.length > 0
                    );
                    
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
                        <div className="relative group max-w-xs lg:max-w-md">
                          {riskWarning && !isDeleted && (
                            <div
                              className={`mb-1 px-2 py-1 rounded-lg text-[11px] border ${
                                isOwn
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">⚠️ {riskWarning.label}</span>
                                <span className="text-amber-700/80">·</span>
                                <span className="text-amber-700/80">
                                  Ne partagez pas vos informations sensibles.
                                </span>
                              </div>
                              {riskWarning.details && (
                                <div className="text-amber-700/80 mt-0.5">{riskWarning.details}</div>
                              )}
                            </div>
                          )}
                          {/* Menu ˅ en haut à droite */}
                          {!isDeleted && (
                            <div className="absolute top-1 right-1 z-10" ref={openMessageMenuId === message.id ? messageMenuRef : undefined}>
                              <button
                                type="button"
                                onClick={() => setOpenMessageMenuId((prev) => (prev === message.id ? null : message.id))}
                                className={`p-1 rounded-full bg-white/90 hover:bg-white border border-gray-200 shadow-sm transition-colors ${
                                  openMessageMenuId === message.id ? 'ring-2 ring-[#F26E27]/30' : ''
                                }`}
                                title="Options du message"
                              >
                                <IoChevronDown size={14} className="text-gray-700" />
                              </button>

                              {openMessageMenuId === message.id && (
                                <div className="absolute top-7 right-0 w-60 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMessageMenuId(null);
                                      setReplyToMessage(message);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    Répondre
                                  </button>

                                  <div className="px-4 py-3 border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-600 mb-2">Réagir</p>
                                    <div className="flex items-center gap-2">
                                      {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                                        <button
                                          key={emoji}
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              const res = await messageService.toggleReaction(message.id, emoji);
                                              useMessageStore.getState().updateMessageReactions?.(
                                                res.conversationId,
                                                res.messageId,
                                                res.reactions
                                              );
                                            } catch (e: any) {
                                              toast.error(e?.response?.data?.message || 'Impossible de réagir');
                                            } finally {
                                              setOpenMessageMenuId(null);
                                            }
                                          }}
                                          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                          title={`Réagir ${emoji}`}
                                        >
                                          <span className="text-lg">{emoji}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {isOwn && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMessageMenuId(null);
                                        handleDeleteForEveryone(message.id, message.timestamp);
                                      }}
                                      disabled={!canDeleteForAll}
                                      className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-t border-gray-100 ${
                                        canDeleteForAll
                                          ? 'hover:bg-gray-50 text-red-600'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      Supprimer pour tous
                                      {!canDeleteForAll && (
                                        <span className="block text-xs text-gray-400 mt-0.5">
                                          Disponible pendant 24h après l’envoi
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`rounded-2xl shadow-sm ${
                            isOwn
                              ? 'bg-[#F26E27] text-white rounded-tr-sm shadow-md'
                              : 'bg-white text-gray-900 border-2 border-secondary-200 rounded-tl-sm shadow-sm'
                            } ${isLocation ? 'p-0' : 'px-4 py-2'}`}
                          >
                          {isDeleted ? (
                            <div className="px-4 py-2">
                              <p className={`text-sm italic ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                                {isOwn ? 'Vous avez supprimé ce message' : 'Ce message a été supprimé'}
                              </p>
                              {message.timestamp && (
                                <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-400'}`}>
                                  {formatRelativeTime(message.timestamp)}
                                </p>
                              )}
                            </div>
                          ) : isLocation && locationLat && locationLng ? (
                            <>
                              <LocationMessage lat={locationLat} lng={locationLng} isOwn={isOwn} />
                              {message.timestamp && (
                                <div className={`px-3 py-1.5 ${isOwn ? 'bg-primary-700' : 'bg-gray-100'}`}>
                                  <p
                                    className={`text-xs flex items-center ${
                                      isOwn ? 'text-primary-100' : 'text-gray-500'
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
                              {repliedMessage && (
                                <div className={`mb-2 px-3 py-2 rounded-lg ${isOwn ? 'bg-primary-700/40' : 'bg-gray-100'} border-l-4 ${isOwn ? 'border-white/70' : 'border-[#F26E27]'}`}>
                                  <p className={`text-xs font-semibold ${isOwn ? 'text-primary-100' : 'text-gray-700'}`}>
                                    Réponse
                                  </p>
                                  <p className={`text-xs ${isOwn ? 'text-primary-100/90' : 'text-gray-600'} truncate`}>
                                    {repliedMessage.type === 'image'
                                      ? '📷 Photo'
                                      : repliedMessage.type === 'audio'
                                        ? '🎤 Audio'
                                        : (repliedMessage.content || '')}
                                  </p>
                                </div>
                              )}
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
                                    // Ouvrir l'image en grand au clic
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
                                  className={`text-xs mt-1 flex items-center ${
                                    isOwn ? 'text-primary-100' : 'text-gray-500'
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
                          ) : isAudio ? (
                            <>
                              {repliedMessage && (
                                <div className={`mb-2 px-3 py-2 rounded-lg ${isOwn ? 'bg-primary-700/40' : 'bg-gray-100'} border-l-4 ${isOwn ? 'border-white/70' : 'border-[#F26E27]'}`}>
                                  <p className={`text-xs font-semibold ${isOwn ? 'text-primary-100' : 'text-gray-700'}`}>
                                    Réponse
                                  </p>
                                  <p className={`text-xs ${isOwn ? 'text-primary-100/90' : 'text-gray-600'} truncate`}>
                                    {repliedMessage.type === 'image'
                                      ? '📷 Photo'
                                      : repliedMessage.type === 'audio'
                                        ? '🎤 Audio'
                                        : (repliedMessage.content || '')}
                                  </p>
                                </div>
                              )}
                              <audio
                                controls
                                src={(() => {
                                  const v = message.voiceUrl || '';
                                  return v.startsWith('http')
                                    ? v
                                    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${v}`;
                                })()}
                                className="w-64 max-w-full"
                              />
                              {message.timestamp && (
                                <p
                                  className={`text-xs mt-1 flex items-center ${
                                    isOwn ? 'text-primary-100' : 'text-gray-500'
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
                              {repliedMessage && (
                                <div className={`mb-2 px-3 py-2 rounded-lg ${isOwn ? 'bg-primary-700/40' : 'bg-gray-100'} border-l-4 ${isOwn ? 'border-white/70' : 'border-[#F26E27]'}`}>
                                  <p className={`text-xs font-semibold ${isOwn ? 'text-primary-100' : 'text-gray-700'}`}>
                                    Réponse
                                  </p>
                                  <p className={`text-xs ${isOwn ? 'text-primary-100/90' : 'text-gray-600'} truncate`}>
                                    {repliedMessage.type === 'image'
                                      ? '📷 Photo'
                                      : repliedMessage.type === 'audio'
                                        ? '🎤 Audio'
                                        : (repliedMessage.content || '')}
                                  </p>
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">{message.content || ''}</p>
                              {message.timestamp && (
                                <p
                                  className={`text-xs mt-1 flex items-center ${
                                    isOwn ? 'text-primary-100' : 'text-gray-500'
                                  }`}
                                >
                                  <span>{formatRelativeTime(message.timestamp)}</span>
                                  {/* Afficher ✓✓ uniquement pour les messages envoyés qui ont été lus par le destinataire */}
                                  {isOwn && message.read && (
                                    <span className="ml-1" title="Lu">✓✓</span>
                                  )}
                                  {/* Afficher ✓ pour les messages envoyés qui n'ont pas encore été lus */}
                                  {isOwn && !message.read && (
                                    <span className="ml-1 text-primary-200" title="Envoyé">✓</span>
                                  )}
                                </p>
                              )}
                            </>
                          )}
                          </div>
                          {reactionEntries.length > 0 && (
                            <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {reactionEntries.map(([emoji, ids]) => (
                                <span
                                  key={emoji}
                                  className="px-2 py-0.5 rounded-full bg-white/90 border border-gray-200 text-xs flex items-center gap-1 shadow-sm"
                                  title={`${ids.length} réaction(s)`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-gray-600 font-semibold">{ids.length}</span>
                                </span>
                              ))}
                            </div>
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

            <div className="bg-white border-t border-gray-200 p-4">
              {/* Réponse */}
              {replyToMessage && (
                <div className="mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700">Réponse</p>
                    <p className="text-xs text-gray-600 truncate">
                      {replyToMessage.type === 'image'
                        ? '📷 Photo'
                        : replyToMessage.type === 'audio'
                          ? '🎤 Audio'
                          : (replyToMessage.content || '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyToMessage(null)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Annuler la réponse"
                  >
                    <IoClose size={18} />
                  </button>
                </div>
              )}

              {/* Aperçu de l'image */}
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

              {/* Aperçu audio */}
              {previewVoice && (
                <div className="mb-3">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
                    <audio controls src={previewVoice} className="w-full" />
                    <button
                      onClick={() => setPreviewVoice(null)}
                      className="p-2 bg-[#F26E27] text-white rounded-lg hover:bg-[#c2581f] transition-colors"
                      title="Supprimer l'audio"
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
                <input
                  ref={voiceInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceSelect}
                  className="hidden"
                />
                {/* Menu d'actions (+) comme WhatsApp */}
                <div className="relative" ref={attachMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu((v) => !v)}
                    className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Plus d'options"
                  >
                    <IoAdd size={22} />
                  </button>

                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploadingImage}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {uploadingImage ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                        ) : (
                          <IoImage size={20} className="text-gray-700" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">Photo</p>
                          <p className="text-xs text-gray-500">Envoyer une image</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          handleShareLocation();
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        <IoLocation size={20} className="text-gray-700" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">Position</p>
                          <p className="text-xs text-gray-500">Partager votre localisation</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachMenu(false);
                          voiceInputRef.current?.click();
                        }}
                        disabled={uploadingVoice}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {uploadingVoice ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                        ) : (
                          <IoMic size={20} className="text-gray-700" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900">Audio</p>
                          <p className="text-xs text-gray-500">Envoyer un message vocal</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
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
                  placeholder={previewImage || previewVoice ? "Ajouter un message (optionnel)..." : "Tapez un message..."}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !previewImage && !previewVoice) || uploadingImage || uploadingVoice}
                  className="p-3 bg-[#F26E27] text-white rounded-lg hover:bg-[#c2581f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoPaperPlane size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />

      {/* Menu de messagerie */}
      <Modal isOpen={showMessagingMenu} onClose={() => setShowMessagingMenu(false)} size="lg">
        {otherUser && (
          <MessagingMenu
            userId={otherUser.id}
            phone={otherUser.phone}
            matchName={otherUser.firstName || 'Utilisateur'}
            otherUser={otherUser}
            onClose={() => setShowMessagingMenu(false)}
          />
        )}
      </Modal>

      {/* Modal signalement */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} size="md">
        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Signaler un utilisateur</h3>
          <p className="text-sm text-gray-600 mb-4">
            Merci de préciser la raison. Notre équipe pourra examiner le signalement.
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="input w-full mb-3"
          >
            <option value="scam">Arnaque / demande d'argent</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harcèlement</option>
            <option value="fake_profile">Faux profil</option>
            <option value="other">Autre</option>
          </select>

          <label className="block text-sm font-medium text-gray-700 mb-1">Détails (optionnel)</label>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={4}
            className="input w-full resize-none mb-4"
            placeholder="Expliquez brièvement…"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmittingReport}
              className="px-4 py-2 rounded-lg bg-[#F26E27] text-white hover:bg-[#c2581f] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmittingReport ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

