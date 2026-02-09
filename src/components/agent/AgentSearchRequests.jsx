import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { FileText, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgentSearchRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getAssignedSearchRequests();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur lors du chargement des demandes:', err);
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (uuid) => {
    try {
      await agentService.fulfillSearchRequest(uuid, {});
      setRequests((prev) => prev.map((item) => (
        item.uuid === uuid
          ? { ...item, status: item.status || 'fulfilled', fulfilled_at: item.fulfilled_at || new Date().toISOString() }
          : item
      )));
    } catch (err) {
      console.error('Erreur lors de la validation:', err);
      setError('Erreur lors de la validation.');
    }
  };

  const handleOpenMessage = (request) => {
    if (!request.user?.id) {
      setError('Impossible de trouver le client.');
      return;
    }
    setMessageTarget(request);
    setMessageSubject(`Demande ${request.property_type?.name || 'recherche'}`);
    setMessageBody('');
  };

  const handleSendMessage = async () => {
    if (!messageTarget?.user?.id || !messageBody.trim()) return;
    try {
      setSendingMessage(true);
      await agentService.sendMessage({
        recipient_id: messageTarget.user.id,
        subject: messageSubject || 'Contact agent',
        message: messageBody,
      });
      setMessageTarget(null);
      setMessageSubject('');
      setMessageBody('');
    } catch (err) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setError('Erreur lors de l\'envoi du message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatRequester = (user) => {
    if (!user) return 'Client';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const phone = user.phone ? ` (${user.phone})` : '';
    return `${name || 'Client'}${phone}`;
  };

  const statusLabel = (request) => {
    const status = request.status || (request.is_fulfilled || request.fulfilled_at ? 'fulfilled' : 'pending');
    if (['fulfilled', 'completed', 'done'].includes(status)) return 'Traitee';
    if (['pending', 'open'].includes(status)) return 'En attente';
    return status;
  };

  const isTreated = (request) => {
    const status = request.status || (request.is_fulfilled || request.fulfilled_at ? 'fulfilled' : 'pending');
    return ['fulfilled', 'completed', 'done'].includes(status);
  };

  const pendingRequests = requests.filter((request) => !isTreated(request));
  const treatedRequests = requests.filter((request) => isTreated(request));

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Demandes de recherche</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Traitez les demandes assignees et contactez le client si besoin.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Demandes en cours</h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande en cours.</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {request.property_type?.name || 'Recherche personnalisee'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.transaction_type || ''} | {request.city || request.location_preferences?.join(', ') || 'Localisation a definir'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          {formatRequester(request.user)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="chip">{statusLabel(request)}</span>
                        <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                          <MessageSquare className="h-4 w-4" />
                          Messages
                        </button>
                        <button onClick={() => handleOpenMessage(request)} className="btn-ghost">
                          <Send className="h-4 w-4" />
                          Contacter
                        </button>
                        <button onClick={() => handleFulfill(request.uuid)} className="btn-primary">
                          <CheckCircle className="h-4 w-4" />
                          Marquer traite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Historique des demandes traitees</h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : treatedRequests.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande traitee.</p>
              ) : (
                <div className="space-y-3">
                  {treatedRequests.map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          {request.property_type?.name || 'Recherche personnalisee'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.transaction_type || ''} | {request.city || request.location_preferences?.join(', ') || 'Localisation a definir'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          {formatRequester(request.user)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="chip">{statusLabel(request)}</span>
                        <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                          <MessageSquare className="h-4 w-4" />
                          Messages
                        </button>
                        <button onClick={() => handleOpenMessage(request)} className="btn-ghost">
                          <Send className="h-4 w-4" />
                          Contacter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {messageTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-2xl p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-2">Contacter le client</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)]">
                Destinataire: {formatRequester(messageTarget.user)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Sujet</label>
              <input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                rows="6"
                placeholder="Tapez votre message ici..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setMessageTarget(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleSendMessage} disabled={sendingMessage || !messageBody.trim()} className="btn-primary">
                {sendingMessage ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentSearchRequests;
