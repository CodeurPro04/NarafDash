import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeAgentType } from '../../utils/agentType';
import {
  ClipboardList,
  Building,
  HardHat,
  Search,
  Home,
  Users,
} from 'lucide-react';

const AgentAssignments = () => {
  const { user } = useAuth();
  const agentType = normalizeAgentType(user?.agent_type || user?.agentType);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [assignedProperties, setAssignedProperties] = useState([]);
  const [propertyRequests, setPropertyRequests] = useState([]);
  const [searchRequests, setSearchRequests] = useState([]);
  const [constructionProjects, setConstructionProjects] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientHistory, setClientHistory] = useState([]);
  const [processingClientUuid, setProcessingClientUuid] = useState('');
  const [activeTab, setActiveTab] = useState('clients');
  const [reasonModal, setReasonModal] = useState({ open: false, title: '', reason: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, uuid: '', reason: '', error: '' });

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadAll();
  }, [agentType]);

  const loadAll = async () => {
    setLoading(true);
    setError('');

    const jobs = [
      { key: 'properties', run: () => agentService.getAssignedProperties() },
      { key: 'propertyRequests', run: () => agentService.getAssignedPropertyRequests() },
      { key: 'searchRequests', run: () => agentService.getAssignedSearchRequests() },
      { key: 'constructionProjects', run: () => agentService.getAssignedConstructionProjects() },
      { key: 'clientRequests', run: () => agentService.getAssignedClientRequests() },
      { key: 'clientHistory', run: () => agentService.getClientRequestHistory() },
    ];

    const settled = await Promise.allSettled(jobs.map((job) => job.run()));

    const failedKeys = [];
    const readList = (result, key) => {
      if (result.status !== 'fulfilled') {
        failedKeys.push(key);
        return [];
      }
      const payload = extractPayload(result.value);
      const list = payload?.data || payload;
      return Array.isArray(list) ? list : [];
    };

    setAssignedProperties(readList(settled[0], jobs[0].key));
    setPropertyRequests(readList(settled[1], jobs[1].key));
    setSearchRequests(readList(settled[2], jobs[2].key));
    setConstructionProjects(readList(settled[3], jobs[3].key));
    setClientRequests(readList(settled[4], jobs[4].key));
    setClientHistory(readList(settled[5], jobs[5].key));

    if (failedKeys.length > 0) {
      console.error('Erreur chargement partiel assignations agent:', failedKeys);
      setError('Certaines sections n\'ont pas pu etre chargees.');
    }

    setLoading(false);
  };

  const propertyPendingCount = useMemo(
    () => assignedProperties.filter((item) => item.status === 'pending').length,
    [assignedProperties]
  );

  const constructionHistory = constructionProjects.filter((item) =>
    ['quoted', 'approved', 'rejected', 'completed'].includes(item.status)
  );
  const constructionActive = constructionProjects.filter(
    (item) => !constructionHistory.includes(item)
  );

  const tabButton = (key, label, count) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`px-4 py-2 rounded-xl text-sm border transition ${
        activeTab === key
          ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
          : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgb(var(--ink))]'
      }`}
    >
      {label} {typeof count === 'number' ? `(${count})` : ''}
    </button>
  );

  const renderEmpty = (label) => (
    <p className="text-sm text-[rgba(15,42,46,0.5)]">{label}</p>
  );

  const statusBadge = (status) => {
    const normalized = status || 'pending';
    if (['approved', 'agent_approved', 'fulfilled', 'completed', 'published'].includes(normalized)) {
      return { label: normalized, className: 'bg-emerald-100 text-emerald-700' };
    }
    if (['rejected', 'agent_rejected', 'archived'].includes(normalized)) {
      return { label: normalized, className: 'bg-rose-100 text-rose-700' };
    }
    if (['assigned', 'pending', 'submitted', 'in_study', 'in_progress', 'quoted'].includes(normalized)) {
      return { label: normalized, className: 'bg-amber-100 text-amber-700' };
    }
    return { label: normalized, className: 'bg-slate-100 text-slate-700' };
  };

  const renderStatusPill = (status) => {
    const badge = statusBadge(status);
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const decisionLabel = (status) => {
    if (status === 'agent_approved') return 'Accepte';
    if (status === 'agent_rejected') return 'Refuse';
    if (status === 'rejected') return 'Refuse';
    if (status === 'approved') return 'Accepte';
    return 'En attente';
  };

  const handleApproveClient = async (uuid) => {
    try {
      setProcessingClientUuid(uuid);
      await agentService.approveClientRequest(uuid);
      await loadAll();
    } catch (err) {
      console.error('Erreur approbation client:', err);
      setError(err.response?.data?.message || 'Impossible d\'approuver cette demande client.');
    } finally {
      setProcessingClientUuid('');
    }
  };

  const openRejectModal = (uuid) => {
    setRejectModal({ open: true, uuid, reason: '', error: '' });
  };

  const closeRejectModal = () => {
    if (processingClientUuid) return;
    setRejectModal({ open: false, uuid: '', reason: '', error: '' });
  };

  const submitRejectClient = async () => {
    const reason = rejectModal.reason.trim();
    if (!reason) {
      setRejectModal((prev) => ({ ...prev, error: 'Le motif du refus est obligatoire.' }));
      return;
    }

    try {
      setProcessingClientUuid(rejectModal.uuid);
      await agentService.rejectClientRequest(rejectModal.uuid, { rejection_reason: reason });
      await loadAll();
      setRejectModal({ open: false, uuid: '', reason: '', error: '' });
    } catch (err) {
      console.error('Erreur refus client:', err);
      setError(err.response?.data?.message || 'Impossible de refuser cette demande client.');
    } finally {
      setProcessingClientUuid('');
    }
  };
  const openReasonModal = (title, reason) => {
    setReasonModal({ open: true, title, reason });
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent</p>
              <h1 className="text-3xl font-semibold mt-3">Assignations</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Tout ce qui vous est assigne, avec un suivi clair et l'historique.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="surface-panel p-5">
                <p className="text-xs text-[rgba(15,42,46,0.55)]">Proprietes assignees</p>
                <p className="text-2xl font-semibold mt-2">{assignedProperties.length}</p>
                <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                  {propertyPendingCount} en attente de validation
                </p>
              </div>
              <div className="surface-panel p-5">
                <p className="text-xs text-[rgba(15,42,46,0.55)]">Demandes clients</p>
                <p className="text-2xl font-semibold mt-2">{clientRequests.length}</p>
                <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                  {clientHistory.length} dans l'historique
                </p>
              </div>
              <div className="surface-panel p-5">
                <p className="text-xs text-[rgba(15,42,46,0.55)]">Construction & recherche</p>
                <p className="text-2xl font-semibold mt-2">
                  {constructionActive.length + searchRequests.length}
                </p>
                <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                  Dossiers a traiter
                </p>
              </div>
            </div>

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Assignations & Historique</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabButton('clients', 'Clients', clientRequests.length)}
                {tabButton('properties', 'Proprietes', assignedProperties.length)}
                {tabButton('property-requests', 'Demandes propriete', propertyRequests.length)}
                {tabButton('search', 'Recherche', searchRequests.length)}
                {tabButton('construction', 'Construction', constructionActive.length)}
                {tabButton('history', 'Historique', clientHistory.length + constructionHistory.length)}
              </div>

              {activeTab === 'clients' && (
                loading ? renderEmpty('Chargement...') : clientRequests.length === 0 ? (
                  renderEmpty('Aucune demande client assignee.')
                ) : (
                  <div className="space-y-3">
                    {clientRequests.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <span className="chip">Type: {item.request_type || 'immobilier'}</span>
                          {renderStatusPill(item.status || 'assigned')}
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.message}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[rgba(15,42,46,0.5)]">
                          <div>{item.email || 'Email non fourni'}</div>
                          <div>{item.phone ? `Tel: ${item.phone}` : 'Telephone non fourni'}</div>
                          <div className="sm:col-span-2">
                            Cible: {item.property?.title || item.construction_project?.title || item.constructionProject?.title || item.investment_project?.title || item.investmentProject?.title || 'Sans cible'}
                          </div>
                          <div>Decision: {decisionLabel(item.status)}</div>
                        </div>
                        {item.status === 'assigned' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={processingClientUuid === item.uuid}
                              onClick={() => handleApproveClient(item.uuid)}
                            >
                              {processingClientUuid === item.uuid ? 'Traitement...' : 'Accepter'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              disabled={processingClientUuid === item.uuid}
                              onClick={() => openRejectModal(item.uuid)}
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() => openReasonModal('Motif du refus client', item.rejection_reason)}
                          >
                            Voir le motif
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'properties' && (
                loading ? renderEmpty('Chargement...') : assignedProperties.length === 0 ? (
                  renderEmpty('Aucune propriete assignee.')
                ) : (
                  <div className="space-y-3">
                    {assignedProperties.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          {renderStatusPill(item.status || 'pending')}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[rgba(15,42,46,0.5)]">
                          <div>{item.city || 'Ville'}</div>
                          <div>{item.transaction_type || 'Transaction'}</div>
                          <div>Prix: {item.price ? Number(item.price).toLocaleString() : 'N/A'}</div>
                          <div>Decision: {decisionLabel(item.status)}</div>
                        </div>
                        {item.status === 'pending' && (
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">
                            En attente de validation staff.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'property-requests' && (
                loading ? renderEmpty('Chargement...') : propertyRequests.length === 0 ? (
                  renderEmpty('Aucune demande de propriete assignee.')
                ) : (
                  <div className="space-y-3">
                    {propertyRequests.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title || 'Demande proprietaire'}</p>
                          {renderStatusPill(item.status || 'assigned')}
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.description}</p>
                        <div className="text-xs text-[rgba(15,42,46,0.5)]">
                          Decision: {decisionLabel(item.status)}
                        </div>
                        {item.status === 'agent_rejected' && item.rejection_reason && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() => openReasonModal('Motif du refus proprietaire', item.rejection_reason)}
                          >
                            Voir le motif
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'search' && (
                loading ? renderEmpty('Chargement...') : searchRequests.length === 0 ? (
                  renderEmpty('Aucune demande de recherche assignee.')
                ) : (
                  <div className="space-y-3">
                    {searchRequests.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.propertyType?.name || item.property_type?.name || 'Recherche'}</p>
                          {renderStatusPill(item.status || 'assigned')}
                        </div>
                        <div className="text-xs text-[rgba(15,42,46,0.5)]">
                          Budget: {item.budget_min ? Number(item.budget_min).toLocaleString() : 'N/A'} - {item.budget_max ? Number(item.budget_max).toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-xs text-[rgba(15,42,46,0.5)]">Decision: {decisionLabel(item.status)}</div>
                        
                        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() => openReasonModal('Motif du refus recherche', item.rejection_reason)}
                          >
                            Voir le motif
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'construction' && (
                loading ? renderEmpty('Chargement...') : constructionActive.length === 0 ? (
                  renderEmpty('Aucun projet de construction actif.')
                ) : (
                  <div className="space-y-3">
                    {constructionActive.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title || 'Projet construction'}</p>
                          {renderStatusPill(item.status || 'assigned')}
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {item.city || item.location || 'Localisation'} | Budget {item.budget_min ? Number(item.budget_min).toLocaleString() : 'N/A'}
                        </p>
                        <div className="text-xs text-[rgba(15,42,46,0.5)]">Decision: {decisionLabel(item.status)}</div>
                        
                        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() => openReasonModal('Motif du refus construction', item.rejection_reason)}
                          >
                            Voir le motif
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'history' && (
                loading ? renderEmpty('Chargement...') : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-[rgba(15,42,46,0.55)]">Demandes clients</p>
                      {clientHistory.length === 0 ? (
                        renderEmpty('Pas encore d\'historique client.')
                      ) : (
                        clientHistory.map((item) => (
                          <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{item.name}</p>
                              {renderStatusPill(item.status || 'N/A')}
                            </div>
                            <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.message}</p>
                            <div className="text-xs text-[rgba(15,42,46,0.5)]">Decision: {decisionLabel(item.status)}</div>
                            
                        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                              <button
                                type="button"
                                className="btn-ghost text-[rgb(var(--clay))]"
                                onClick={() => openReasonModal('Motif du refus client', item.rejection_reason)}
                              >
                                Voir le motif
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-wide text-[rgba(15,42,46,0.55)]">Construction</p>
                      {constructionHistory.length === 0 ? (
                        renderEmpty('Pas encore d\'historique construction.')
                      ) : (
                        constructionHistory.map((item) => (
                          <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{item.title || 'Projet construction'}</p>
                              {renderStatusPill(item.status || 'N/A')}
                            </div>
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">
                              {item.city || item.location || 'Localisation'}
                            </p>
                            <div className="text-xs text-[rgba(15,42,46,0.5)]">Decision: {decisionLabel(item.status)}</div>
                            
                        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                              <button
                                type="button"
                                className="btn-ghost text-[rgb(var(--clay))]"
                                onClick={() => openReasonModal('Motif du refus construction', item.rejection_reason)}
                              >
                                Voir le motif
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      </div>

      {reasonModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{reasonModal.title}</h3>
            <div className="mt-4 surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.7)]">
              {reasonModal.reason}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setReasonModal({ open: false, title: '', reason: '' })}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Motif du refus</h3>
            <p className="mt-2 text-sm text-[rgba(15,42,46,0.6)]">
              Ce motif sera enregistre avec la decision de refus.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
              rows={4}
              placeholder="Saisissez le motif du refus..."
              className="mt-4 w-full rounded-xl border border-[rgb(var(--line))] px-3 py-2 text-sm outline-none focus:border-[rgb(var(--ink))]"
            />
            {rejectModal.error && (
              <p className="mt-2 text-xs text-[rgb(var(--clay))]">{rejectModal.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={closeRejectModal}
                disabled={Boolean(processingClientUuid)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={submitRejectClient}
                disabled={Boolean(processingClientUuid)}
              >
                {processingClientUuid ? 'Traitement...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAssignments;




