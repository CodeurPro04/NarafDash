import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ownerService } from '../../services/api';
import { MessageSquare, Mail, User, Search, Trash2, Calendar, Send } from 'lucide-react';

const OwnerMessages = () => {
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
      const response = await ownerService.getMessages();
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

  const handleViewMessage = async (message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      try {
        await ownerService.markMessageAsRead(message.uuid);
        setMessages((prev) => prev.map((msg) =>
          msg.uuid === message.uuid ? { ...msg, is_read: true } : msg
        ));
      } catch (error) {
        console.error('Erreur lors du marquage comme lu:', error);
      }
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    try {
      await ownerService.replyToMessage(selectedMessage.uuid, { message: replyText });
      setReplyText('');
      setSelectedMessage(null);
      await loadMessages();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    }
  };

  const handleDeleteMessage = async (messageUuid) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
    try {
      await ownerService.deleteMessage(messageUuid);
      setMessages((prev) => prev.filter((msg) => msg.uuid !== messageUuid));
      if (selectedMessage?.uuid === messageUuid) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du message');
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex gap-6 flex-col lg:flex-row">
              <div className={`${selectedMessage ? 'lg:w-1/2' : 'w-full'} space-y-6`}>
                <div>
                  <p className="chip">Espace propriétaire</p>
                  <h1 className="text-3xl font-semibold mt-3">Messages</h1>
                  <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                    Gérez vos échanges avec les visiteurs et clients.
                  </p>
                </div>

                <div className="surface-panel p-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                    <input
                      type="text"
                      placeholder="Rechercher par sujet, nom ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
                ) : (
                  <div className="space-y-4">
                    {filteredMessages.map((message) => (
                      <div
                        key={message.uuid}
                        onClick={() => handleViewMessage(message)}
                        className={`surface-panel p-5 cursor-pointer transition ${
                          selectedMessage?.uuid === message.uuid ? 'border-[rgba(15,42,46,0.35)]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                              <User className="h-5 w-5 text-[rgb(var(--ink))]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{message.sender?.full_name || message.sender_name}</p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">{message.sender?.email || message.sender_email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[rgba(15,42,46,0.4)]">
                              {message.created_at ? new Date(message.created_at).toLocaleDateString('fr-FR') : ''}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(message.uuid);
                              }}
                              className="btn-ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-sm font-medium mb-2">{message.subject}</h4>
                        <p className="text-sm text-[rgba(15,42,46,0.6)] line-clamp-2">{message.message}</p>
                      </div>
                    ))}
                    {filteredMessages.length === 0 && (
                      <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Aucun message trouvé</div>
                    )}
                  </div>
                )}
              </div>

              {selectedMessage && (
                <div className="lg:w-1/2 surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-[rgba(15,42,46,0.6)]">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {selectedMessage.sender?.full_name || selectedMessage.sender_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {selectedMessage.sender?.email || selectedMessage.sender_email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString('fr-FR') : ''}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMessage(null)} className="btn-ghost">Fermer</button>
                  </div>

                  <div className="surface-soft p-4 text-sm text-[rgba(15,42,46,0.7)] mb-6">
                    {selectedMessage.message}
                  </div>

                  <div className="border-t border-[rgba(232,221,209,0.8)] pt-4">
                    <h3 className="text-sm font-semibold mb-3">Répondre</h3>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tapez votre réponse..."
                      rows={5}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm mb-4"
                    />
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setSelectedMessage(null)} className="btn-ghost">Annuler</button>
                      <button onClick={handleReply} disabled={!replyText.trim()} className="btn-primary">
                        <Send className="h-4 w-4" />
                        Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerMessages;
