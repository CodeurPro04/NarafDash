import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeAgentType } from '../../utils/agentType';
import { formatFcfa, formatFcfaRange } from '../../utils/currency';
import {
  ClipboardList,
  Building,
  HardHat,
  Home,
  Users,
  FileText,
  Flag,
  Handshake,
} from 'lucide-react';

const AgentAssignments = () => {
  const { user } = useAuth();
  const location = useLocation();
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
  const [reportDrafts, setReportDrafts] = useState({});
  const [finalDrafts, setFinalDrafts] = useState({});
  const [conclusionModal, setConclusionModal] = useState({ open: false, uuid: '', item: null, error: '' });
  const currentView = new URLSearchParams(location.search).get('view');

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
  const clientTimeline = useMemo(
    () => [...clientRequests, ...clientHistory].reduce((acc, item) => {
      if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
      acc.push(item);
      return acc;
    }, []),
    [clientRequests, clientHistory]
  );
  const isConstructionClientRequest = (item) => (
    item?.request_type === 'construction'
    || item?.type === 'construction'
    || Boolean(item?.construction_project?.uuid || item?.constructionProject?.uuid)
  );
  const isInvestmentClientRequest = (item) => (
    item?.request_type === 'investissement'
    || item?.request_type === 'investment'
    || item?.type === 'investissement'
    || item?.type === 'investment'
    || Boolean(item?.investment_project?.uuid || item?.investmentProject?.uuid)
  );
  const isPropertyClientRequest = (item) => !isConstructionClientRequest(item) && !isInvestmentClientRequest(item);
  const isRelevantClientRequest = (item) => {
    if (agentType === 'constructeur') return isConstructionClientRequest(item);
    if (agentType === 'investissement') return isInvestmentClientRequest(item);
    return isPropertyClientRequest(item);
  };
  const clientAssignedFlow = useMemo(
    () => clientRequests.filter((item) => (
      item.status === 'assigned'
      && isRelevantClientRequest(item)
    )),
    [clientRequests, agentType]
  );
  const clientAssignedHistory = useMemo(
    () => clientHistory.filter((item) => (
      item.status !== 'assigned'
      && ['approved', 'agent_approved', 'rejected', 'agent_rejected', 'deal_concluded'].includes(item.status)
      && isRelevantClientRequest(item)
    )),
    [clientHistory, agentType]
  );
  const isPropertyAssignedView = agentType === 'immobilier' && currentView === 'properties';
  const isClientAssignedView = ['immobilier', 'constructeur', 'investissement'].includes(agentType) && currentView === 'clients';
  const isClientHistoryView = ['immobilier', 'constructeur', 'investissement'].includes(agentType) && currentView === 'history';
  const showConstructionWorkspace = agentType === 'constructeur';

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

  const statusLabel = (status) => {
    const normalized = status || 'pending';
    const labels = {
      pending: 'En attente',
      assigned: 'Assigne',
      approved: 'Accepte',
      agent_approved: 'Accepte par l agent',
      rejected: 'Refuse',
      agent_rejected: 'Refuse par l agent',
      fulfilled: 'Traite',
      completed: 'Termine',
      published: 'Publie',
      archived: 'Archive',
      submitted: 'Soumis',
      in_study: 'En etude',
      in_progress: 'En cours',
      quoted: 'Devis envoye',
    };

    return labels[normalized] || normalized;
  };

  const statusBadge = (status) => {
    const normalized = status || 'pending';
    if (['approved', 'agent_approved', 'fulfilled', 'completed', 'published'].includes(normalized)) {
      return { label: statusLabel(normalized), className: 'bg-emerald-100 text-emerald-700' };
    }
    if (['rejected', 'agent_rejected', 'archived'].includes(normalized)) {
      return { label: statusLabel(normalized), className: 'bg-rose-100 text-rose-700' };
    }
    if (['assigned', 'pending', 'submitted', 'in_study', 'in_progress', 'quoted'].includes(normalized)) {
      return { label: statusLabel(normalized), className: 'bg-amber-100 text-amber-700' };
    }
    return { label: statusLabel(normalized), className: 'bg-slate-100 text-slate-700' };
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
    if (status === 'agent_approved') return 'Accepte par l agent';
    if (status === 'agent_rejected') return 'Refuse par l agent';
    if (status === 'rejected') return 'Refuse';
    if (status === 'approved') return 'Accepte';
    return 'En attente';
  };

  const requestTypeLabel = (type) => {
    if (type === 'construction') return 'Construction';
    if (type === 'investissement') return 'Investissement';
    return 'Immobilier';
  };

  const formatDateTime = (value) => {
    if (!value) return 'Non renseigne';
    return new Date(value).toLocaleString('fr-FR');
  };

  const clientTargetLabel = (item) => (
    item.property?.title
    || item.construction_project?.title
    || item.constructionProject?.title
    || item.investment_project?.title
    || item.investmentProject?.title
    || 'Sans cible'
  );

  const trackingFor = (item) => {
    const reports = Array.isArray(item?.reports) ? item.reports : [];
    return {
      events: reports.map((report) => ({
        id: report.id || report.uuid || `${report.report_type}-${report.created_at}`,
        type: report.report_type,
        content: report.content,
        meta: {
          summary: report.summary || '',
          client_feedback: report.client_feedback || '',
          next_step: report.next_step || '',
          sale_price: report.sale_price || '',
          closure_note: report.closure_note || '',
        },
        created_at: report.created_at,
        author: report.agent ? `${report.agent.first_name || ''} ${report.agent.last_name || ''}`.trim() : 'Agent',
      })),
      deal: item?.deal_status === 'deal_concluded' || item?.status === 'deal_concluded'
        ? {
            status: 'deal_concluded',
            concluded_at: item.deal_concluded_at,
            sale_price: item.deal_sale_price || '',
            final_report: reports.find((report) => report.report_type === 'final_report')?.content || '',
            closure_note: item.deal_closure_note || '',
          }
        : null,
    };
  };
  const hasAcceptedClientFlow = (item) => ['approved', 'agent_approved', 'deal_concluded'].includes(item.status);

  const submitProgressReport = async (item) => {
    const uuid = item?.uuid;
    const draft = reportDrafts[uuid] || {};
    const content = (draft.content || '').trim();
    if (!content) {
      setError('Le rapport d\'avancement doit contenir un detail.');
      return;
    }

    try {
      await agentService.addClientRequestReport(uuid, {
        content,
        summary: draft.summary || '',
        client_feedback: draft.client_feedback || '',
        next_step: draft.next_step || '',
      });

      setReportDrafts((prev) => ({
        ...prev,
        [uuid]: { content: '', summary: '', client_feedback: '', next_step: '' },
      }));
      await loadAll();
    } catch (err) {
      console.error('Erreur envoi rapport client:', err);
      setError(err.response?.data?.message || 'Impossible d envoyer le rapport a l administrateur.');
    }
  };

  const submitFinalDeal = async (item) => {
    const uuid = item?.uuid;
    const draft = finalDrafts[uuid] || {};
    const content = (draft.content || '').trim();
    const closureNote = (draft.closure_note || '').trim();
    if (!content) {
      setError('Le rapport final est obligatoire pour conclure le deal.');
      return;
    }
    if (!closureNote) {
      setConclusionModal((prev) => ({ ...prev, error: 'La note de conclusion est obligatoire.' }));
      return;
    }

    try {
      await agentService.concludeClientRequestDeal(uuid, {
        content,
        sale_price: draft.sale_price || '',
        closure_note: closureNote,
        next_step: draft.next_step || '',
      });

      setFinalDrafts((prev) => ({
        ...prev,
        [uuid]: { content: '', sale_price: '', closure_note: '', next_step: '' },
      }));
      setConclusionModal({ open: false, uuid: '', item: null, error: '' });
      await loadAll();
    } catch (err) {
      console.error('Erreur conclusion offre client:', err);
      setConclusionModal((prev) => ({
        ...prev,
        error: err.response?.data?.message || 'Impossible d envoyer la conclusion a l administrateur.',
      }));
    }
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
  const openConclusionModal = (item) => {
    setConclusionModal({ open: true, uuid: item?.uuid || '', item, error: '' });
  };
  const closeConclusionModal = () => {
    setConclusionModal({ open: false, uuid: '', item: null, error: '' });
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
              <h1 className="text-3xl font-semibold mt-3">
                {isPropertyAssignedView
                  ? 'Proprietes assignees'
                  : isClientAssignedView
                    ? 'Clients assignes'
                    : isClientHistoryView
                      ? 'Historique clients assignes'
                      : 'Assignations'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isPropertyAssignedView
                  ? 'Consultez uniquement les proprietes immobilieres qui vous sont assignees.'
                  : isClientAssignedView
                    ? showConstructionWorkspace
                      ? 'Consultez, acceptez ou refusez vos dossiers clients lies a la construction, puis transmettez vos rapports a l administrateur.'
                      : agentType === 'investissement'
                        ? 'Consultez, acceptez ou refusez vos dossiers clients lies a l investissement, puis transmettez vos rapports a l administrateur.'
                      : 'Consultez, acceptez ou refusez vos clients assignes, puis transmettez vos rapports a l administrateur.'
                    : isClientHistoryView
                      ? 'Consultez les clients assignes deja traites, les rapports envoyes et les deals conclus visibles aussi par l administration.'
                      : 'Tout ce qui vous est assigne, avec un suivi clair et l\'historique.'}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {!isPropertyAssignedView && !isClientAssignedView && !isClientHistoryView && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="surface-panel p-5">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">Proprietes assignees</p>
                  <p className="text-2xl font-semibold mt-2">{assignedProperties.length}</p>
                  <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                    {propertyPendingCount} en attente de validation
                  </p>
                </div>
                <div className="surface-panel p-5">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">Clients</p>
                  <p className="text-2xl font-semibold mt-2">{clientAssignedFlow.length}</p>
                  <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                    {clientAssignedFlow.filter((item) => item.status === 'deal_concluded').length} conclus
                  </p>
                </div>
                <div className="surface-panel p-5">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">
                    {showConstructionWorkspace ? 'Construction & recherche' : 'Demandes de recherche'}
                  </p>
                  <p className="text-2xl font-semibold mt-2">
                    {showConstructionWorkspace ? constructionActive.length + searchRequests.length : searchRequests.length}
                  </p>
                  <p className="text-xs text-[rgba(15,42,46,0.45)] mt-1">
                    {showConstructionWorkspace ? 'Dossiers a traiter' : 'Dossiers immobiliers a traiter'}
                  </p>
                </div>
              </div>
            )}

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {isPropertyAssignedView
                    ? 'Proprietes immobilieres assignees'
                    : isClientAssignedView
                      ? 'Clients assignes'
                      : isClientHistoryView
                        ? 'Historique clients assignes'
                        : 'Assignations & Historique'}
                </h2>
              </div>
              {!isPropertyAssignedView && !isClientAssignedView && !isClientHistoryView && (
                <div className="flex flex-wrap gap-2">
                  {tabButton('clients', 'Clients', clientRequests.length)}
                  {tabButton('properties', 'Proprietes', assignedProperties.length)}
                  {tabButton('property-requests', 'Demandes propriete', propertyRequests.length)}
                  {tabButton('search', 'Recherche', searchRequests.length)}
                  {showConstructionWorkspace && tabButton('construction', 'Construction', constructionActive.length)}
                  {tabButton('history', 'Historique', clientHistory.length + constructionHistory.length)}
                </div>
              )}

              {isPropertyAssignedView && (
                loading ? renderEmpty('Chargement...') : assignedProperties.length === 0 ? (
                  renderEmpty('Aucune propriete immobiliere assignee.')
                ) : (
                  <div className="space-y-3">
                    {assignedProperties.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          {renderStatusPill(item.status || 'pending')}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Ville</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.city || 'Non renseignee'}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Transaction</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.transaction_type || 'Non renseignee'}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Prix</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">
                              {item.price ? Number(item.price).toLocaleString('fr-FR') : 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Decision</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{decisionLabel(item.status)}</p>
                          </div>
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

              {isClientAssignedView && (
                loading ? renderEmpty('Chargement...') : clientAssignedFlow.length === 0 ? (
                  renderEmpty('Aucun client assigne.')
                ) : (
                  <div className="space-y-3">
                    {clientAssignedFlow.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
                        {(() => {
                          const tracking = trackingFor(item);
                          const deal = tracking.deal;
                          const reports = tracking.events.filter((entry) => entry.type === 'progress_report');

                          return (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{item.name}</p>
                                <span className="chip">Type: {requestTypeLabel(item.request_type)}</span>
                                {renderStatusPill(item.status || 'assigned')}
                                {deal?.status === 'deal_concluded' && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    Deal conclut
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.message}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Email</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))] break-all">{item.email || 'Non fourni'}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Telephone</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.phone || 'Non fourni'}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Cible</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{clientTargetLabel(item)}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Decision</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{decisionLabel(item.status)}</p>
                                </div>
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
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                                  <p className="font-semibold">Motif du refus</p>
                                  <p className="mt-2 whitespace-pre-wrap">{item.rejection_reason}</p>
                                </div>
                              )}
                              {hasAcceptedClientFlow(item) && (
                                <div className="space-y-4 rounded-[28px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-[rgb(var(--ink))]">Suivi du client</p>
                                      <p className="text-xs text-[rgba(15,42,46,0.55)]">
                                        Enregistrez vos echanges avec le client et envoyez vos rapports a l administrateur.
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-[rgba(15,42,46,0.55)]">
                                      <span className="chip">{reports.length} rapport{reports.length > 1 ? 's' : ''}</span>
                                      <span className="chip">{deal?.status === 'deal_concluded' ? 'Clos' : 'En suivi'}</span>
                                    </div>
                                  </div>

                                  {reports.length > 0 && (
                                    <div className="space-y-3">
                                      {reports.map((report) => (
                                        <div key={report.id} className="rounded-2xl border border-[rgb(var(--line))] bg-[rgba(245,248,248,0.9)] px-4 py-4">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--ink))]">
                                              <FileText className="h-4 w-4" />
                                              Rapport d'avancement
                                            </div>
                                            <span className="text-xs text-[rgba(15,42,46,0.45)]">{formatDateTime(report.created_at)}</span>
                                          </div>
                                          <p className="mt-3 text-sm text-[rgba(15,42,46,0.72)] whitespace-pre-wrap">{report.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {deal?.status !== 'deal_concluded' && (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                      <div className="rounded-2xl border border-[rgb(var(--line))] bg-[rgba(248,250,250,0.95)] p-4 space-y-3">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--ink))]">
                                          <Flag className="h-4 w-4" />
                                          Ajouter un rapport d'avancement
                                        </div>
                                        <textarea
                                          rows={4}
                                          value={reportDrafts[item.uuid]?.content || ''}
                                          onChange={(e) => setReportDrafts((prev) => ({
                                            ...prev,
                                            [item.uuid]: { ...prev[item.uuid], content: e.target.value },
                                          }))}
                                          className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                          placeholder="Discussion avec le client, avancee du dossier, visite, conditions..."
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <input
                                            type="text"
                                            value={reportDrafts[item.uuid]?.summary || ''}
                                            onChange={(e) => setReportDrafts((prev) => ({
                                              ...prev,
                                              [item.uuid]: { ...prev[item.uuid], summary: e.target.value },
                                            }))}
                                            className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                            placeholder="Resume"
                                          />
                                          <input
                                            type="text"
                                            value={reportDrafts[item.uuid]?.client_feedback || ''}
                                            onChange={(e) => setReportDrafts((prev) => ({
                                              ...prev,
                                              [item.uuid]: { ...prev[item.uuid], client_feedback: e.target.value },
                                            }))}
                                            className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                            placeholder="Retour du client"
                                          />
                                        </div>
                                        <input
                                          type="text"
                                          value={reportDrafts[item.uuid]?.next_step || ''}
                                          onChange={(e) => setReportDrafts((prev) => ({
                                            ...prev,
                                            [item.uuid]: { ...prev[item.uuid], next_step: e.target.value },
                                          }))}
                                          className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                          placeholder="Prochaine etape"
                                        />
                                        <button type="button" className="btn-primary" onClick={() => submitProgressReport(item)}>
                                          Envoyer le rapport a l administrateur
                                        </button>
                                      </div>

                                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                          <Handshake className="h-4 w-4" />
                                          Conclusion de l offre
                                        </div>
                                        <p className="text-xs text-emerald-800/80">
                                          La conclusion passe par un modal obligatoire avec rapport final envoye a l administrateur.
                                        </p>
                                        <button type="button" className="btn-primary" onClick={() => openConclusionModal(item)}>
                                          Conclure l offre
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {deal?.status === 'deal_concluded' && (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-emerald-800">Offre conclue</p>
                                        <span className="text-xs text-emerald-700">{formatDateTime(deal.concluded_at)}</span>
                                      </div>
                                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        <div className="rounded-2xl bg-white px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Prix final</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatFcfa(deal.sale_price, 'Non renseigne')}</p>
                                        </div>
                                        <div className="rounded-2xl bg-white px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Statut</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">Offre conclue</p>
                                        </div>
                                        <div className="rounded-2xl bg-white px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Rapport final</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{deal.final_report || 'Non renseigne'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )
              )}

              {isClientHistoryView && (
                loading ? renderEmpty('Chargement...') : clientAssignedHistory.length === 0 ? (
                  renderEmpty('Aucun historique client assigne.')
                ) : (
                  <div className="space-y-3">
                    {clientAssignedHistory.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
                        {(() => {
                          const tracking = trackingFor(item);
                          const deal = tracking.deal;
                          const reports = tracking.events.filter((entry) => entry.type === 'progress_report');
                          return (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{item.name}</p>
                                <span className="chip">Type: {requestTypeLabel(item.request_type)}</span>
                                {renderStatusPill(item.status || 'assigned')}
                                {deal?.status === 'deal_concluded' && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    Deal conclut
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.message}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Email</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))] break-all">{item.email || 'Non fourni'}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Telephone</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.phone || 'Non fourni'}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Cible</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{clientTargetLabel(item)}</p>
                                </div>
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                                  <p className="text-[rgba(15,42,46,0.45)]">Decision</p>
                                  <p className="mt-1 font-medium text-[rgb(var(--ink))]">{decisionLabel(item.status)}</p>
                                </div>
                              </div>
                              {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
                                <button
                                  type="button"
                                  className="btn-ghost text-[rgb(var(--clay))]"
                                  onClick={() => openReasonModal('Motif du refus client', item.rejection_reason)}
                                >
                                  Voir le motif
                                </button>
                              )}
                              <div className="space-y-4 rounded-[28px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-[rgb(var(--ink))]">Historique du client</p>
                                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Consultez les rapports d'avancement et la conclusion finale envoyes a l'administration.</p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-[rgba(15,42,46,0.55)]">
                                    <span className="chip">{reports.length} rapport{reports.length > 1 ? 's' : ''}</span>
                                    <span className="chip">{deal?.status === 'deal_concluded' ? 'Clos' : 'Archive'}</span>
                                  </div>
                                </div>
                                {reports.length > 0 ? (
                                  <div className="space-y-3">
                                    {reports.map((report) => (
                                      <div key={report.id} className="rounded-2xl border border-[rgb(var(--line))] bg-[rgba(245,248,248,0.9)] px-4 py-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--ink))]">
                                            <FileText className="h-4 w-4" />
                                            Rapport d'avancement
                                          </div>
                                          <span className="text-xs text-[rgba(15,42,46,0.45)]">{formatDateTime(report.created_at)}</span>
                                        </div>
                                        <p className="mt-3 text-sm text-[rgba(15,42,46,0.72)] whitespace-pre-wrap">{report.content}</p>
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                          <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Resume</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.summary || 'Non renseigne'}</p></div>
                                          <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Retour client</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.client_feedback || 'Non renseigne'}</p></div>
                                          <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Prochaine etape</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.next_step || 'Non renseigne'}</p></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-[rgba(15,42,46,0.55)]">Aucun rapport d'avancement enregistre.</p>
                                )}
                                {deal?.status === 'deal_concluded' ? (
                                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-emerald-800">Deal conclut</p>
                                      <span className="text-xs text-emerald-700">{formatDateTime(deal.concluded_at)}</span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Prix final</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatFcfa(deal.sale_price, 'Non renseigne')}</p></div>
                                      <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Statut</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">Offre conclue</p></div>
                                      <div className="rounded-2xl bg-white px-3 py-3"><p className="text-[rgba(15,42,46,0.45)]">Rapport final</p><p className="mt-1 font-medium text-[rgb(var(--ink))]">{deal.final_report || 'Non renseigne'}</p></div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-[rgba(15,42,46,0.55)]">Dossier archive sans conclusion finale.</p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )
              )}

              {!isPropertyAssignedView && !isClientAssignedView && !isClientHistoryView && activeTab === 'clients' && (
                loading ? renderEmpty('Chargement...') : clientRequests.length === 0 ? (
                  renderEmpty('Aucune demande client assignee.')
                ) : (
                  <div className="space-y-3">
                    {clientRequests.map((item) => (
                      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
                        {(() => {
                          const tracking = trackingFor(item);
                          const deal = tracking.deal;
                          const reports = tracking.events.filter((entry) => entry.type === 'progress_report');

                          return (
                            <>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.name}</p>
                          <span className="chip">Type: {requestTypeLabel(item.request_type)}</span>
                          {renderStatusPill(item.status || 'assigned')}
                          {deal?.status === 'deal_concluded' && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Deal conclut
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{item.message}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Email</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))] break-all">{item.email || 'Non fourni'}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Telephone</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.phone || 'Non fourni'}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Cible</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{clientTargetLabel(item)}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Decision</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{decisionLabel(item.status)}</p>
                          </div>
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
                        {hasAcceptedClientFlow(item) && (
                          <div className="space-y-4 rounded-[28px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[rgb(var(--ink))]">Suivi du client</p>
                                <p className="text-xs text-[rgba(15,42,46,0.55)]">
                                  Consignez chaque avancee avec le client, puis concluez le deal avec un rapport final.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[rgba(15,42,46,0.55)]">
                                <span className="chip">{reports.length} rapport{reports.length > 1 ? 's' : ''}</span>
                                <span className="chip">{deal?.status === 'deal_concluded' ? 'Clos' : 'En suivi'}</span>
                              </div>
                            </div>

                            {reports.length > 0 && (
                              <div className="space-y-3">
                                {reports.map((report) => (
                                  <div key={report.id} className="rounded-2xl border border-[rgb(var(--line))] bg-[rgba(245,248,248,0.9)] px-4 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--ink))]">
                                        <FileText className="h-4 w-4" />
                                        Rapport d'avancement
                                      </div>
                                      <span className="text-xs text-[rgba(15,42,46,0.45)]">{formatDateTime(report.created_at)}</span>
                                    </div>
                                    <p className="mt-3 text-sm text-[rgba(15,42,46,0.72)] whitespace-pre-wrap">{report.content}</p>
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                      <div className="rounded-2xl bg-white px-3 py-3">
                                        <p className="text-[rgba(15,42,46,0.45)]">Resume</p>
                                        <p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.summary || 'Non renseigne'}</p>
                                      </div>
                                      <div className="rounded-2xl bg-white px-3 py-3">
                                        <p className="text-[rgba(15,42,46,0.45)]">Retour client</p>
                                        <p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.client_feedback || 'Non renseigne'}</p>
                                      </div>
                                      <div className="rounded-2xl bg-white px-3 py-3">
                                        <p className="text-[rgba(15,42,46,0.45)]">Prochaine etape</p>
                                        <p className="mt-1 font-medium text-[rgb(var(--ink))]">{report.meta?.next_step || 'Non renseigne'}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {deal?.status !== 'deal_concluded' && (
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-[rgb(var(--line))] bg-[rgba(248,250,250,0.95)] p-4 space-y-3">
                                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--ink))]">
                                    <Flag className="h-4 w-4" />
                                    Ajouter un rapport d'avancement
                                  </div>
                                  <textarea
                                    rows={4}
                                    value={reportDrafts[item.uuid]?.content || ''}
                                    onChange={(e) => setReportDrafts((prev) => ({
                                      ...prev,
                                      [item.uuid]: { ...prev[item.uuid], content: e.target.value },
                                    }))}
                                    className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                    placeholder="Exemple: echange avec le client, visite realisee, conditions discutees..."
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      value={reportDrafts[item.uuid]?.summary || ''}
                                      onChange={(e) => setReportDrafts((prev) => ({
                                        ...prev,
                                        [item.uuid]: { ...prev[item.uuid], summary: e.target.value },
                                      }))}
                                      className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                      placeholder="Resume court"
                                    />
                                    <input
                                      type="text"
                                      value={reportDrafts[item.uuid]?.client_feedback || ''}
                                      onChange={(e) => setReportDrafts((prev) => ({
                                        ...prev,
                                        [item.uuid]: { ...prev[item.uuid], client_feedback: e.target.value },
                                      }))}
                                      className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                      placeholder="Retour du client"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={reportDrafts[item.uuid]?.next_step || ''}
                                    onChange={(e) => setReportDrafts((prev) => ({
                                      ...prev,
                                      [item.uuid]: { ...prev[item.uuid], next_step: e.target.value },
                                    }))}
                                    className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                                    placeholder="Prochaine etape"
                                  />
                                  <button type="button" className="btn-primary" onClick={() => submitProgressReport(item)}>
                                    Enregistrer le rapport
                                  </button>
                                </div>

                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
                                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                    <Handshake className="h-4 w-4" />
                                    Conclusion de l offre
                                  </div>
                                  <p className="text-xs text-emerald-800/80">
                                    La conclusion passe par un modal obligatoire avec rapport final envoye a l administrateur.
                                  </p>
                                  <button type="button" className="btn-primary" onClick={() => openConclusionModal(item)}>
                                    Conclure l offre
                                  </button>
                                </div>
                              </div>
                            )}

                            {deal?.status === 'deal_concluded' && (
                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-emerald-800">Deal conclut</p>
                                  <span className="text-xs text-emerald-700">{formatDateTime(deal.concluded_at)}</span>
                                </div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                  <div className="rounded-2xl bg-white px-3 py-3">
                                    <p className="text-[rgba(15,42,46,0.45)]">Prix final</p>
                                    <p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatFcfa(deal.sale_price, 'Non renseigne')}</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-3">
                                    <p className="text-[rgba(15,42,46,0.45)]">Statut</p>
                                    <p className="mt-1 font-medium text-[rgb(var(--ink))]">Deal conclut</p>
                                  </div>
                                  <div className="rounded-2xl bg-white px-3 py-3">
                                    <p className="text-[rgba(15,42,46,0.45)]">Rapport final</p>
                                    <p className="mt-1 font-medium text-[rgb(var(--ink))]">{deal.final_report || 'Non renseigne'}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )
              )}

              {!isPropertyAssignedView && activeTab === 'properties' && (
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

              {!isPropertyAssignedView && activeTab === 'property-requests' && (
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

              {!isPropertyAssignedView && activeTab === 'search' && (
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
                          Budget: {formatFcfaRange(item.budget_min, item.budget_max)}
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

              {!isPropertyAssignedView && showConstructionWorkspace && activeTab === 'construction' && (
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

              {!isPropertyAssignedView && activeTab === 'history' && (
                loading ? renderEmpty('Chargement...') : (
                  <div className={`grid grid-cols-1 ${showConstructionWorkspace ? 'xl:grid-cols-2' : ''} gap-4`}>
                    {showConstructionWorkspace && (
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
                    )}
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

      {conclusionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Conclure l offre</h3>
            <p className="mt-2 text-sm text-[rgba(15,42,46,0.6)]">
              Le rapport final et la note de conclusion sont obligatoires avant envoi a l administrateur.
            </p>
            <div className="mt-4 space-y-3">
              <textarea
                rows={4}
                value={finalDrafts[conclusionModal.uuid]?.content || ''}
                onChange={(e) => setFinalDrafts((prev) => ({
                  ...prev,
                  [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], content: e.target.value },
                }))}
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm"
                placeholder="Rapport final: le client a achete, les conditions ont ete validees..."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={finalDrafts[conclusionModal.uuid]?.sale_price || ''}
                  onChange={(e) => setFinalDrafts((prev) => ({
                    ...prev,
                    [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], sale_price: e.target.value },
                  }))}
                  className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm"
                  placeholder="Prix final"
                />
                <input
                  type="text"
                  value={finalDrafts[conclusionModal.uuid]?.next_step || ''}
                  onChange={(e) => setFinalDrafts((prev) => ({
                    ...prev,
                    [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], next_step: e.target.value },
                  }))}
                  className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm"
                  placeholder="Cloture / formalite"
                />
              </div>
              <input
                type="text"
                value={finalDrafts[conclusionModal.uuid]?.closure_note || ''}
                onChange={(e) => setFinalDrafts((prev) => ({
                  ...prev,
                  [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], closure_note: e.target.value },
                }))}
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm"
                placeholder="Note de conclusion obligatoire"
              />
              {conclusionModal.error && (
                <p className="text-xs text-[rgb(var(--clay))]">{conclusionModal.error}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={closeConclusionModal}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={() => submitFinalDeal(conclusionModal.item)}>
                Envoyer la conclusion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentAssignments;




