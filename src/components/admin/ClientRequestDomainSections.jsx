import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock3,
  FileText,
  Handshake,
  Mail,
  Phone,
  ScrollText,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  publicConstructionService,
  publicInvestmentService,
  publicPropertyService,
} from '../../services/api';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';

const ClientRequestDomainSections = ({
  requestType,
  requests,
  history,
  agents,
  assignments,
  setAssignments,
  loading,
  onApprove,
  onOpenReject,
  onAssign,
  onOpenHistoryReason,
  pendingTitle,
  pendingDescription,
  historyTitle,
  emptyPendingLabel = 'Aucune demande.',
  emptyHistoryLabel = 'Aucun historique.',
}) => {
  const [propertyDetails, setPropertyDetails] = useState({});
  const [constructionDetails, setConstructionDetails] = useState({});
  const [investmentDetails, setInvestmentDetails] = useState({});

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const typeLabel = (type) => (
    type === 'construction' ? 'Construction'
      : type === 'investissement' ? 'Investissement'
        : 'Immobilier'
  );
  const typeBadgeClass = (type) => (
    type === 'construction'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : type === 'investissement'
        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
        : 'bg-sky-100 text-sky-800 border-sky-200'
  );
  const requiredAgentType = (type) => (
    type === 'construction' ? 'constructeur'
      : type === 'investissement' ? 'investissement'
        : 'immobilier'
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
  const formatDateTime = (value) => {
    if (!value) return 'Non renseignee';
    return new Date(value).toLocaleString('fr-FR');
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
  const statusLabel = (status, tracking) => {
    if (tracking?.deal?.status === 'deal_concluded') return 'Deal conclut';
    if (status === 'agent_approved' || status === 'approved') return 'Acceptee';
    if (status === 'agent_rejected' || status === 'rejected') return 'Refusee';
    if (status === 'assigned') return 'Assignee';
    if (status === 'pending') return 'En attente';
    return status || 'Non renseigne';
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

    return {
      label: 'Sans cible',
      image: '',
      type: 'none',
    };
  };

  useEffect(() => {
    const loadDetails = async () => {
      const items = [...requests, ...history];
      const propertyUuids = items
        .map((item) => item.property?.uuid || item.property_uuid || item.property?.id)
        .filter(Boolean)
        .filter((uuid, index, array) => array.indexOf(uuid) === index);
      const constructionUuids = items
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
      const investmentUuids = items
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
        setPropertyDetails(propertyResults.reduce((acc, result, index) => {
          if (result.status !== 'fulfilled') return acc;
          const payload = extractPayload(result.value);
          const property = payload?.data || payload;
          if (property && typeof property === 'object') acc[propertyUuids[index]] = property;
          return acc;
        }, {}));
      } else {
        setPropertyDetails({});
      }

      if (constructionUuids.length > 0) {
        const constructionResponse = await publicConstructionService.getAll();
        const constructionPayload = extractPayload(constructionResponse);
        const constructionList = Array.isArray(constructionPayload?.data || constructionPayload)
          ? (constructionPayload?.data || constructionPayload)
          : [];
        setConstructionDetails(constructionList.reduce((acc, project) => {
          const uuid = project?.uuid || project?.id;
          if (uuid && constructionUuids.includes(uuid)) acc[uuid] = project;
          return acc;
        }, {}));
      } else {
        setConstructionDetails({});
      }

      if (investmentUuids.length > 0) {
        const investmentResults = await Promise.allSettled(
          investmentUuids.map((uuid) => publicInvestmentService.getById(uuid))
        );
        setInvestmentDetails(investmentResults.reduce((acc, result, index) => {
          if (result.status !== 'fulfilled') return acc;
          const payload = extractPayload(result.value);
          const project = payload?.data || payload;
          if (project && typeof project === 'object') acc[investmentUuids[index]] = project;
          return acc;
        }, {}));
      } else {
        setInvestmentDetails({});
      }
    };

    loadDetails().catch((error) => {
      console.error('Erreur chargement cibles demandes clients:', error);
    });
  }, [requests, history]);

  const filteredAgents = useMemo(
    () => agents.filter((agent) => {
      const needed = requiredAgentType(requestType);
      return !agent.agent_type || agent.agent_type === needed;
    }),
    [agents, requestType]
  );

  return (
    <>
      <div className="surface-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{pendingTitle}</h2>
        </div>
        {pendingDescription && (
          <p className="text-sm text-[rgba(15,42,46,0.6)]">{pendingDescription}</p>
        )}
        {loading ? (
          <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[rgba(15,42,46,0.5)]">{emptyPendingLabel}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => {
              const target = getTargetPreview(item);
              return (
                <div key={item.uuid} className="surface-soft px-5 py-5 space-y-5">
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
                        {item.project_description || item.message || 'Aucun message fourni par le client.'}
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
                          <button onClick={() => onApprove(item.uuid)} className="btn-primary">
                            <CheckCircle className="h-4 w-4" />
                            Accepter
                          </button>
                          <button onClick={() => onOpenReject(item)} className="btn-ghost">
                            <XCircle className="h-4 w-4" />
                            Refuser
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.92)] px-4 py-3 text-xs text-[rgba(15,42,46,0.65)]">
                          Cette demande a deja ete traitee. Vous pouvez maintenant proceder a l'assignation si elle est acceptee.
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
                        {filteredAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.first_name} {agent.last_name} {agent.agent_type ? `(${agent.agent_type})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => onAssign(item.uuid)}
                        className={`btn-primary w-full justify-center ${item.status === 'approved' ? '' : 'opacity-60 cursor-not-allowed'}`}
                        disabled={item.status !== 'approved'}
                      >
                        <UserCheck className="h-4 w-4" />
                        Assigner cette demande
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {historyTitle && (
        <div className="surface-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{historyTitle}</h2>
          </div>
          {loading ? (
            <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[rgba(15,42,46,0.5)]">{emptyHistoryLabel}</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const tracking = trackingFor(item);
                const events = tracking.events || [];
                const target = getTargetPreview(item);

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
                        <p className="text-sm text-[rgba(15,42,46,0.65)] break-words">
                          {item.project_description || item.message || 'Sans message'}
                        </p>
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
                      <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-4 py-4">
                        <div className="inline-flex items-center gap-2 text-[rgba(15,42,46,0.55)]">
                          <Handshake className="h-3.5 w-3.5" />
                          Conclusion
                        </div>
                        <p className="mt-2 font-medium text-[rgb(var(--ink))]">
                          {tracking.deal?.status === 'deal_concluded'
                            ? `Conclu ${tracking.deal.sale_price ? `a ${tracking.deal.sale_price}` : ''}`.trim()
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
                              {tracking.deal.sale_price || 'Non renseigne'}
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
                      <button
                        type="button"
                        className="btn-ghost text-[rgb(var(--clay))]"
                        onClick={() => onOpenHistoryReason(item)}
                      >
                        Voir le motif
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ClientRequestDomainSections;
