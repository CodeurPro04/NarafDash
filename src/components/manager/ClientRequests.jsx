import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import {
  adminService,
  managerService,
  publicPropertyService,
  publicConstructionService,
  publicInvestmentService,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, FileText, CheckCircle, XCircle, Mail, Phone, Clock3, Handshake, ScrollText, Search } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { formatFcfa } from '../../utils/currency';

const ClientRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('tous');
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, reason: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, item: null });
  const [propertyDetails, setPropertyDetails] = useState({});
  const [constructionDetails, setConstructionDetails] = useState({});
  const [investmentDetails, setInvestmentDetails] = useState({});
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const currentView = new URLSearchParams(location.search).get('view') || 'pending';
  const isHistoryView = currentView === 'history';

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const typeLabel = (type) => (
    type === 'construction' ? 'Construction'
      : type === 'investissement' ? 'Investissement'
        : type === 'recherche' ? 'Recherche'
          : 'Immobilier'
  );
  const typeBadgeClass = (type) => (
    type === 'construction'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : type === 'investissement'
        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
        : type === 'recherche'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-sky-100 text-sky-800 border-sky-200'
  );
  const requiredAgentType = (type) => (
    type === 'construction' ? 'constructeur'
      : type === 'investissement' ? 'investissement'
        : 'immobilier'
  );
  const relatedLabel = (item) => (
    item.property?.title
    || item.construction_project?.title
    || item.constructionProject?.title
    || item.investment_project?.title
    || item.investmentProject?.title
    || item.propertyType?.name
    || item.property_type?.name
    || null
  );
  const getMediaCandidate = (media) => media?.url || media?.file_path || media?.public_url || media?.secure_url || '';
  const getPropertyImage = (property) => (
    getMediaCandidate(property?.primary_image || property?.primaryImage)
    || getMediaCandidate(property?.media?.[0])
  );
  const getCollectionImage = (item) => {
    if (Array.isArray(item?.images_path) && item.images_path.length > 0) {
      return item.images_path[0];
    }
    return (
      getMediaCandidate(item?.cover_image)
      || getMediaCandidate(item?.primary_image || item?.primaryImage)
      || getMediaCandidate(item?.media?.[0])
      || ''
    );
  };
  const normalizeSearchRequest = (item) => {
    const locations = Array.isArray(item?.location_preferences) ? item.location_preferences.filter(Boolean).join(', ') : '';
    const requirements = [
      item?.transaction_type ? `Transaction: ${item.transaction_type}` : '',
      locations ? `Zones: ${locations}` : '',
      item?.bedrooms_min ? `Chambres min: ${item.bedrooms_min}` : '',
      item?.surface_min ? `Surface min: ${item.surface_min}` : '',
      item?.budget_min ? `Budget min: ${item.budget_min}` : '',
      item?.budget_max ? `Budget max: ${item.budget_max}` : '',
      item?.additional_requirements || '',
    ].filter(Boolean).join(' | ');

    return {
      ...item,
      entry_kind: 'search_request',
      request_type: 'recherche',
      name: item?.user ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() : (item?.name || 'Client'),
      email: item?.user?.email || item?.email || '',
      phone: item?.user?.phone || item?.phone || '',
      message: requirements || 'Demande de recherche immobiliere',
      propertyType: item?.propertyType || item?.property_type || null,
    };
  };

  const getTargetPreview = (item) => {
    const propertyUuid = item.property?.uuid || item.property_uuid || item.property?.id;
    const resolvedProperty = propertyDetails[propertyUuid] || item.property;
    if (resolvedProperty) {
      return {
        label: resolvedProperty.title || 'Propriete',
        image: getPropertyImage(resolvedProperty),
        type: 'property',
      };
    }

    const construction = item.construction_project || item.constructionProject;
    const constructionUuid = construction?.uuid || item.construction_project_uuid || item.construction_uuid || construction?.id;
    const resolvedConstruction = constructionDetails[constructionUuid] || construction;
    if (construction) {
      return {
        label: resolvedConstruction?.title || 'Projet de construction',
        image: getCollectionImage(resolvedConstruction),
        type: 'construction',
      };
    }

    const investment = item.investment_project || item.investmentProject;
    const investmentUuid = investment?.uuid || item.investment_project_uuid || item.investment_uuid || investment?.id;
    const resolvedInvestment = investmentDetails[investmentUuid] || investment;
    if (investment) {
      return {
        label: resolvedInvestment?.title || 'Projet d investissement',
        image: getCollectionImage(resolvedInvestment),
        type: 'investment',
      };
    }

    if (item.entry_kind === 'search_request') {
      return {
        label: item.propertyType?.name || 'Recherche immobiliere',
        image: '',
        type: 'search',
      };
    }

    return {
      label: 'Sans cible',
      image: '',
      type: 'none',
    };
  };
  const formatDateTime = (value) => {
    if (!value) return 'Non renseignee';
    return new Date(value).toLocaleString('fr-FR');
  };
  const statusLabel = (status, tracking) => {
    if (tracking?.deal?.status === 'deal_concluded') return 'Deal conclut';
    if (status === 'agent_approved' || status === 'approved') return 'Acceptee';
    if (status === 'agent_rejected' || status === 'rejected') return 'Refusee';
    if (status === 'assigned') return 'Assignee';
    if (status === 'fulfilled') return 'Traitee';
    if (status === 'pending') return 'En attente';
    return status || 'Non renseigne';
  };
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, pendingRes, historyRes, pendingSearchRes, historySearchRes] = await Promise.all([
        service.getAvailableAgents(),
        service.getPendingClientRequests(),
        service.getClientRequestHistory(),
        service.getPendingSearchRequests(),
        service.getSearchRequestHistory(),
      ]);
      const agentsList = extractPayload(agentsRes);
      const pendingPayload = extractPayload(pendingRes);
      const historyPayload = extractPayload(historyRes);
      const pendingSearchPayload = extractPayload(pendingSearchRes);
      const historySearchPayload = extractPayload(historySearchRes);

      setAgents(Array.isArray(agentsList) ? agentsList : []);
      const pendingList = Array.isArray(pendingPayload.data || pendingPayload) ? (pendingPayload.data || pendingPayload) : [];
      const historyList = Array.isArray(historyPayload.data || historyPayload) ? (historyPayload.data || historyPayload) : [];
      const pendingSearchList = (Array.isArray(pendingSearchPayload.data || pendingSearchPayload) ? (pendingSearchPayload.data || pendingSearchPayload) : []).map(normalizeSearchRequest);
      const historySearchList = (Array.isArray(historySearchPayload.data || historySearchPayload) ? (historySearchPayload.data || historySearchPayload) : []).map(normalizeSearchRequest);
      setRequests([...pendingList, ...pendingSearchList]);
      setHistory([...historyList, ...historySearchList]);

      const propertyUuids = [...pendingList, ...historyList]
        .map((item) => item.property?.uuid || item.property_uuid || item.property?.id)
        .filter(Boolean)
        .filter((uuid, index, array) => array.indexOf(uuid) === index);
      const constructionUuids = [...pendingList, ...historyList]
        .map((item) => (
          item.construction_project?.uuid
          || item.constructionProject?.uuid
          || item.construction_project_uuid
          || item.construction_uuid
          || item.construction_project?.id
          || item.constructionProject?.id
        ))
        .filter(Boolean)
        .filter((uuid, index, array) => array.indexOf(uuid) === index);
      const investmentUuids = [...pendingList, ...historyList]
        .map((item) => (
          item.investment_project?.uuid
          || item.investmentProject?.uuid
          || item.investment_project_uuid
          || item.investment_uuid
          || item.investment_project?.id
          || item.investmentProject?.id
        ))
        .filter(Boolean)
        .filter((uuid, index, array) => array.indexOf(uuid) === index);

      if (propertyUuids.length > 0) {
        const propertyResults = await Promise.allSettled(
          propertyUuids.map((uuid) => publicPropertyService.getById(uuid))
        );

        const nextDetails = propertyResults.reduce((acc, result, index) => {
          if (result.status !== 'fulfilled') return acc;
          const payload = extractPayload(result.value);
          const property = payload?.data || payload;
          if (property && typeof property === 'object') {
            acc[propertyUuids[index]] = property;
          }
          return acc;
        }, {});

        setPropertyDetails(nextDetails);
      } else {
        setPropertyDetails({});
      }

      if (constructionUuids.length > 0) {
        const constructionResponse = await publicConstructionService.getAll();
        const constructionPayload = extractPayload(constructionResponse);
        const constructionList = Array.isArray(constructionPayload?.data || constructionPayload)
          ? (constructionPayload?.data || constructionPayload)
          : [];
        const nextConstructionDetails = constructionList.reduce((acc, project) => {
          const uuid = project?.uuid || project?.id;
          if (uuid && constructionUuids.includes(uuid)) {
            acc[uuid] = project;
          }
          return acc;
        }, {});
        setConstructionDetails(nextConstructionDetails);
      } else {
        setConstructionDetails({});
      }

      if (investmentUuids.length > 0) {
        const investmentResults = await Promise.allSettled(
          investmentUuids.map((uuid) => publicInvestmentService.getById(uuid))
        );

        const nextInvestmentDetails = investmentResults.reduce((acc, result, index) => {
          if (result.status !== 'fulfilled') return acc;
          const payload = extractPayload(result.value);
          const project = payload?.data || payload;
          if (project && typeof project === 'object') {
            acc[investmentUuids[index]] = project;
          }
          return acc;
        }, {});

        setInvestmentDetails(nextInvestmentDetails);
      } else {
        setInvestmentDetails({});
      }
    } catch (error) {
      console.error('Erreur chargement demandes clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (uuid, decision) => {
    try {
      const target = requests.find((item) => item.uuid === uuid);
      const isSearch = target?.entry_kind === 'search_request';
      if (decision === 'approve') {
        if (isSearch) {
          await service.approveSearchRequest(uuid);
        } else {
          await service.approveClientRequest(uuid);
        }
      } else {
        setRejectModal({ open: true, item: target || { uuid }, reason: '' });
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Erreur decision client:', error);
      alert('Erreur lors de la decision');
    }
  };

  const confirmReject = async () => {
    if (!rejectModal.item?.uuid) return;
    if (!rejectModal.reason.trim()) {
      alert('Motif obligatoire.');
      return;
    }
    try {
      if (rejectModal.item?.entry_kind === 'search_request') {
        await service.rejectSearchRequest(rejectModal.item.uuid);
      } else {
        await service.rejectClientRequest(rejectModal.item.uuid, { rejection_reason: rejectModal.reason.trim() });
      }
      await loadData();
      setRejectModal({ open: false, item: null, reason: '' });
    } catch (error) {
      console.error('Erreur decision client:', error);
      alert('Erreur lors de la decision');
    }
  };

  const handleAssign = async (uuid) => {
    const agentId = assignments[uuid];
    if (!agentId) {
      alert('Veuillez selectionner un agent');
      return;
    }
    try {
      const target = requests.find((item) => item.uuid === uuid);
      if (target?.entry_kind === 'search_request') {
        await service.assignSearchRequest(uuid, { agent_id: agentId });
      } else {
        await service.assignClientRequest(uuid, { agent_id: agentId });
      }
      await loadData();
    } catch (error) {
      console.error('Erreur assignation client:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'assignation');
    }
  };

  const filteredRequests = useMemo(() => {
    const term = requestSearchTerm.trim().toLowerCase();

    return requests.filter((item) => {
      const typeMatches = activeFilter === 'tous' || (item.request_type || 'immobilier') === activeFilter;
      if (!typeMatches) return false;
      if (!term) return true;

      const tracking = trackingFor(item);
      const target = getTargetPreview(item);
      const haystack = [
        item.name,
        item.email,
        item.phone,
        item.message,
        item.request_type,
        target.label,
        item.propertyType?.name,
        item.property_type?.name,
        item.agent ? `${item.agent.first_name || ''} ${item.agent.last_name || ''}` : '',
        statusLabel(item.status, tracking),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [requests, requestSearchTerm, activeFilter]);
  const historyFeed = useMemo(() => {
    const merged = [...history, ...requests].reduce((acc, item) => {
      if (!item?.uuid) return acc;
      const tracking = trackingFor(item);
      const shouldInclude = history.some((entry) => entry.uuid === item.uuid)
        || (tracking.events && tracking.events.length > 0)
        || tracking.deal?.status === 'deal_concluded'
        || ['approved', 'agent_approved', 'assigned', 'rejected', 'agent_rejected'].includes(item.status);

      if (!shouldInclude || acc.some((entry) => entry.uuid === item.uuid)) return acc;
      acc.push(item);
      return acc;
    }, []);

    return merged
      .sort((a, b) => {
        const aTracking = trackingFor(a);
        const bTracking = trackingFor(b);
        const aDate = aTracking.deal?.concluded_at || a.updated_at || a.created_at || '';
        const bDate = bTracking.deal?.concluded_at || b.updated_at || b.created_at || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [history, requests]);
  const filteredHistoryFeed = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();
    if (!term) return historyFeed;

    return historyFeed.filter((item) => {
      const tracking = trackingFor(item);
      const events = tracking.events || [];
      const searchBase = [
        item.name,
        item.email,
        item.phone,
        item.message,
        item.agent ? `${item.agent.first_name || ''} ${item.agent.last_name || ''}` : '',
        relatedLabel(item),
        statusLabel(item.status, tracking),
        tracking.deal?.sale_price,
        tracking.deal?.closure_note,
        ...events.flatMap((event) => [
          event.content,
          event.meta?.summary,
          event.meta?.client_feedback,
          event.meta?.next_step,
          event.meta?.sale_price,
          event.meta?.closure_note,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBase.includes(term);
    });
  }, [historyFeed, historySearchTerm]);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">{roleLabel}</p>
              <h1 className="text-3xl font-semibold mt-3">Clients</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isHistoryView
                  ? 'Consultez l historique client, les rapports agents et les offres conclues.'
                  : 'Traitez les demandes clients, acceptez/refusez puis assignez.'}
              </p>
            </div>

            {!isHistoryView && (
              <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Demandes en attente</h2>
              </div>
              <div className="space-y-3 rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/75 px-4 py-4">
                <label className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Recherche</label>
                <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3">
                  <Search className="h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                  <input
                    type="text"
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    placeholder="Rechercher un client, un email, une cible ou un type de demande..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'tous', label: 'Tous' },
                    { key: 'immobilier', label: 'Immobilier' },
                    { key: 'construction', label: 'Construction' },
                    { key: 'investissement', label: 'Investissement' },
                    { key: 'recherche', label: 'Recherche' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      className={`px-4 py-2 rounded-xl text-sm border transition ${
                        activeFilter === filter.key
                          ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                          : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgb(var(--ink))]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredRequests.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande.</p>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((item) => (
                    <div key={item.uuid} className="surface-soft px-5 py-5 space-y-5">
                      {(() => {
                        const target = getTargetPreview(item);

                        return (
                          <>
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-[rgb(var(--ink))]">{item.name || 'Client'}</p>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeBadgeClass(item.request_type)}`}>
                              {typeLabel(item.request_type)}
                            </span>
                            <span className="chip">Statut: {statusLabel(item.status)}</span>
                          </div>
                          <p className="text-sm text-[rgba(15,42,46,0.66)] break-words">
                            {item.message || 'Aucun message fourni par le client.'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs min-w-0 xl:min-w-[440px]">
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/85 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Date</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatDateTime(item.created_at || item.updated_at)}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/85 px-3 py-3 md:col-span-2">
                            <p className="text-[rgba(15,42,46,0.45)]">Cible</p>
                            <div className="mt-2 flex items-center gap-3 min-w-0">
                              <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                                {target.image ? (
                                  <SecureImage
                                    src={resolveMediaUrl(target.image)}
                                    alt={target.label}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.45)]">
                                    {target.type === 'property' ? 'Photo' : 'Cible'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[rgb(var(--ink))] truncate">{target.label}</p>
                                <p className="text-[rgba(15,42,46,0.45)]">
                                  {target.type === 'property'
                                    ? 'Propriete associee'
                                    : target.type === 'construction'
                                      ? 'Projet de construction associe'
                                      : target.type === 'investment'
                                        ? 'Projet d investissement associe'
                                        : 'Aucune cible associee'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/85 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Decision</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{statusLabel(item.status)}</p>
                          </div>
                          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/85 px-3 py-3">
                            <p className="text-[rgba(15,42,46,0.45)]">Agent requis</p>
                            <p className="mt-1 font-medium text-[rgb(var(--ink))]">{requiredAgentType(item.request_type)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </div>
                          <p className="mt-2 font-medium text-[rgb(var(--ink))] break-all">{item.email || 'Non fourni'}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                            <Phone className="h-3.5 w-3.5" />
                            Telephone
                          </div>
                          <p className="mt-2 font-medium text-[rgb(var(--ink))]">{item.phone || 'Non fourni'}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
                          <p className="text-[rgba(15,42,46,0.55)]">Type de demande</p>
                          <p className="mt-2 font-medium text-[rgb(var(--ink))]">{typeLabel(item.request_type)}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-4">
                          <p className="text-[rgba(15,42,46,0.55)]">Etat d'assignation</p>
                          <p className="mt-2 font-medium text-[rgb(var(--ink))]">
                            {item.agent ? `${item.agent.first_name} ${item.agent.last_name}` : 'Aucun agent assigne'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
                        <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-4 space-y-3">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))]">Actions administratives</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">
                            Validez d'abord la demande, puis assignez l'agent adapte au type de dossier.
                          </p>
                          {item.status === 'pending' ? (
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => handleDecision(item.uuid, 'approve')} className="btn-primary">
                                <CheckCircle className="h-4 w-4" />
                                Accepter
                              </button>
                              <button onClick={() => handleDecision(item.uuid, 'reject')} className="btn-ghost">
                                <XCircle className="h-4 w-4" />
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-3 text-xs text-[rgba(15,42,46,0.65)]">
                              Cette demande a deja ete traitee. Si elle a ete acceptee ou refusee par un agent, vous pouvez proceder a une nouvelle assignation.
                            </div>
                          )}
                        </div>

                        <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-4 space-y-3">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))]">Assignation de l'agent</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">
                            Selectionnez un agent {requiredAgentType(item.request_type)} pour prendre le dossier en charge.
                          </p>
                          <select
                            value={assignments[item.uuid] || ''}
                            onChange={(e) => setAssignments((prev) => ({ ...prev, [item.uuid]: e.target.value }))}
                            className="w-full px-3 py-3 rounded-2xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                          >
                            <option value="">Selectionner un agent</option>
                            {agents
                              .filter((agent) => {
                                const needed = requiredAgentType(item.request_type);
                                return !agent.agent_type || agent.agent_type === needed;
                              })
                              .map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.first_name} {agent.last_name} {agent.agent_type ? `(${agent.agent_type})` : ''}
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleAssign(item.uuid)}
                            className={`btn-primary w-full justify-center ${['approved', 'agent_rejected'].includes(item.status) ? '' : 'opacity-60 cursor-not-allowed'}`}
                            disabled={!['approved', 'agent_rejected'].includes(item.status)}
                          >
                            <UserCheck className="h-4 w-4" />
                            Assigner cette demande
                          </button>
                        </div>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {isHistoryView && (
              <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Historique</h2>
              </div>
              <p className="text-sm text-[rgba(15,42,46,0.58)]">
                Retrouvez ici le detail complet des demandes clients, les decisions prises, le suivi de l'agent et la conclusion du deal.
              </p>
              <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/75 px-4 py-4">
                <label className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Recherche</label>
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-3">
                  <Search className="h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                  <input
                    type="text"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Rechercher un client, un agent, une cible, un rapport..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredHistoryFeed.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique.</p>
              ) : (
                <div className="space-y-3">
                  {filteredHistoryFeed.map((item) => {
                    const tracking = trackingFor(item);
                    const events = tracking.events || [];
                    const target = getTargetPreview(item);
                    const isRejected = ['rejected', 'agent_rejected'].includes(item.status);
                    const isConcluded = tracking.deal?.status === 'deal_concluded';

                    return (
                      <div key={item.uuid} className="surface-soft px-5 py-5 space-y-4">
                        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                          <div className="space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold">{item.name || 'Client'}</p>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeBadgeClass(item.request_type)}`}>
                                {typeLabel(item.request_type)}
                              </span>
                              {tracking.deal?.status === 'deal_concluded' && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  Deal conclut
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[rgba(15,42,46,0.65)] break-words">{item.message || 'Sans message'}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs min-w-0 xl:min-w-[440px]">
                            <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/80 px-3 py-3">
                              <p className="text-[rgba(15,42,46,0.45)]">Statut</p>
                              <p className="mt-1 font-medium text-[rgb(var(--ink))]">{statusLabel(item.status, tracking)}</p>
                            </div>
                            <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/80 px-3 py-3">
                              <p className="text-[rgba(15,42,46,0.45)]">Agent</p>
                              <p className="mt-1 font-medium text-[rgb(var(--ink))]">{item.agent ? `${item.agent.first_name} ${item.agent.last_name}` : 'Non assigne'}</p>
                            </div>
                            <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/80 px-3 py-3">
                              <p className="text-[rgba(15,42,46,0.45)]">Date</p>
                              <p className="mt-1 font-medium text-[rgb(var(--ink))]">{formatDateTime(item.updated_at || item.created_at)}</p>
                            </div>
                            <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/80 px-3 py-3 md:col-span-2">
                              <p className="text-[rgba(15,42,46,0.45)]">Cible</p>
                              <div className="mt-2 flex items-center gap-3 min-w-0">
                                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                                  {target.image ? (
                                    <SecureImage
                                      src={resolveMediaUrl(target.image)}
                                      alt={target.label}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.45)]">
                                      {target.type === 'property' ? 'Photo' : 'Cible'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-[rgb(var(--ink))] truncate">{target.label}</p>
                                  <p className="text-[rgba(15,42,46,0.45)]">
                                    {target.type === 'property'
                                      ? 'Propriete associee'
                                      : target.type === 'construction'
                                        ? 'Projet de construction associe'
                                        : target.type === 'investment'
                                          ? 'Projet d investissement associe'
                                          : 'Aucune cible associee'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-4 py-4">
                            <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                              <Mail className="h-3.5 w-3.5" />
                              Contact email
                            </div>
                            <p className="mt-2 font-medium text-[rgb(var(--ink))] break-all">{item.email || 'Non fourni'}</p>
                          </div>
                          <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-4 py-4">
                            <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                              <Phone className="h-3.5 w-3.5" />
                              Contact telephone
                            </div>
                            <p className="mt-2 font-medium text-[rgb(var(--ink))]">{item.phone || 'Non fourni'}</p>
                          </div>
                          <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-4 py-4">
                            <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                              <Clock3 className="h-3.5 w-3.5" />
                              Activite agent
                            </div>
                            <p className="mt-2 font-medium text-[rgb(var(--ink))]">
                              {events.length > 0 ? `${events.length} rapport${events.length > 1 ? 's' : ''}` : 'Aucun rapport'}
                            </p>
                          </div>
                          <div className={`rounded-2xl px-4 py-4 ${isRejected ? 'border border-rose-200 bg-rose-50' : isConcluded ? 'border border-emerald-200 bg-emerald-50' : 'bg-[rgba(245,248,248,0.9)]'}`}>
                            <div className={`inline-flex items-center gap-2 ${isRejected ? 'text-rose-700' : isConcluded ? 'text-emerald-700' : 'text-[rgba(15,42,46,0.55)]'}`}>
                              <Handshake className="h-3.5 w-3.5" />
                              Conclusion
                            </div>
                            <p className={`mt-2 font-medium ${isRejected ? 'text-rose-700' : isConcluded ? 'text-emerald-700' : 'text-[rgb(var(--ink))]'}`}>
                              {isRejected
                                ? 'Refusee'
                                : isConcluded
                                  ? `Conclu ${tracking.deal.sale_price ? `a ${formatFcfa(tracking.deal.sale_price)}` : ''}`.trim()
                                  : 'Dossier en cours'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[26px] border border-[rgba(15,42,46,0.08)] bg-[rgba(248,250,250,0.9)] p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--ink))]">
                              <ScrollText className="h-4 w-4" />
                              Rapports de l'agent
                            </div>
                            <span className="chip">
                              {events.filter((event) => event.type === 'progress_report').length} rapport(s)
                            </span>
                          </div>
                          {events.filter((event) => event.type === 'progress_report').length === 0 ? (
                            <p className="text-sm text-[rgba(15,42,46,0.55)]">
                              Aucun rapport envoye par l'agent pour ce dossier.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {events
                                .filter((event) => event.type === 'progress_report')
                                .map((event) => (
                                  <div key={event.id} className="rounded-2xl border border-[rgb(var(--line))] bg-white px-4 py-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <div className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--ink))]">
                                        <FileText className="h-4 w-4 text-[rgb(var(--ink))]" />
                                        Rapport d avancement
                                      </div>
                                      <span className="text-xs text-[rgba(15,42,46,0.45)]">{formatDateTime(event.created_at)}</span>
                                    </div>
                                    <p className="mt-3 text-sm text-[rgba(15,42,46,0.72)] whitespace-pre-wrap">{event.content}</p>
                                    {(event.meta?.summary || event.meta?.client_feedback || event.meta?.next_step || event.meta?.sale_price) && (
                                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
                                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Resume</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{event.meta?.summary || 'Non renseigne'}</p>
                                        </div>
                                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Retour client</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{event.meta?.client_feedback || 'Non renseigne'}</p>
                                        </div>
                                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Prochaine etape</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{event.meta?.next_step || 'Non renseigne'}</p>
                                        </div>
                                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                                          <p className="text-[rgba(15,42,46,0.45)]">Prix final</p>
                                          <p className="mt-1 font-medium text-[rgb(var(--ink))]">{event.meta?.sale_price ? formatFcfa(event.meta.sale_price) : tracking.deal?.sale_price ? formatFcfa(tracking.deal.sale_price) : 'Non renseigne'}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {tracking.deal?.status === 'deal_concluded' && (
                          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/90 p-4 space-y-3">
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                              <Handshake className="h-4 w-4" />
                              Offre conclut
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
                              <div className="rounded-2xl bg-white px-4 py-4">
                                <p className="text-[rgba(15,42,46,0.45)]">Rapport final</p>
                                <p className="mt-2 font-medium text-[rgb(var(--ink))] whitespace-pre-wrap">
                                  {tracking.deal.final_report || 'Non renseigne'}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-4">
                                <p className="text-[rgba(15,42,46,0.45)]">Statut</p>
                                <p className="mt-2 font-medium text-[rgb(var(--ink))]">Offre conclut</p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-4">
                                <p className="text-[rgba(15,42,46,0.45)]">Prix final</p>
                                <p className="mt-2 font-medium text-[rgb(var(--ink))]">
                                  {formatFcfa(tracking.deal.sale_price, 'Non renseigne')}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-4">
                                <p className="text-[rgba(15,42,46,0.45)]">Cloture / formalite</p>
                                <p className="mt-2 font-medium text-[rgb(var(--ink))]">
                                  {events.find((event) => event.type === 'final_report')?.meta?.next_step || 'Non renseigne'}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-white px-4 py-4">
                                <p className="text-[rgba(15,42,46,0.45)]">Note de conclusion</p>
                                <p className="mt-2 font-medium text-[rgb(var(--ink))] whitespace-pre-wrap">
                                  {events.find((event) => event.type === 'final_report')?.meta?.closure_note || tracking.deal.closure_note || 'Non renseigne'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {item.rejection_reason && ['rejected', 'agent_rejected'].includes(item.status) && (
                          <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                            <p className="font-semibold">Motif du refus</p>
                            <p className="mt-2 whitespace-pre-wrap">{item.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
        </main>
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Refuser la demande</h3>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              Motif obligatoire pour refuser cette demande client.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              rows="4"
              className="mt-4 w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              placeholder="Motif du refus..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setRejectModal({ open: false, item: null, reason: '' })}
              >
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={confirmReject}>
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal.open && historyModal.item && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Motif du rejet</h3>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              {historyModal.item.name || 'Client'} - {typeLabel(historyModal.item.request_type)}
            </p>
            <div className="mt-4 surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.7)]">
              {historyModal.item.rejection_reason}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setHistoryModal({ open: false, item: null })}
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

export default ClientRequests;
