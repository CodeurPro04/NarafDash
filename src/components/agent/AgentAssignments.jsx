import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import {
  ClipboardList,
  Building,
  HardHat,
  Search,
  Home,
  Users,
} from 'lucide-react';

const AgentAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [assignedProperties, setAssignedProperties] = useState([]);
  const [propertyRequests, setPropertyRequests] = useState([]);
  const [searchRequests, setSearchRequests] = useState([]);
  const [constructionProjects, setConstructionProjects] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientHistory, setClientHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('clients');
  const [reasonModal, setReasonModal] = useState({ open: false, title: '', reason: '' });

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [
        propertiesRes,
        propertyReqRes,
        searchRes,
        constructionRes,
        clientRes,
        clientHistoryRes,
      ] = await Promise.all([
        agentService.getAssignedProperties(),
        agentService.getAssignedPropertyRequests(),
        agentService.getAssignedSearchRequests(),
        agentService.getAssignedConstructionProjects(),
        agentService.getAssignedClientRequests(),
        agentService.getClientRequestHistory(),
      ]);

      const propertiesPayload = extractPayload(propertiesRes);
      const propertyReqPayload = extractPayload(propertyReqRes);
      const searchPayload = extractPayload(searchRes);
      const constructionPayload = extractPayload(constructionRes);
      const clientPayload = extractPayload(clientRes);
      const clientHistoryPayload = extractPayload(clientHistoryRes);

      setAssignedProperties(Array.isArray(propertiesPayload.data || propertiesPayload) ? (propertiesPayload.data || propertiesPayload) : []);
      setPropertyRequests(Array.isArray(propertyReqPayload.data || propertyReqPayload) ? (propertyReqPayload.data || propertyReqPayload) : []);
      setSearchRequests(Array.isArray(searchPayload.data || searchPayload) ? (searchPayload.data || searchPayload) : []);
      setConstructionProjects(Array.isArray(constructionPayload.data || constructionPayload) ? (constructionPayload.data || constructionPayload) : []);
      setClientRequests(Array.isArray(clientPayload.data || clientPayload) ? (clientPayload.data || clientPayload) : []);
      setClientHistory(Array.isArray(clientHistoryPayload.data || clientHistoryPayload) ? (clientHistoryPayload.data || clientHistoryPayload) : []);
    } catch (err) {
      console.error('Erreur chargement assignations agent:', err);
      setError('Impossible de charger les assignations.');
    } finally {
      setLoading(false);
    }
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
                        {item.status === 'rejected' && item.rejection_reason && (
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
                        {item.status === 'rejected' && item.rejection_reason && (
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
                        {item.status === 'rejected' && item.rejection_reason && (
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
                            {item.status === 'rejected' && item.rejection_reason && (
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
                            {item.status === 'rejected' && item.rejection_reason && (
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
    </div>
  );
};

export default AgentAssignments;
