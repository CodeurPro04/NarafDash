import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { Mail, User, Calendar, Reply } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

const MessageDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? null;

  useEffect(() => {
    loadMessage();
  }, [uuid]);

  const loadMessage = async () => {
    try {
      setLoading(true);
      const response = await adminService.getMessage(uuid);
      const data = extractPayload(response);
      setMessage(data);
      if (data && !data.is_read) {
        await adminService.markMessageAsRead(uuid);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !message) return;
    try {
      await adminService.replyToMessage(uuid, { message: replyText });
      setReplyText('');
      await loadMessage();
    } catch (error) {
      console.error('Erreur lors de la réponse:', error);
      alert('Erreur lors de la réponse');
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="chip">Administration</p>
                <h1 className="text-3xl font-semibold mt-3">Détail du message</h1>
              </div>
              <button onClick={() => navigate('/admin/messages')} className="btn-ghost">Retour</button>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : message ? (
              <div className="surface-panel p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">{message.subject || 'Sans objet'}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-[rgba(15,42,46,0.6)] mt-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {message.sender?.full_name || message.sender_name || 'Expéditeur'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {message.sender?.email || message.sender_email || 'Email'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {message.created_at ? new Date(message.created_at).toLocaleString('fr-FR') : ''}
                    </div>
                  </div>
                </div>

                <div className="surface-soft p-4 text-sm text-[rgba(15,42,46,0.7)]">
                  {message.message}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Répondre</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    rows="5"
                    placeholder="Tapez votre réponse..."
                  />
                  <div className="flex justify-end mt-4">
                    <button onClick={handleReply} disabled={!replyText.trim()} className="btn-primary">
                      <Reply className="h-4 w-4" />
                      Envoyer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Message introuvable.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MessageDetail;
