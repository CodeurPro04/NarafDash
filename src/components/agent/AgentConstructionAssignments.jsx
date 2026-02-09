import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { HardHat, Send, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AgentConstructionAssignments = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getAssignedConstructionProjects();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur lors du chargement des projets:', err);
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (uuid, field, value) => {
    setQuoteDrafts((prev) => ({
      ...prev,
      [uuid]: {
        ...prev[uuid],
        [field]: value,
      },
    }));
  };

  const handleQuoteSubmit = async (project) => {
    const draft = quoteDrafts[project.uuid] || {};
    if (!draft.amount) {
      setError('Veuillez saisir un montant pour le devis.');
      return;
    }
    try {
      setError('');
      await agentService.createQuote(project.uuid, {
        amount: Number(draft.amount),
        currency: draft.currency || 'XOF',
        details: draft.details || '',
      });
      setProjects((prev) => prev.map((item) => (
        item.uuid === project.uuid
          ? {
            ...item,
            status: item.status || 'sent',
            quote_sent_at: item.quote_sent_at || new Date().toISOString(),
          }
          : item
      )));
      updateDraft(project.uuid, 'amount', '');
      updateDraft(project.uuid, 'details', '');
    } catch (err) {
      console.error('Erreur lors de la creation du devis:', err);
      setError('Erreur lors de la creation du devis.');
    }
  };

  const handleOpenMessage = (project) => {
    if (!project.user?.id) {
      setError('Impossible de trouver le client.');
      return;
    }
    setMessageTarget(project);
    setMessageSubject(`Projet ${project.title || 'construction'}`);
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

  const statusLabel = (project) => {
    const status = project.status || (project.quote_sent_at || project.has_quote ? 'quoted' : 'assigned');
    if (['sent', 'quoted', 'completed'].includes(status)) return 'Devis envoye';
    if (status === 'assigned') return 'Assigne';
    return status;
  };

  const isTreated = (project) => {
    const status = project.status || (project.quote_sent_at || project.has_quote ? 'quoted' : 'assigned');
    return ['sent', 'quoted', 'completed'].includes(status);
  };

  const pendingProjects = projects.filter((project) => !isTreated(project));
  const treatedProjects = projects.filter((project) => isTreated(project));

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Projets de construction</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Envoyez un devis ou contactez le client pour avancer.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Projets en cours</h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en cours.</p>
              ) : (
                <div className="space-y-4">
                  {pendingProjects.map((project) => (
                    <div key={project.uuid} className="surface-soft px-4 py-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          {formatRequester(project.user)}
                        </p>
                      </div>
                      <span className="chip">{statusLabel(project)}</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="number"
                          value={quoteDrafts[project.uuid]?.amount || ''}
                          onChange={(e) => updateDraft(project.uuid, 'amount', e.target.value)}
                          placeholder="Montant du devis"
                          className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={quoteDrafts[project.uuid]?.currency || 'XOF'}
                          onChange={(e) => updateDraft(project.uuid, 'currency', e.target.value)}
                          placeholder="Devise"
                          className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={quoteDrafts[project.uuid]?.details || ''}
                          onChange={(e) => updateDraft(project.uuid, 'details', e.target.value)}
                          placeholder="Details (optionnel)"
                          className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                          <MessageSquare className="h-4 w-4" />
                          Messages
                        </button>
                        <button onClick={() => handleOpenMessage(project)} className="btn-ghost">
                          <Send className="h-4 w-4" />
                          Contacter
                        </button>
                        <button onClick={() => handleQuoteSubmit(project)} className="btn-primary">
                          <Send className="h-4 w-4" />
                          Envoyer devis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Historique des projets traites</h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : treatedProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet traite.</p>
              ) : (
                <div className="space-y-4">
                  {treatedProjects.map((project) => (
                    <div key={project.uuid} className="surface-soft px-4 py-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          {formatRequester(project.user)}
                        </p>
                      </div>
                      <span className="chip">{statusLabel(project)}</span>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                          <MessageSquare className="h-4 w-4" />
                          Messages
                        </button>
                        <button onClick={() => handleOpenMessage(project)} className="btn-ghost">
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

export default AgentConstructionAssignments;
