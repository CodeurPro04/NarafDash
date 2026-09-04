import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeAgentType } from '../../utils/agentType';
import { formatFcfa, formatFcfaRange } from '../../utils/currency';
import { FileText, Flag, Handshake, Search as SearchIcon } from 'lucide-react';

const AgentSearchRequests = () => {
  const location = useLocation();
  const { user } = useAuth();
  const agentType = normalizeAgentType(user?.agent_type || user?.agentType);
  const currentView = new URLSearchParams(location.search).get('view') || 'assigned';
  const isHistoryView = currentView === 'history';

  const [assignedRequests, setAssignedRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingUuid, setProcessingUuid] = useState('');
  const [rejectModal, setRejectModal] = useState({ open: false, uuid: '', reason: '', error: '' });
  const [reportDrafts, setReportDrafts] = useState({});
  const [finalDrafts, setFinalDrafts] = useState({});
  const [conclusionModal, setConclusionModal] = useState({ open: false, uuid: '', item: null, error: '' });

  const workspaceLabel = agentType === 'constructeur'
    ? 'Agent construction'
    : agentType === 'investissement'
      ? 'Agent investissement'
      : 'Agent immobilier';

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [assignedRes, historyRes] = await Promise.all([
        agentService.getAssignedSearchRequests(),
        agentService.getSearchRequestHistory(),
      ]);
      const assignedPayload = extractPayload(assignedRes);
      const historyPayload = extractPayload(historyRes);
      setAssignedRequests(Array.isArray(assignedPayload?.data || assignedPayload) ? (assignedPayload?.data || assignedPayload) : []);
      setHistoryRequests(Array.isArray(historyPayload?.data || historyPayload) ? (historyPayload?.data || historyPayload) : []);
    } catch (err) {
      console.error('Erreur lors du chargement des demandes de recherche:', err);
      setError(err.response?.data?.message || 'Impossible de charger les demandes de recherche.');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status) => {
    const labels = {
      assigned: 'Assignee',
      approved: 'Approuvee',
      agent_approved: 'Acceptee par l agent',
      rejected: 'Refusee',
      agent_rejected: 'Refusee par l agent',
      fulfilled: 'Traitee',
      deal_concluded: 'Deal conclut',
      in_progress: 'En cours',
      pending: 'En attente',
    };
    return labels[status || 'pending'] || status || 'En attente';
  };

  const statusBadge = (status) => {
    const normalized = status || 'pending';
    if (['agent_approved', 'approved', 'fulfilled', 'deal_concluded'].includes(normalized)) {
      return { label: statusLabel(normalized), className: 'bg-emerald-100 text-emerald-700' };
    }
    if (['rejected', 'agent_rejected'].includes(normalized)) {
      return { label: statusLabel(normalized), className: 'bg-rose-100 text-rose-700' };
    }
    return { label: statusLabel(normalized), className: 'bg-amber-100 text-amber-700' };
  };

  const renderStatusPill = (status) => {
    const badge = statusBadge(status);
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const formatDateTime = (value) => {
    if (!value) return 'Non renseigne';
    return new Date(value).toLocaleString('fr-FR');
  };

  const formatBudget = (item) => formatFcfaRange(item?.budget_min, item?.budget_max, 'Non renseigne');

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

  const hasAcceptedFlow = (item) => ['agent_approved', 'deal_concluded'].includes(item.status);

  const handleApprove = async (uuid) => {
    try {
      setProcessingUuid(uuid);
      await agentService.approveSearchRequest(uuid);
      await loadData();
    } catch (err) {
      console.error('Erreur approbation recherche:', err);
      setError(err.response?.data?.message || 'Impossible d approuver cette demande.');
    } finally {
      setProcessingUuid('');
    }
  };

  const submitReject = async () => {
    const reason = rejectModal.reason.trim();
    if (!reason) {
      setRejectModal((prev) => ({ ...prev, error: 'Le motif du refus est obligatoire.' }));
      return;
    }

    try {
      setProcessingUuid(rejectModal.uuid);
      await agentService.rejectSearchRequest(rejectModal.uuid, { rejection_reason: reason });
      await loadData();
      setRejectModal({ open: false, uuid: '', reason: '', error: '' });
    } catch (err) {
      console.error('Erreur refus recherche:', err);
      setError(err.response?.data?.message || 'Impossible de refuser cette demande.');
    } finally {
      setProcessingUuid('');
    }
  };

  const submitProgressReport = async (item) => {
    const uuid = item?.uuid;
    const draft = reportDrafts[uuid] || {};
    const content = (draft.content || '').trim();
    if (!content) {
      setError('Le rapport d avancement doit contenir un detail.');
      return;
    }

    try {
      await agentService.addSearchRequestReport(uuid, {
        content,
        summary: draft.summary || '',
        client_feedback: draft.client_feedback || '',
        next_step: draft.next_step || '',
      });
      setReportDrafts((prev) => ({
        ...prev,
        [uuid]: { content: '', summary: '', client_feedback: '', next_step: '' },
      }));
      await loadData();
    } catch (err) {
      console.error('Erreur rapport recherche:', err);
      setError(err.response?.data?.message || 'Impossible d envoyer le rapport a l administration.');
    }
  };

  const submitFinalDeal = async (item) => {
    const uuid = item?.uuid;
    const draft = finalDrafts[uuid] || {};
    const content = (draft.content || '').trim();
    const closureNote = (draft.closure_note || '').trim();

    if (!content) {
      setError('Le rapport final est obligatoire pour conclure la recherche.');
      return;
    }
    if (!closureNote) {
      setConclusionModal((prev) => ({ ...prev, error: 'La note de conclusion est obligatoire.' }));
      return;
    }

    try {
      await agentService.concludeSearchRequestDeal(uuid, {
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
      await loadData();
    } catch (err) {
      console.error('Erreur conclusion recherche:', err);
      setConclusionModal((prev) => ({
        ...prev,
        error: err.response?.data?.message || 'Impossible d envoyer la conclusion a l administration.',
      }));
    }
  };

  const renderRequestCard = (item) => {
    const tracking = trackingFor(item);
    const deal = tracking.deal;
    const reports = tracking.events.filter((entry) => entry.type === 'progress_report');
    const locations = Array.isArray(item.location_preferences) ? item.location_preferences.filter(Boolean).join(', ') : 'Non renseigne';

    return (
      <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
        {isHistoryView ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.property_type?.name || item.propertyType?.name || 'Recherche personnalisee'}</p>
            {renderStatusPill(item.status || 'assigned')}
            <span className="chip">{item.transaction_type || 'Transaction non renseignee'}</span>
            {deal?.status === 'deal_concluded' && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Deal conclut
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
            <p className="text-[rgba(15,42,46,0.45)]">Client</p>
            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.user ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() : 'Client'}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
            <p className="text-[rgba(15,42,46,0.45)]">Email</p>
            <p className="mt-1 font-medium text-[rgb(var(--ink))] break-all">{item.user?.email || 'Non fourni'}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
            <p className="text-[rgba(15,42,46,0.45)]">Zones souhaitees</p>
            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{locations}</p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-3 py-3">
            <p className="text-[rgba(15,42,46,0.45)]">Budget</p>
            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatBudget(item)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
            <p className="text-[rgba(15,42,46,0.55)]">Chambres min</p>
            <p className="mt-2 font-medium text-[rgb(var(--ink))]">{item.bedrooms_min || 'Non renseigne'}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
            <p className="text-[rgba(15,42,46,0.55)]">Surface min</p>
            <p className="mt-2 font-medium text-[rgb(var(--ink))]">{item.surface_min || 'Non renseignee'}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4 sm:col-span-2">
            <p className="text-[rgba(15,42,46,0.55)]">Exigences</p>
            <p className="mt-2 font-medium text-[rgb(var(--ink))] whitespace-pre-wrap">{item.additional_requirements || 'Aucune exigence complementaire.'}</p>
          </div>
        </div>

        {item.status === 'assigned' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={processingUuid === item.uuid}
              onClick={() => handleApprove(item.uuid)}
            >
              {processingUuid === item.uuid ? 'Traitement...' : 'Accepter'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={processingUuid === item.uuid}
              onClick={() => setRejectModal({ open: true, uuid: item.uuid, reason: '', error: '' })}
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

        {hasAcceptedFlow(item) && (
          <div className="space-y-4 rounded-[28px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--ink))]">Suivi de la recherche</p>
                <p className="text-xs text-[rgba(15,42,46,0.55)]">
                  Consignez les avances, puis concluez la recherche avec un rapport final visible par l administration.
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
                    placeholder="Exemple: prospection lancee, options preparees, retour client..."
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
                    Conclusion de la recherche
                  </div>
                  <p className="text-xs text-emerald-800/80">
                    La conclusion passe par un modal avec rapport final envoye a l administration et visible en historique.
                  </p>
                  <button type="button" className="btn-primary" onClick={() => setConclusionModal({ open: true, uuid: item.uuid, item, error: '' })}>
                    Conclure la recherche
                  </button>
                </div>
              </div>
            )}

            {deal?.status === 'deal_concluded' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-emerald-800">Recherche conclue</p>
                  <span className="text-xs text-emerald-700">{formatDateTime(deal.concluded_at)}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[rgba(15,42,46,0.45)]">Montant</p>
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
      </div>
    );
  };

  const requests = useMemo(() => (isHistoryView ? historyRequests : assignedRequests), [isHistoryView, historyRequests, assignedRequests]);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">{workspaceLabel}</p>
              <h1 className="text-3xl font-semibold mt-3">
                {isHistoryView ? 'Historique des demandes de recherche' : 'Demandes de recherche assignees'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isHistoryView
                  ? 'Consultez les demandes de recherche traitees, les rapports envoyes et les recherches conclues visibles aussi par l administration.'
                  : 'Acceptez ou refusez la recherche, envoyez vos rapports d avancement puis concluez la recherche avec un rapport final.'}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <SearchIcon className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {isHistoryView ? 'Historique' : 'Demandes en cours'}
                </h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">
                  {isHistoryView ? 'Aucune demande de recherche dans l historique.' : 'Aucune demande de recherche assignee.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map(renderRequestCard)}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
          <div className="surface-card w-full max-w-xl p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">Refuser la demande</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Le motif du refus sera visible dans le suivi.
              </p>
            </div>
            <textarea
              rows={5}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value, error: '' }))}
              className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
              placeholder="Expliquez le motif du refus..."
            />
            {rejectModal.error && <p className="text-sm text-[rgb(var(--clay))]">{rejectModal.error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" disabled={processingUuid === rejectModal.uuid} onClick={() => setRejectModal({ open: false, uuid: '', reason: '', error: '' })}>
                Annuler
              </button>
              <button type="button" className="btn-primary" disabled={processingUuid === rejectModal.uuid} onClick={submitReject}>
                {processingUuid === rejectModal.uuid ? 'Traitement...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {conclusionModal.open && conclusionModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
          <div className="surface-card w-full max-w-2xl p-6 space-y-5">
            <div>
              <h3 className="text-xl font-semibold">Conclure la recherche</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Ce rapport final sera visible dans l historique agent, gestionnaire et administrateur.
              </p>
            </div>

            <textarea
              rows={5}
              value={finalDrafts[conclusionModal.uuid]?.content || ''}
              onChange={(e) => setFinalDrafts((prev) => ({
                ...prev,
                [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], content: e.target.value },
              }))}
              className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
              placeholder="Rapport final de la recherche..."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={finalDrafts[conclusionModal.uuid]?.sale_price || ''}
                onChange={(e) => setFinalDrafts((prev) => ({
                  ...prev,
                  [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], sale_price: e.target.value },
                }))}
                className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                placeholder="Montant / valeur finale"
              />
              <input
                type="text"
                value={finalDrafts[conclusionModal.uuid]?.next_step || ''}
                onChange={(e) => setFinalDrafts((prev) => ({
                  ...prev,
                  [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], next_step: e.target.value },
                }))}
                className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
                placeholder="Prochaine etape"
              />
            </div>
            <textarea
              rows={4}
              value={finalDrafts[conclusionModal.uuid]?.closure_note || ''}
              onChange={(e) => setFinalDrafts((prev) => ({
                ...prev,
                [conclusionModal.uuid]: { ...prev[conclusionModal.uuid], closure_note: e.target.value },
              }))}
              className="w-full rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3 text-sm"
              placeholder="Note de conclusion obligatoire..."
            />
            {conclusionModal.error && <p className="text-sm text-[rgb(var(--clay))]">{conclusionModal.error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setConclusionModal({ open: false, uuid: '', item: null, error: '' })}>
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

export default AgentSearchRequests;
