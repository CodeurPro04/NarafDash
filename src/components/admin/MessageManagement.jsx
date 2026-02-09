import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { Mail, Search, Trash2, Reply, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MessageManagement = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await adminService.getMessages();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setMessages(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter((message) => {
    const subject = (message.subject || '').toLowerCase();
    const senderName = (message.sender?.full_name || message.sender_name || '').toLowerCase();
    const senderEmail = (message.sender?.email || message.sender_email || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return subject.includes(searchLower) || senderName.includes(searchLower) || senderEmail.includes(searchLower);
  });


  const getSenderName = (message) => {
    if (!message) return 'Client';
    const name = message.sender?.full_name || message.sender_name;
    if (name) return name;
    const first = message.sender?.first_name || '';
    const last = message.sender?.last_name || '';
    const combined = `${first} ${last}`.trim();
    return combined || 'Client';
  };

  const getSenderEmail = (message) => message?.sender?.email || message?.sender_email || '';

  const getInitials = (message) => {
    const name = getSenderName(message);
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR');
  };

  const getAvatarColor = (message) => {
    const seed = (getSenderName(message) || 'Client').toUpperCase();
    const colors = ['#0F2A2E', '#3E6D6B', '#9B5A2E', '#7C3A1F', '#2D5D7C', '#6A4B7D'];
    const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[total % colors.length];
  };

  const getReadBadge = (message) => (message?.is_read ? 'Lu' : 'Non lu');

  const unreadCount = messages.filter((message) => !message.is_read).length;

  const handleDeleteMessage = async (uuid) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await adminService.deleteMessage(uuid);
      setMessages((prev) => prev.filter((msg) => msg.uuid !== uuid));
      if (selectedMessage?.uuid === uuid) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du message');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    try {
      await adminService.replyToMessage(selectedMessage.uuid, { message: replyText });
      setReplyText('');
      setSelectedMessage(null);
      await loadMessages();
    } catch (error) {
      console.error('Erreur lors de la reponse:', error);
      alert('Erreur lors de la reponse');
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <style>{`
            @keyframes messageFadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .message-fade { animation: messageFadeIn 180ms ease-out; }
            .bubble-in { background: rgba(15, 42, 46, 0.06); }
            .bubble-out { background: rgba(199, 109, 74, 0.12); }
          `}</style>
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-3xl font-semibold mt-3">Gestion des messages</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Suivez et repondez aux demandes clients.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 surface-panel">
                <div className="p-6 border-b border-[rgba(232,221,209,0.8)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Boite de reception
                    </h2>
                    <span className="text-xs text-[rgba(15,42,46,0.5)]">{unreadCount} non lus</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                    <input
                      type="text"
                      placeholder="Rechercher un message..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                  ) : filteredMessages.length > 0 ? (
                    filteredMessages.map((message) => (
                      <button
                        key={message.uuid}
                        onClick={() => setSelectedMessage(message)}
                        className={`w-full text-left px-5 py-4 border-b border-[rgba(232,221,209,0.6)] transition message-fade ${
                          selectedMessage?.uuid === message.uuid ? 'bg-[rgba(15,42,46,0.08)]' : 'hover:bg-[rgba(15,42,46,0.04)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-semibold text-white"
                            style={{ backgroundColor: getAvatarColor(message) }}
                          >
                            {getInitials(message)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold truncate">{getSenderName(message)}</p>
                              <span className="text-[10px] text-[rgba(15,42,46,0.5)]">{formatDate(message.created_at)}</span>
                            </div>
                            <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">{message.subject || 'Sans objet'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${message.is_read ? 'bg-[rgba(15,42,46,0.08)] text-[rgba(15,42,46,0.7)]' : 'bg-[rgba(199,109,74,0.2)] text-[rgb(var(--clay))]'}`}>
                            {getReadBadge(message)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-[rgba(15,42,46,0.45)] truncate">{message.message || message.content || ''}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/messages/${message.uuid}`);
                            }}
                            className="btn-ghost"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Aucun message</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedMessage ? (
                  <div className="surface-panel p-0 overflow-hidden message-fade">
                    <div className="px-6 py-5 border-b border-[rgba(232,221,209,0.8)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-2xl flex items-center justify-center font-semibold text-white"
                            style={{ backgroundColor: getAvatarColor(selectedMessage) }}
                          >
                            {getInitials(selectedMessage)}
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold">{selectedMessage.subject || 'Sans objet'}</h2>
                            <p className="text-sm text-[rgba(15,42,46,0.6)]">{getSenderName(selectedMessage)} {getSenderEmail(selectedMessage) ? `- ${getSenderEmail(selectedMessage)}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.5)]">
                          <span>Recu le {formatDate(selectedMessage.created_at)}</span>
                          <span className={`px-2 py-0.5 rounded-full ${selectedMessage.is_read ? 'bg-[rgba(15,42,46,0.08)] text-[rgba(15,42,46,0.7)]' : 'bg-[rgba(199,109,74,0.2)] text-[rgb(var(--clay))]'}`}>
                            {getReadBadge(selectedMessage)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/messages/${selectedMessage.uuid}`)}
                          className="btn-ghost"
                        >
                          <Eye className="h-4 w-4" />
                          Voir detail
                        </button>
                        <button onClick={() => handleDeleteMessage(selectedMessage.uuid)} className="btn-ghost">
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-6 bg-[rgba(15,42,46,0.02)] space-y-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-semibold text-white"
                          style={{ backgroundColor: getAvatarColor(selectedMessage) }}
                        >
                          {getInitials(selectedMessage)}
                        </div>
                        <div className="max-w-2xl">
                          <div className="text-xs text-[rgba(15,42,46,0.55)] mb-1">Client</div>
                          <div className="rounded-2xl bubble-in border border-[rgba(15,42,46,0.08)] px-5 py-4 text-sm text-[rgba(15,42,46,0.85)] shadow-sm">
                            {selectedMessage.message || selectedMessage.content || 'Message vide'}
                          </div>
                        </div>
                      </div>
                      {replyText.trim() && (
                        <div className="flex items-start justify-end gap-3">
                          <div className="max-w-2xl text-right">
                            <div className="text-xs text-[rgba(15,42,46,0.55)] mb-1">Votre reponse</div>
                            <div className="rounded-2xl bubble-out border border-[rgba(15,42,46,0.08)] px-5 py-4 text-sm text-[rgba(15,42,46,0.85)] shadow-sm inline-block">
                              {replyText}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-5 border-t border-[rgba(232,221,209,0.8)] bg-white">
                      <label className="block text-sm font-medium mb-2">Repondre</label>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.25)]"
                        rows="5"
                        placeholder="Tapez votre reponse..."
                      />
                      <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setSelectedMessage(null)} className="btn-ghost">Annuler</button>
                        <button onClick={handleReply} disabled={!replyText.trim()} className="btn-primary">
                          <Reply className="h-4 w-4" />
                          Envoyer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                    Selectionnez un message pour voir les details.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MessageManagement;
