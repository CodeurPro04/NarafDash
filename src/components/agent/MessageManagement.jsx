import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { Send, Mail, Phone, User, MessageSquare, Clock, CheckCircle } from 'lucide-react';

const MessageManagement = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await agentService.getMessages();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setMessages(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageUuid) => {
    try {
      await agentService.markMessageAsRead(messageUuid);
      setMessages((prev) => prev.map((msg) =>
        msg.uuid === messageUuid ? { ...msg, is_read: true } : msg
      ));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const handleReply = (message) => {
    setSelectedMessage(message);
    setShowReplyModal(true);
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      await agentService.respondToMessage(selectedMessage.uuid, { message: replyText });
      setMessages((prev) => prev.map((msg) =>
        msg.uuid === selectedMessage.uuid ? { ...msg, replied: true } : msg
      ));
      setShowReplyModal(false);
      setReplyText('');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la reponse:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const getSenderName = (message) => {
    const sender = message?.sender || message?.user || message?.from || message?.sender_user;
    const fullName = message?.sender?.full_name || message?.sender_name || message?.sender_full_name;
    if (fullName) return fullName;
    const first = message?.sender_first_name || sender?.first_name || sender?.prenom || '';
    const last = message?.sender_last_name || sender?.last_name || sender?.nom || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return sender?.name || sender?.email || message?.sender_email || 'Client';
  };

  const getSenderEmail = (message) => {
    const sender = message?.sender || message?.user || message?.from || message?.sender_user;
    return sender?.email || message?.sender_email || sender?.mail || sender?.email_address || 'N/A';
  };

  const getSenderPhone = (message) => {
    const sender = message?.sender || message?.user || message?.from || message?.sender_user;
    return message?.sender_phone || sender?.phone || sender?.telephone || sender?.phone_number || '';
  };

  const unreadMessages = messages.filter((msg) => !msg.is_read);
  const totalMessages = messages.length;

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Gestion des messages</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Repondez rapidement aux demandes clients.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Total messages</p>
                    <p className="text-3xl font-semibold mt-2">{totalMessages}</p>
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
                    <p className="text-3xl font-semibold mt-2">{unreadMessages.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <Clock className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Reponses envoyees</p>
                    <p className="text-3xl font-semibold mt-2">{messages.filter((msg) => msg.replied).length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 surface-panel">
                <div className="p-6 border-b border-[rgba(232,221,209,0.8)]">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Messages
                  </h2>
                </div>
                <div className="max-h-[480px] overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                  ) : messages.length > 0 ? (
                    messages.map((message) => (
                      <button
                        key={message.uuid}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.is_read) {
                            handleMarkAsRead(message.uuid);
                          }
                        }}
                        className={`w-full text-left px-5 py-4 border-b border-[rgba(232,221,209,0.6)] transition ${
                          !message.is_read ? 'bg-[rgba(199,109,74,0.08)]' : 'bg-transparent'
                        } ${selectedMessage?.uuid === message.uuid ? 'bg-[rgba(15,42,46,0.08)]' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold">{getSenderName(message)}</h3>
                          {!message.is_read && <span className="chip">Nouveau</span>}
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] truncate">{message.subject || 'Sans objet'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.4)] mt-1">
                          {message.created_at ? new Date(message.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Aucun message</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedMessage ? (
                  <div className="surface-panel p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-3">{selectedMessage.subject || 'Sans objet'}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="surface-soft p-3 flex items-center gap-3">
                          <User className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">Expediteur</p>
                            <p className="text-sm font-medium">{getSenderName(selectedMessage)}</p>
                          </div>
                        </div>
                        <div className="surface-soft p-3 flex items-center gap-3">
                          <Mail className="h-4 w-4" />
                          <div>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">Email</p>
                            <p className="text-sm font-medium">{getSenderEmail(selectedMessage)}</p>
                          </div>
                        </div>
                        {getSenderPhone(selectedMessage) && (
                          <div className="surface-soft p-3 flex items-center gap-3">
                            <Phone className="h-4 w-4" />
                            <div>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">Telephone</p>
                              <p className="text-sm font-medium">{getSenderPhone(selectedMessage)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="surface-soft p-4 text-sm text-[rgba(15,42,46,0.7)]">
                        {selectedMessage.message || selectedMessage.content || 'Contenu non disponible'}
                      </div>
                      <p className="text-xs text-[rgba(15,42,46,0.4)] mt-3">
                        Recu le {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString('fr-FR') : 'Date inconnue'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleReply(selectedMessage)}
                      className="btn-primary"
                    >
                      <Send className="h-4 w-4" />
                      Repondre
                    </button>
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

      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-2xl p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-2">Repondre au message</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)]">De: {getSenderName(selectedMessage)}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Objet</label>
              <div className="surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.6)]">
                Re: {selectedMessage.subject || 'Sans objet'}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Votre reponse</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                rows="6"
                placeholder="Tapez votre reponse ici..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReplyModal(false)} className="btn-ghost">Annuler</button>
              <button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="btn-primary">
                {sendingReply ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageManagement;
