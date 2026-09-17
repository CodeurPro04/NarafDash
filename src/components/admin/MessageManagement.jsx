import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  Search,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Check,
  CheckCheck,
  X,
  Inbox,
  UserPlus,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

const PAGE_SIZE = 20;
const AVATAR_COLORS = ['#0F2A2E', '#3E6D6B', '#9B5A2E', '#7C3A1F', '#2D5D7C', '#6A4B7D'];

const getName = (person) => {
  if (!person) return 'Utilisateur';
  const name = person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
  return name || 'Utilisateur';
};

const getInitials = (name) => (name || 'U')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'U';

const getAvatarColor = (name) => {
  const seed = (name || 'U').toUpperCase();
  const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
};

const formatListDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const formatFullDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const MessageManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, unread: 0, replied: 0, conversations: 0, archived: 0 });

  const [selectedUuid, setSelectedUuid] = useState(null);
  const [threadRoot, setThreadRoot] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const [composing, setComposing] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState([]);
  const [recipientSearching, setRecipientSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [composeText, setComposeText] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState('');

  const threadScrollRef = useRef(null);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uuidFromUrl = params.get('uuid');
    setSelectedUuid((prev) => (uuidFromUrl && uuidFromUrl !== prev ? uuidFromUrl : prev));
  }, [location.search]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedUuid) {
      loadThread(selectedUuid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUuid]);

  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [thread]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminService.getMessages({
        page,
        per_page: PAGE_SIZE,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setMessages(Array.isArray(list) ? list : []);
      setLastPage(payload.last_page || 1);
      setTotal(payload.total ?? (Array.isArray(list) ? list.length : 0));
      const responseStats = response?.data?.stats;
      if (responseStats) {
        setStats({
          total: responseStats.total || 0,
          unread: responseStats.unread || 0,
          replied: responseStats.replied || 0,
          conversations: responseStats.conversations || 0,
          archived: responseStats.archived || 0,
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des messages:', err);
      setError('Impossible de charger les messages.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (uuid) => {
    try {
      setThreadLoading(true);
      setThreadError('');
      const response = await adminService.getMessage(uuid);
      const data = response?.data?.data ?? response?.data ?? null;
      const threadData = response?.data?.thread;
      setThreadRoot(data);
      setThread(Array.isArray(threadData) && threadData.length > 0 ? threadData : (data ? [data] : []));
      // Reflete localement le statut lu/non lu si le backend l'a marque au passage
      setMessages((prev) => prev.map((item) => (item.uuid === uuid ? { ...item, is_read: item.is_read } : item)));
    } catch (err) {
      console.error('Erreur lors du chargement de la conversation:', err);
      setThreadError("Impossible de charger cette conversation. Elle n'existe peut-etre plus, ou vous n'y avez pas acces.");
      setThreadRoot(null);
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const selectConversation = (message) => {
    setSelectedUuid(message.uuid);
    setReplyText('');
    navigate(`/admin/messages?uuid=${message.uuid}`, { replace: true });
  };

  const closeConversation = () => {
    setSelectedUuid(null);
    setThreadRoot(null);
    setThread([]);
    setReplyText('');
    navigate('/admin/messages', { replace: true });
  };

  const handleDelete = async (uuid, event) => {
    event?.stopPropagation();
    if (!window.confirm('Supprimer definitivement ce message ?')) return;
    try {
      await adminService.deleteMessage(uuid);
      setMessages((prev) => prev.filter((msg) => msg.uuid !== uuid));
      setTotal((prev) => Math.max(0, prev - 1));
      if (selectedUuid === uuid) {
        closeConversation();
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert(err.response?.data?.message || 'Erreur lors de la suppression du message');
    }
  };

  const handleArchiveToggle = async (uuid, event) => {
    event?.stopPropagation();
    const isArchivedView = statusFilter === 'archived';
    try {
      if (isArchivedView) {
        await adminService.unarchiveMessage(uuid);
      } else {
        await adminService.archiveMessage(uuid);
      }
      await loadMessages();
    } catch (err) {
      console.error("Erreur lors de l'archivage:", err);
      alert(err.response?.data?.message || "Erreur lors de l'archivage de la conversation");
    }
  };

  const handleArchiveCurrentThread = async () => {
    if (!selectedUuid || !threadRoot) return;
    try {
      if (threadRoot.archived_at) {
        await adminService.unarchiveMessage(selectedUuid);
        setThreadRoot((prev) => (prev ? { ...prev, archived_at: null } : prev));
      } else {
        await adminService.archiveMessage(selectedUuid);
        setThreadRoot((prev) => (prev ? { ...prev, archived_at: new Date().toISOString() } : prev));
      }
      loadMessages();
    } catch (err) {
      console.error("Erreur lors de l'archivage:", err);
      alert(err.response?.data?.message || "Erreur lors de l'archivage de la conversation");
    }
  };

  const handleSendReply = async () => {
    const content = replyText.trim();
    if (!content || !selectedUuid || sending) return;
    try {
      setSending(true);
      setThreadError('');
      const response = await adminService.replyToMessage(selectedUuid, { message: content });
      const newMessage = response?.data?.data;
      if (newMessage) {
        setThread((prev) => [...prev, newMessage]);
      }
      setReplyText('');
      loadMessages();
    } catch (err) {
      console.error('Erreur lors de la reponse:', err);
      setThreadError(err.response?.data?.message || "Erreur lors de l'envoi de la reponse.");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendReply();
    }
  };

  const conversationPartner = useMemo(() => {
    if (!threadRoot) return null;
    return threadRoot.sender_id === currentUserId ? threadRoot.recipient : threadRoot.sender;
  }, [threadRoot, currentUserId]);

  // Recherche debouncee (350ms) du destinataire pour un nouveau message.
  useEffect(() => {
    if (!composing || selectedRecipient) return undefined;
    const query = recipientQuery.trim();
    if (query.length < 2) {
      setRecipientResults([]);
      return undefined;
    }
    const timeout = setTimeout(async () => {
      try {
        setRecipientSearching(true);
        const response = await adminService.getUsers({ search: query, status: 'active', per_page: 8 });
        const payload = response?.data?.data ?? response?.data ?? [];
        const list = (payload.data || payload || []).filter((u) => u.id !== currentUserId);
        setRecipientResults(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Erreur recherche destinataires:', err);
        setRecipientResults([]);
      } finally {
        setRecipientSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [recipientQuery, composing, selectedRecipient, currentUserId]);

  const startCompose = () => {
    setComposing(true);
    setSelectedUuid(null);
    setThreadRoot(null);
    setThread([]);
    setThreadError('');
    setRecipientQuery('');
    setRecipientResults([]);
    setSelectedRecipient(null);
    setComposeText('');
    setComposeError('');
    navigate('/admin/messages', { replace: true });
  };

  const cancelCompose = () => {
    setComposing(false);
    setSelectedRecipient(null);
    setRecipientQuery('');
    setRecipientResults([]);
    setComposeText('');
    setComposeError('');
  };

  const handleSendNewMessage = async () => {
    const content = composeText.trim();
    if (!content || !selectedRecipient || composeSending) return;
    try {
      setComposeSending(true);
      setComposeError('');
      const response = await adminService.createMessage({ recipient_id: selectedRecipient.id, message: content });
      const created = response?.data?.data;
      setComposing(false);
      setComposeText('');
      setSelectedRecipient(null);
      await loadMessages();
      if (created?.uuid) {
        setSelectedUuid(created.uuid);
        navigate(`/admin/messages?uuid=${created.uuid}`, { replace: true });
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi du nouveau message:", err);
      setComposeError(err.response?.data?.message || "Erreur lors de l'envoi du message.");
    } finally {
      setComposeSending(false);
    }
  };

  const handleComposeKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendNewMessage();
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">Gestion des messages</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Suivez les echanges avec les utilisateurs et repondez directement depuis la conversation.
              </p>
            </div>

            {error && <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { key: 'total', label: 'Messages', value: stats.total, icon: Mail },
                { key: 'unread', label: 'Non lus', value: stats.unread, icon: Clock, highlight: stats.unread > 0 },
                { key: 'conversations', label: 'Conversations', value: stats.conversations, icon: MessageSquare },
                { key: 'replied', label: 'Repondus', value: stats.replied, icon: CheckCheck },
              ].map((kpi) => (
                <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                      <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                        {loading && stats.total === 0 ? '...' : Number(kpi.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                        kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                      }`}
                    >
                      <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
              {/* Colonne gauche : boite de reception (masquee sur mobile des qu'une conversation est ouverte) */}
              <div
                className={`surface-panel overflow-hidden flex-col ${(selectedUuid || composing) ? 'hidden lg:flex' : 'flex'}`}
                style={{ height: 'calc(100vh - 320px)', minHeight: '520px' }}
              >
                <div className="p-4 space-y-3 border-b border-[rgba(15,42,46,0.08)] shrink-0">
                  <button type="button" onClick={startCompose} className="btn-primary w-full justify-center text-sm">
                    <UserPlus className="h-4 w-4" />
                    Nouveau message
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                    <input
                      type="text"
                      placeholder="Rechercher un message..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: 'all', label: 'Tous' },
                      { key: 'unread', label: 'Non lus' },
                      { key: 'read', label: 'Lus' },
                      { key: 'archived', label: `Archivees${stats.archived ? ` (${stats.archived})` : ''}` },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setStatusFilter(option.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap ${
                          statusFilter === option.key
                            ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                            : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgba(15,42,46,0.4)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    {(searchInput || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(''); setStatusFilter('all'); }}
                        className="ml-auto text-[rgba(15,42,46,0.5)] hover:text-[rgb(var(--clay))] transition"
                        title="Reinitialiser"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-[rgba(15,42,46,0.06)]">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <div className="h-14 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                      </div>
                    ))
                  ) : messages.length === 0 ? (
                    <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                      <Inbox className="h-8 w-8 mx-auto mb-3 text-[rgba(15,42,46,0.3)]" />
                      Aucun message ne correspond a ces criteres.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const otherParty = message.sender_id === currentUserId ? message.recipient : message.sender;
                      const senderName = getName(otherParty);
                      const isSelected = selectedUuid === message.uuid;
                      const isOwnLast = message.sender_id === currentUserId;
                      const showUnreadDot = !isOwnLast && !message.is_read;
                      return (
                        <div
                          key={message.uuid}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectConversation(message)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConversation(message); } }}
                          className={`w-full text-left px-4 py-3.5 transition group relative cursor-pointer ${
                            isSelected ? 'bg-[rgba(15,42,46,0.06)]' : 'hover:bg-[rgba(15,42,46,0.03)]'
                          }`}
                        >
                          {showUnreadDot && (
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[rgb(var(--clay))]" />
                          )}
                          <div className="flex items-start gap-3 pl-2">
                            <div
                              className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xs font-semibold text-white"
                              style={{ backgroundColor: getAvatarColor(senderName) }}
                            >
                              {getInitials(senderName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm truncate ${showUnreadDot ? 'font-semibold' : 'font-medium'}`}>{senderName}</p>
                                <div className="shrink-0">
                                  <div className="flex items-center gap-1 group-hover:hidden">
                                    {isOwnLast && (
                                      message.is_read ? (
                                        <CheckCheck className="h-3 w-3 text-[rgb(var(--sage))]" title="Lu" />
                                      ) : (
                                        <Check className="h-3 w-3 text-[rgba(15,42,46,0.35)]" title="Envoye" />
                                      )
                                    )}
                                    <span className="text-[10px] text-[rgba(15,42,46,0.5)]">{formatListDate(message.created_at)}</span>
                                  </div>
                                  <div className="hidden group-hover:flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) => handleArchiveToggle(message.uuid, e)}
                                      className="text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--ink))] transition"
                                      title={statusFilter === 'archived' ? 'Desarchiver' : 'Archiver'}
                                    >
                                      {statusFilter === 'archived' ? (
                                        <ArchiveRestore className="h-3.5 w-3.5" />
                                      ) : (
                                        <Archive className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDelete(message.uuid, e)}
                                      className="text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--clay))] transition"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.6)] truncate">{message.subject || 'Sans objet'}</p>
                              <p className="text-xs text-[rgba(15,42,46,0.45)] truncate mt-0.5">{message.message || ''}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {!loading && total > 0 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[rgba(15,42,46,0.08)] shrink-0">
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {page} sur {lastPage}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="h-7 w-7 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                        disabled={page >= lastPage}
                        className="h-7 w-7 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne droite : conversation (visible sur mobile uniquement une fois selectionnee) */}
              <div
                className={`surface-panel overflow-hidden flex-col ${(selectedUuid || composing) ? 'flex' : 'hidden lg:flex'}`}
                style={{ height: 'calc(100vh - 320px)', minHeight: '520px' }}
              >
                {composing ? (
                  <>
                    <div className="px-5 py-4 border-b border-[rgba(15,42,46,0.08)] flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={cancelCompose}
                          className="lg:hidden shrink-0 h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)]"
                          title="Retour a la liste"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))]">Nouveau message</p>
                          {selectedRecipient && (
                            <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">A : {getName(selectedRecipient)}</p>
                          )}
                        </div>
                      </div>
                      <button type="button" onClick={cancelCompose} className="btn-ghost text-xs shrink-0">
                        <X className="h-3.5 w-3.5" />
                        Annuler
                      </button>
                    </div>

                    {!selectedRecipient ? (
                      <div className="flex-1 overflow-y-auto p-4 space-y-1">
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Rechercher un admin, un agent, un utilisateur..."
                            value={recipientQuery}
                            onChange={(e) => setRecipientQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        {recipientSearching ? (
                          <p className="text-xs text-[rgba(15,42,46,0.5)] px-1">Recherche...</p>
                        ) : recipientQuery.trim().length < 2 ? (
                          <p className="text-xs text-[rgba(15,42,46,0.45)] px-1">Tapez au moins 2 caracteres pour rechercher un destinataire.</p>
                        ) : recipientResults.length === 0 ? (
                          <p className="text-xs text-[rgba(15,42,46,0.45)] px-1">Aucun utilisateur trouve.</p>
                        ) : (
                          recipientResults.map((person) => {
                            const name = getName(person);
                            return (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() => setSelectedRecipient(person)}
                                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[rgba(15,42,46,0.04)] text-left transition"
                              >
                                <div
                                  className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                                  style={{ backgroundColor: getAvatarColor(name) }}
                                >
                                  {getInitials(name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">{name}</p>
                                  <p className="text-xs text-[rgba(15,42,46,0.5)] truncate">{person.email}</p>
                                </div>
                                {person.role?.name && (
                                  <span className="chip shrink-0 text-[10px]">{person.role.name}</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                          <div
                            className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-semibold text-white mb-3"
                            style={{ backgroundColor: getAvatarColor(getName(selectedRecipient)) }}
                          >
                            {getInitials(getName(selectedRecipient))}
                          </div>
                          <p className="text-sm font-semibold text-[rgb(var(--ink))]">{getName(selectedRecipient)}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">{selectedRecipient.email}</p>
                          <button
                            type="button"
                            onClick={() => setSelectedRecipient(null)}
                            className="text-xs text-[rgb(var(--clay))] hover:underline mt-3"
                          >
                            Changer de destinataire
                          </button>
                        </div>
                        <div className="p-4 border-t border-[rgba(15,42,46,0.08)] shrink-0">
                          {composeError && <p className="text-xs text-[rgb(var(--clay))] mb-2">{composeError}</p>}
                          <div className="flex items-end gap-2">
                            <textarea
                              value={composeText}
                              onChange={(e) => setComposeText(e.target.value)}
                              onKeyDown={handleComposeKeyDown}
                              rows="2"
                              maxLength={5000}
                              autoFocus
                              placeholder="Ecrivez votre message... (Entree pour envoyer, Maj+Entree pour un saut de ligne)"
                              className="flex-1 rounded-2xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            />
                            <button
                              type="button"
                              onClick={handleSendNewMessage}
                              disabled={!composeText.trim() || composeSending}
                              className="btn-primary h-11 w-11 !p-0 justify-center shrink-0 disabled:opacity-50"
                              title="Envoyer"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : !selectedUuid ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <div className="h-14 w-14 rounded-2xl bg-[rgba(15,42,46,0.06)] flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-[rgba(15,42,46,0.4)]" />
                    </div>
                    <p className="text-sm font-medium text-[rgb(var(--ink))]">Selectionnez une conversation</p>
                    <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">Choisissez un message dans la liste pour afficher l'echange complet.</p>
                  </div>
                ) : threadLoading ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-[rgba(15,42,46,0.5)]">Chargement de la conversation...</div>
                ) : threadError ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-sm text-[rgb(var(--clay))]">{threadError}</p>
                    <button type="button" onClick={closeConversation} className="btn-ghost mt-4 text-xs">Retour a la liste</button>
                  </div>
                ) : threadRoot ? (
                  <>
                    <div className="px-5 py-4 border-b border-[rgba(15,42,46,0.08)] flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={closeConversation}
                          className="lg:hidden shrink-0 h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)]"
                          title="Retour a la liste"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div
                          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-semibold text-white"
                          style={{ backgroundColor: getAvatarColor(getName(conversationPartner)) }}
                        >
                          {getInitials(getName(conversationPartner))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">
                            {getName(conversationPartner)}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">
                            {conversationPartner?.email || ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {threadRoot?.archived_at && (
                          <span className="chip text-[10px] hidden sm:inline-flex">Archivee</span>
                        )}
                        <button
                          type="button"
                          onClick={handleArchiveCurrentThread}
                          className="btn-ghost text-xs shrink-0"
                          title={threadRoot?.archived_at ? 'Desarchiver' : 'Archiver'}
                        >
                          {threadRoot?.archived_at ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">{threadRoot?.archived_at ? 'Desarchiver' : 'Archiver'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(selectedUuid, e)}
                          className="btn-ghost text-xs shrink-0 text-[rgb(var(--clay))]"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                      </div>
                    </div>

                    <div ref={threadScrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[rgba(15,42,46,0.015)]">
                      {thread.map((msg) => {
                        const isOwn = msg.sender_id === currentUserId;
                        const authorName = getName(msg.sender);
                        return (
                          <div key={msg.uuid || msg.id} className={`flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <div
                              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-semibold text-white"
                              style={{ backgroundColor: getAvatarColor(authorName) }}
                            >
                              {getInitials(authorName)}
                            </div>
                            <div className={`max-w-[75%] sm:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div
                                className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words shadow-sm ${
                                  isOwn
                                    ? 'bg-[rgb(var(--ink))] text-white rounded-br-md'
                                    : 'bg-white border border-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))] rounded-bl-md'
                                }`}
                              >
                                {msg.message}
                              </div>
                              <span className="text-[10px] text-[rgba(15,42,46,0.45)] mt-1 px-1 flex items-center gap-1">
                                {isOwn ? 'Vous' : authorName} · {formatFullDate(msg.created_at)}
                                {isOwn && (
                                  msg.is_read ? (
                                    <CheckCheck className="h-3 w-3 text-[rgb(var(--sage))]" title="Lu" />
                                  ) : (
                                    <Check className="h-3 w-3 text-[rgba(15,42,46,0.4)]" title="Envoye" />
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 border-t border-[rgba(15,42,46,0.08)] shrink-0">
                      {threadError && <p className="text-xs text-[rgb(var(--clay))] mb-2">{threadError}</p>}
                      <div className="flex items-end gap-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleComposerKeyDown}
                          rows="2"
                          maxLength={5000}
                          placeholder="Ecrivez votre reponse... (Entree pour envoyer, Maj+Entree pour un saut de ligne)"
                          className="flex-1 rounded-2xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sending}
                          className="btn-primary h-11 w-11 !p-0 justify-center shrink-0 disabled:opacity-50"
                          title="Envoyer"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MessageManagement;
