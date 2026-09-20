import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { managerService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { resolveMediaUrl } from '../../utils/media';
import NewConversationModal from '../common/NewConversationModal';
import { Send, Mail, MessageSquare, Clock, CheckCircle, Check, CheckCheck, Loader2, Plus } from 'lucide-react';

const AGENT_TYPE_LABELS = {
  constructeur: 'Agent Construction',
  immobilier: 'Agent Immobilier',
  investissement: 'Agent Investissement',
};

const ROLE_LABELS = {
  admin: 'Administrateur',
  administrateur: 'Administrateur',
  gestionnaire: 'Gestionnaire',
};

// Libelle affiche sous une bulle : nom + role (administrateur, gestionnaire,
// ou specialite de l'agent) pour savoir precisement qui repond dans le fil.
const getSenderLabel = (senderUser) => {
  if (!senderUser) return 'Utilisateur';
  const name = senderUser.full_name || 'Utilisateur';
  const roleSlug = senderUser.role?.slug;
  if (ROLE_LABELS[roleSlug]) return `${name} · ${ROLE_LABELS[roleSlug]}`;
  if (roleSlug === 'agent') {
    const typeLabel = AGENT_TYPE_LABELS[senderUser.agent_type];
    return typeLabel ? `${name} · ${typeLabel}` : `${name} · Agent`;
  }
  return name;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
};

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time}`;
};

const ManagerMessageManagement = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const chatContainerRef = useRef(null);
  const prevThreadLengthRef = useRef(0);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const extractThread = (response) => (Array.isArray(response?.data?.thread) ? response.data.thread : []);

  const loadMessages = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await managerService.getMessages();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setMessages(Array.isArray(list) ? list : []);
    } catch (error) {
      if (!silent) toast.error('Erreur lors du chargement des messages.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => loadMessages({ silent: true }), 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => refreshThread(selectedConversation.uuid), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  useEffect(() => {
    prevThreadLengthRef.current = 0;
  }, [selectedConversation?.uuid]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const hasNewMessage = threadMessages.length > prevThreadLengthRef.current;
    prevThreadLengthRef.current = threadMessages.length;
    if (hasNewMessage) {
      container.scrollTop = container.scrollHeight;
    }
  }, [threadMessages]);

  const conversations = useMemo(() => {
    const myId = user?.id;
    if (!myId || messages.length === 0) return [];

    const groups = new Map();
    messages.forEach((message) => {
      const key = message.parent_message_id || message.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(message);
    });

    const list = [];
    groups.forEach((groupMessages) => {
      const root = groupMessages.find((item) => !item.parent_message_id) || groupMessages[0];
      const sorted = [...groupMessages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const last = sorted[sorted.length - 1];
      const otherParty = last.sender_id === myId ? last.recipient : last.sender;
      const unread = groupMessages.some((item) => item.recipient_id === myId && !item.is_read);
      list.push({
        uuid: root.uuid,
        otherParty: otherParty || { full_name: 'Utilisateur' },
        lastMessage: last,
        unread,
      });
    });

    return list.sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
  }, [messages, user?.id]);

  const unreadCount = conversations.filter((c) => c.unread).length;

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setThreadMessages([]);
    setThreadLoading(true);
    try {
      const response = await managerService.getMessageThread(conversation.uuid);
      setThreadMessages(extractThread(response));
      loadMessages({ silent: true });
    } catch (error) {
      toast.error('Impossible de charger la conversation.');
    } finally {
      setThreadLoading(false);
    }
  };

  const refreshThread = async (uuid) => {
    try {
      const response = await managerService.getMessageThread(uuid);
      setThreadMessages(extractThread(response));
    } catch (error) {
      // rafraichissement silencieux : on ignore les echecs ponctuels
    }
  };

  const sendChatMessage = async () => {
    const text = chatDraft.trim();
    if (!text || !selectedConversation || sendingChat) return;
    setSendingChat(true);
    try {
      await managerService.replyToMessage(selectedConversation.uuid, { message: text });
      setChatDraft('');
      await refreshThread(selectedConversation.uuid);
      loadMessages({ silent: true });
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const searchMessageableUsers = useCallback(async (search) => {
    const response = await managerService.getMessageableUsers({ search });
    return response?.data?.data ?? response?.data ?? [];
  }, []);

  const startNewConversation = async ({ recipient, message }) => {
    try {
      const response = await managerService.sendMessage({ recipient_id: recipient.id, message });
      const created = response?.data?.data;
      setShowNewChat(false);
      toast.success('Conversation demarree.');
      await loadMessages({ silent: true });
      if (created?.uuid) {
        openConversation({ uuid: created.uuid, otherParty: recipient });
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du message.");
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="chip">Gestionnaire</p>
                <h1 className="text-3xl font-semibold mt-3">Gestion des messages</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Discutez en temps reel avec les agents, l'administration et vos interlocuteurs.
                </p>
              </div>
              <button type="button" onClick={() => setShowNewChat(true)} className="btn-primary text-sm">
                <Plus className="h-4 w-4" />
                Nouvelle conversation
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Conversations</p>
                    <p className="text-3xl font-semibold mt-2">{conversations.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Non lus</p>
                    <p className="text-3xl font-semibold mt-2">{unreadCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <Clock className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Total messages</p>
                    <p className="text-3xl font-semibold mt-2">{messages.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel overflow-hidden">
              <div className="flex h-[560px] max-h-[70vh]">
                <div className={`w-full sm:w-80 shrink-0 border-r border-[rgba(232,221,209,0.8)] overflow-y-auto ${selectedConversation ? 'hidden sm:block' : 'block'}`}>
                  <div className="p-6 border-b border-[rgba(232,221,209,0.8)]">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Messages
                    </h2>
                  </div>
                  {loading ? (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                  ) : conversations.length > 0 ? (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.uuid}
                        onClick={() => openConversation(conversation)}
                        className={`w-full text-left px-5 py-4 border-b border-[rgba(232,221,209,0.6)] transition flex items-center gap-3 ${
                          conversation.unread ? 'bg-[rgba(199,109,74,0.08)]' : 'bg-transparent'
                        } ${selectedConversation?.uuid === conversation.uuid ? 'bg-[rgba(15,42,46,0.08)]' : ''}`}
                      >
                        {conversation.otherParty?.avatar ? (
                          <img
                            src={resolveMediaUrl(conversation.otherParty.avatar)}
                            alt={conversation.otherParty.full_name}
                            className="h-10 w-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                            {getInitials(conversation.otherParty?.full_name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className={`text-sm truncate ${conversation.unread ? 'font-bold' : 'font-semibold'}`}>
                              {conversation.otherParty?.full_name || 'Utilisateur'}
                            </h3>
                            <span className="text-[11px] text-[rgba(15,42,46,0.4)] shrink-0">
                              {formatMessageTime(conversation.lastMessage.created_at)}
                            </span>
                          </div>
                          <p className={`text-xs truncate ${conversation.unread ? 'font-semibold text-[rgb(var(--ink))]' : 'text-[rgba(15,42,46,0.5)]'}`}>
                            {conversation.lastMessage.message}
                          </p>
                        </div>
                        {conversation.unread && <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--clay))] shrink-0" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Aucun message</div>
                  )}
                </div>

                <div className={`flex-1 flex-col ${selectedConversation ? 'flex' : 'hidden sm:flex'}`}>
                  {!selectedConversation ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-[rgba(15,42,46,0.5)] px-6 text-center">
                      Selectionnez une conversation pour voir les messages.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 border-b border-[rgba(232,221,209,0.8)] px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedConversation(null)}
                          className="sm:hidden text-[rgba(15,42,46,0.6)]"
                        >
                          ←
                        </button>
                        {selectedConversation.otherParty?.avatar ? (
                          <img
                            src={resolveMediaUrl(selectedConversation.otherParty.avatar)}
                            alt={selectedConversation.otherParty.full_name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-xs font-semibold">
                            {getInitials(selectedConversation.otherParty?.full_name)}
                          </div>
                        )}
                        <p className="text-sm font-semibold">{selectedConversation.otherParty?.full_name || 'Utilisateur'}</p>
                      </div>
                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[rgba(246,241,234,0.5)]">
                        {threadLoading ? (
                          <div className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                        ) : (
                          threadMessages.map((message) => {
                            const isOwn = message.sender_id === user?.id;
                            const senderName = isOwn
                              ? 'Vous'
                              : getSenderLabel(message.sender || selectedConversation.otherParty);
                            return (
                              <div key={message.uuid} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm rounded-2xl ${
                                    isOwn
                                      ? 'bg-[rgb(var(--ink))] text-white rounded-br-sm'
                                      : 'bg-white border border-[rgb(var(--line))] text-[rgb(var(--ink))] rounded-bl-sm'
                                  }`}
                                >
                                  <p className="whitespace-pre-line">{message.message}</p>
                                  <span className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? 'text-white/70 justify-end' : 'text-[rgba(15,42,46,0.4)]'}`}>
                                    {formatMessageTime(message.created_at)}
                                    {isOwn && (message.is_read ? <CheckCheck size={13} /> : <Check size={13} />)}
                                  </span>
                                </div>
                                <span className="mt-1 px-1 text-[11px] text-[rgba(15,42,46,0.4)]">{senderName}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="border-t border-[rgba(232,221,209,0.8)] p-3 flex items-end gap-2">
                        <textarea
                          rows={1}
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          placeholder="Ecrire un message..."
                          className="flex-1 resize-none rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--clay))]"
                        />
                        <button
                          type="button"
                          onClick={sendChatMessage}
                          disabled={!chatDraft.trim() || sendingChat}
                          className="h-10 w-10 shrink-0 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sendingChat ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {showNewChat && (
        <NewConversationModal
          onClose={() => setShowNewChat(false)}
          onSearch={searchMessageableUsers}
          onSend={startNewConversation}
          getRoleLabel={getSenderLabel}
        />
      )}
    </div>
  );
};

export default ManagerMessageManagement;
