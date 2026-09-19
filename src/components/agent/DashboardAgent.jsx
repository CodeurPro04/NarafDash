import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { CheckCircle, Clock, MessageSquare, Building, Mail, ArrowUpRight, Archive, FileText, HardHat, Send, Users, Handshake, Activity, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeAgentType } from '../../utils/agentType';

const DashboardAgent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agentType = normalizeAgentType(user?.agent_type || user?.agentType || 'immobilier');
  const [stats, setStats] = useState({
    propertiesToValidate: 0,
    validatedProperties: 0,
    archivedProperties: 0,
    unreadMessages: 0,
    assignedProperties: 0,
    assignedSearchRequests: 0,
    assignedConstructionProjects: 0,
    quotesSent: 0,
    assignedClientRequests: 0,
    pendingPublications: 0,
    totalPublications: 0,
  });
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [assignedSearchRequests, setAssignedSearchRequests] = useState([]);
  const [assignedConstructionProjects, setAssignedConstructionProjects] = useState([]);
  const [assignedClientRequests, setAssignedClientRequests] = useState([]);
  const [clientRequestHistory, setClientRequestHistory] = useState([]);
  const [constructionPublications, setConstructionPublications] = useState([]);
  const [investmentPublications, setInvestmentPublications] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const formatClientType = (type) => {
    if (type === 'construction') return 'Construction';
    if (type === 'investissement') return 'Investissement';
    if (type === 'immobilier') return 'Immobilier';
    return 'Immobilier';
  };
  const isInvestmentClientRequest = (request) => (
    request?.request_type === 'investissement'
    || request?.request_type === 'investment'
    || request?.investment_project
    || request?.investmentProject
    || request?.investment_uuid
    || request?.investment_project_uuid
  );
  const isConstructionClientRequest = (request) => (
    request?.request_type === 'construction'
    || request?.construction_project
    || request?.constructionProject
    || request?.construction_uuid
    || request?.construction_project_uuid
  );
  const getClientReports = (request) => (
    Array.isArray(request?.reports)
      ? request.reports.filter((report) => report.report_type === 'progress_report')
      : []
  );
  const isDealConcluded = (request) => (
    request?.deal_status === 'deal_concluded' || request?.status === 'deal_concluded'
  );
  const isAcceptedClient = (request) => ['approved', 'agent_approved', 'deal_concluded'].includes(request?.status);
  const getRequestDate = (request) => request?.deal_concluded_at || request?.updated_at || request?.created_at || '';
  const clientStatusLabel = (status) => {
    if (status === 'agent_approved') return 'Accepte par l agent';
    if (status === 'approved') return 'Accepte';
    if (status === 'agent_rejected') return 'Refuse par l agent';
    if (status === 'rejected') return 'Refuse';
    if (status === 'assigned') return 'Assigne';
    if (status === 'deal_concluded') return 'Offre conclue';
    if (status === 'pending') return 'En attente';
    return status || 'En attente';
  };

  useEffect(() => {
    loadDashboardData();
  }, [agentType]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (agentType === 'immobilier') {
        const [propertiesRes, propertyRequestsRes, createdPropertiesRes, messagesRes, searchesRes, clientsRes, clientHistoryRes] = await Promise.all([
          agentService.getAssignedProperties(),
          agentService.getAssignedPropertyRequests(),
          agentService.getAllProperties(),
          agentService.getMessages(),
          agentService.getAssignedSearchRequests(),
          agentService.getAssignedClientRequests(),
          agentService.getClientRequestHistory(),
        ]);

        const properties = extractPayload(propertiesRes).data || extractPayload(propertiesRes);
        const propertyRequests = extractPayload(propertyRequestsRes).data || extractPayload(propertyRequestsRes);
        const createdPropertiesList = extractPayload(createdPropertiesRes).data || extractPayload(createdPropertiesRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);
        const searches = extractPayload(searchesRes).data || extractPayload(searchesRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);
        const clientHistory = extractPayload(clientHistoryRes).data || extractPayload(clientHistoryRes);
        const propertyClients = (Array.isArray(clients) ? clients : []).filter((request) => !isConstructionClientRequest(request) && !isInvestmentClientRequest(request));
        const propertyClientHistory = (Array.isArray(clientHistory) ? clientHistory : []).filter((request) => !isConstructionClientRequest(request) && !isInvestmentClientRequest(request));
        const mergedClientTimeline = [...propertyClients, ...propertyClientHistory].reduce((acc, item) => {
          if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
          acc.push(item);
          return acc;
        }, []);
        const propertyClientFlow = mergedClientTimeline.filter((request) => (
          ['assigned', 'approved', 'agent_approved', 'rejected', 'agent_rejected', 'deal_concluded'].includes(request?.status)
        ));
        const propertyRequestFlow = (Array.isArray(propertyRequests) ? propertyRequests : []).filter((request) => (
          ['assigned', 'approved', 'agent_approved', 'agent_rejected'].includes(request?.status)
        ));
        const pendingAssignmentValidation = propertyClientFlow.filter((request) => request?.status === 'assigned').length
          + propertyRequestFlow.filter((request) => request?.status === 'assigned').length;
        const acceptedAssignments = propertyClientFlow.filter((request) => ['approved', 'agent_approved', 'deal_concluded'].includes(request?.status)).length
          + propertyRequestFlow.filter((request) => ['approved', 'agent_approved'].includes(request?.status)).length;
        const activeFollowUps = mergedClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request));
        const concludedDeals = mergedClientTimeline.filter((request) => isDealConcluded(request));
        const totalReports = mergedClientTimeline.reduce((total, request) => total + getClientReports(request).length, 0);

        setAssignedProperties(Array.isArray(properties) ? properties : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);
        setAssignedSearchRequests(Array.isArray(searches) ? searches : []);
        setAssignedClientRequests(propertyClientFlow);
        setClientRequestHistory(propertyClientHistory);

        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;

        setStats((prev) => ({
          ...prev,
          propertiesToValidate: pendingAssignmentValidation,
          validatedProperties: acceptedAssignments,
          archivedProperties: concludedDeals.length,
          unreadMessages: unreadMsgs,
          assignedProperties: Array.isArray(createdPropertiesList) ? createdPropertiesList.length : 0,
          assignedSearchRequests: Array.isArray(searches) ? searches.length : 0,
          assignedClientRequests: propertyClientFlow.length,
          quotesSent: totalReports,
        }));
      } else if (agentType === 'constructeur') {
        const [constructionsRes, publicationsRes, clientsRes, clientHistoryRes, searchesRes, messagesRes] = await Promise.all([
          agentService.getAssignedConstructionProjects(),
          agentService.getConstructionPublications(),
          agentService.getAssignedClientRequests(),
          agentService.getClientRequestHistory(),
          agentService.getAssignedSearchRequests(),
          agentService.getMessages(),
        ]);

        const constructions = extractPayload(constructionsRes).data || extractPayload(constructionsRes);
        const publications = extractPayload(publicationsRes).data || extractPayload(publicationsRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);
        const clientHistory = extractPayload(clientHistoryRes).data || extractPayload(clientHistoryRes);
        const searches = extractPayload(searchesRes).data || extractPayload(searchesRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);
        const constructionClients = (Array.isArray(clients) ? clients : []).filter(isConstructionClientRequest);
        const constructionClientHistory = (Array.isArray(clientHistory) ? clientHistory : []).filter(isConstructionClientRequest);
        const mergedClientTimeline = [...constructionClients, ...constructionClientHistory].reduce((acc, item) => {
          if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
          acc.push(item);
          return acc;
        }, []);
        const constructionClientFlow = mergedClientTimeline.filter((request) => (
          ['assigned', 'approved', 'agent_approved', 'rejected', 'agent_rejected', 'deal_concluded'].includes(request?.status)
        ));
        const activeFollowUps = mergedClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request));
        const concludedDeals = mergedClientTimeline.filter((request) => isDealConcluded(request));
        const totalReports = mergedClientTimeline.reduce((total, request) => total + getClientReports(request).length, 0);

        setAssignedConstructionProjects(Array.isArray(constructions) ? constructions : []);
        setConstructionPublications(Array.isArray(publications) ? publications : []);
        setAssignedClientRequests(constructionClientFlow);
        setClientRequestHistory(constructionClientHistory);
        setAssignedSearchRequests(Array.isArray(searches) ? searches : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);

        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;

        setStats((prev) => ({
          ...prev,
          unreadMessages: unreadMsgs,
          assignedConstructionProjects: Array.isArray(constructions) ? constructions.length : 0,
          quotesSent: totalReports,
          assignedClientRequests: constructionClientFlow.length,
          assignedSearchRequests: Array.isArray(searches) ? searches.length : 0,
          validatedProperties: activeFollowUps.length,
          archivedProperties: concludedDeals.length,
        }));
      } else {
        const [publicationsRes, clientsRes, clientHistoryRes, searchesRes, messagesRes] = await Promise.all([
          agentService.getInvestmentPublications(),
          agentService.getAssignedClientRequests(),
          agentService.getClientRequestHistory(),
          agentService.getAssignedSearchRequests(),
          agentService.getMessages(),
        ]);

        const publications = extractPayload(publicationsRes).data || extractPayload(publicationsRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);
        const clientHistory = extractPayload(clientHistoryRes).data || extractPayload(clientHistoryRes);
        const searches = extractPayload(searchesRes).data || extractPayload(searchesRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);
        const investmentClients = (Array.isArray(clients) ? clients : []).filter(isInvestmentClientRequest);
        const investmentClientHistory = (Array.isArray(clientHistory) ? clientHistory : []).filter(isInvestmentClientRequest);
        const mergedClientTimeline = [...investmentClients, ...investmentClientHistory].reduce((acc, item) => {
          if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
          acc.push(item);
          return acc;
        }, []);
        const investmentClientFlow = mergedClientTimeline.filter((request) => (
          ['assigned', 'approved', 'agent_approved', 'rejected', 'agent_rejected', 'deal_concluded'].includes(request?.status)
        ));
        const activeFollowUps = mergedClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request));
        const concludedDeals = mergedClientTimeline.filter((request) => isDealConcluded(request));
        const totalReports = mergedClientTimeline.reduce((total, request) => total + getClientReports(request).length, 0);

        setInvestmentPublications(Array.isArray(publications) ? publications : []);
        setAssignedClientRequests(investmentClientFlow);
        setClientRequestHistory(investmentClientHistory);
        setAssignedSearchRequests(Array.isArray(searches) ? searches : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);

        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;
        const pendingPublications = (Array.isArray(publications) ? publications : []).filter((project) => (
          project.approval_status === 'pending' || project.approval_status === 'submitted'
        )).length;

        setStats((prev) => ({
          ...prev,
          unreadMessages: unreadMsgs,
          assignedClientRequests: investmentClientFlow.length,
          assignedSearchRequests: Array.isArray(searches) ? searches.length : 0,
          quotesSent: totalReports,
          validatedProperties: activeFollowUps.length,
          archivedProperties: concludedDeals.length,
          pendingPublications,
          totalPublications: Array.isArray(publications) ? publications.length : 0,
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(() => {
    if (agentType === 'immobilier') {
      return [
        { title: 'A valider', value: stats.propertiesToValidate, icon: Clock },
        { title: 'Validees', value: stats.validatedProperties, icon: CheckCircle },
        { title: 'Archivees', value: stats.archivedProperties, icon: Archive },
        { title: 'Annonces', value: stats.assignedProperties, icon: Building },
        { title: 'Demandes', value: stats.assignedSearchRequests, icon: FileText },
        { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
      ];
    }
    if (agentType === 'constructeur') {
      return [
        { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
        { title: 'Suivis en cours', value: stats.validatedProperties, icon: Activity },
        { title: 'Rapports envoyes', value: stats.quotesSent, icon: Send },
        { title: 'Offres conclues', value: stats.archivedProperties, icon: Handshake },
        { title: 'Demandes assignees', value: stats.assignedSearchRequests, icon: FileText },
        { title: 'Messages non lus', value: stats.unreadMessages, icon: MessageSquare },
      ];
    }
    return [
      { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
      { title: 'Suivis en cours', value: stats.validatedProperties, icon: Activity },
      { title: 'Rapports envoyes', value: stats.quotesSent, icon: Send },
      { title: 'Offres conclues', value: stats.archivedProperties, icon: Handshake },
      { title: 'Demandes assignees', value: stats.assignedSearchRequests, icon: FileText },
    ];
  }, [agentType, stats]);

  const headerCopy = useMemo(() => {
    if (agentType === 'constructeur') {
      return {
        label: 'Agent constructeur',
        title: 'Pilotage des dossiers construction',
        subtitle: 'Suivez vos clients assignes, les suivis en cours et les offres conclues.',
      };
    }
    if (agentType === 'investissement') {
      return {
        label: 'Agent investisseur',
        title: "Pilotage des dossiers d'investissement",
        subtitle: "Suivez vos clients assignes, les suivis en cours et les offres conclues.",
      };
    }
    return {
      label: 'Agent immobilier',
      title: 'Pilotage des dossiers immobiliers',
      subtitle: 'Suivez vos clients assignes, vos suivis en cours et les offres conclues.',
    };
  }, [agentType]);

  const typeBadge = useMemo(() => {
    if (agentType === 'constructeur') {
      return { label: 'Construction', className: 'bg-amber-100 text-amber-700' };
    }
    if (agentType === 'investissement') {
      return { label: 'Investissement', className: 'bg-sky-100 text-sky-700' };
    }
    return { label: 'Immobilier', className: 'bg-emerald-100 text-emerald-700' };
  }, [agentType]);
  const investmentClientTimeline = useMemo(
    () => [...assignedClientRequests, ...clientRequestHistory].reduce((acc, item) => {
      if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
      acc.push(item);
      return acc;
    }, []),
    [assignedClientRequests, clientRequestHistory]
  );
  const investmentActiveFollowUps = useMemo(
    () => investmentClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request)),
    [investmentClientTimeline]
  );
  const investmentConcludedDeals = useMemo(
    () => investmentClientTimeline
      .filter((request) => isDealConcluded(request))
      .sort((a, b) => new Date(getRequestDate(b)).getTime() - new Date(getRequestDate(a)).getTime()),
    [investmentClientTimeline]
  );
  const constructionClientTimeline = useMemo(
    () => [...assignedClientRequests, ...clientRequestHistory].reduce((acc, item) => {
      if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
      acc.push(item);
      return acc;
    }, []),
    [assignedClientRequests, clientRequestHistory]
  );
  const constructionActiveFollowUps = useMemo(
    () => constructionClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request)),
    [constructionClientTimeline]
  );
  const constructionConcludedDeals = useMemo(
    () => constructionClientTimeline
      .filter((request) => isDealConcluded(request))
      .sort((a, b) => new Date(getRequestDate(b)).getTime() - new Date(getRequestDate(a)).getTime()),
    [constructionClientTimeline]
  );
  const propertyClientTimeline = useMemo(
    () => [...assignedClientRequests, ...clientRequestHistory].reduce((acc, item) => {
      if (!item?.uuid || acc.some((entry) => entry.uuid === item.uuid)) return acc;
      acc.push(item);
      return acc;
    }, []),
    [assignedClientRequests, clientRequestHistory]
  );
  const propertyActiveFollowUps = useMemo(
    () => propertyClientTimeline.filter((request) => isAcceptedClient(request) && !isDealConcluded(request)),
    [propertyClientTimeline]
  );
  const propertyConcludedDeals = useMemo(
    () => propertyClientTimeline
      .filter((request) => isDealConcluded(request))
      .sort((a, b) => new Date(getRequestDate(b)).getTime() - new Date(getRequestDate(a)).getTime()),
    [propertyClientTimeline]
  );

  // Meme logique de pipeline (Attente / Suivi / Conclu) que le dashboard admin,
  // adaptee au seul domaine de l'agent connecte.
  const pipeline = useMemo(() => {
    if (agentType === 'constructeur') {
      return {
        label: 'Construction',
        icon: HardHat,
        hue: 'amber',
        pending: constructionClientTimeline.filter((request) => request?.status === 'assigned').length,
        followUp: constructionActiveFollowUps.length,
        concluded: constructionConcludedDeals.length,
      };
    }
    if (agentType === 'investissement') {
      return {
        label: 'Investissement',
        icon: TrendingUp,
        hue: 'emerald',
        pending: investmentClientTimeline.filter((request) => request?.status === 'assigned').length,
        followUp: investmentActiveFollowUps.length,
        concluded: investmentConcludedDeals.length,
      };
    }
    return {
      label: 'Immobilier',
      icon: Building,
      hue: 'sky',
      pending: stats.propertiesToValidate,
      followUp: propertyActiveFollowUps.length,
      concluded: propertyConcludedDeals.length,
    };
  }, [
    agentType, stats.propertiesToValidate,
    constructionClientTimeline, constructionActiveFollowUps, constructionConcludedDeals,
    investmentClientTimeline, investmentActiveFollowUps, investmentConcludedDeals,
    propertyActiveFollowUps, propertyConcludedDeals,
  ]);

  // Rampe monotone (claire -> foncee) par domaine, identique au dashboard admin.
  const domainRamp = {
    sky: ['bg-sky-50 text-sky-700', 'bg-sky-100 text-sky-800', 'bg-sky-600 text-white'],
    amber: ['bg-amber-50 text-amber-700', 'bg-amber-100 text-amber-800', 'bg-amber-600 text-white'],
    emerald: ['bg-emerald-50 text-emerald-700', 'bg-emerald-100 text-emerald-800', 'bg-emerald-600 text-white'],
  };
  const domainBadge = {
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  const domainBar = {
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  };
  const pipelineTotal = Math.max(1, pipeline.pending + pipeline.followUp + pipeline.concluded);
  const pipelinePendingPct = (pipeline.pending / pipelineTotal) * 100;
  const pipelineFollowUpPct = (pipeline.followUp / pipelineTotal) * 100;
  const pipelineConcludedPct = (pipeline.concluded / pipelineTotal) * 100;
  const pipelineRamp = domainRamp[pipeline.hue];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="chip">{headerCopy.label}</p>
                  <span className={`chip ${typeBadge.className}`}>Type: {typeBadge.label}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[rgb(var(--ink))]">{headerCopy.title}</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] max-w-2xl">
                  {headerCopy.subtitle}
                </p>
              </div>
              <div className="surface-soft px-4 py-2.5 flex items-center gap-2.5 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                  Espace agent operationnel
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{stat.title}</p>
                      <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                        {loading ? '...' : Number(stat.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-[rgb(var(--ink))]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline operationnel du domaine de l'agent */}
            <div className="surface-panel p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Pipeline operationnel</h2>
                  <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">Repartition de vos dossiers par etape.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agent/assigned?view=clients')}
                className="group w-full max-w-sm rounded-[20px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5 text-left transition hover:border-[rgba(15,42,46,0.2)] hover:shadow-[0_12px_28px_rgba(15,42,46,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${domainBadge[pipeline.hue]}`}>
                    <pipeline.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[rgba(15,42,46,0.35)] transition group-hover:text-[rgba(15,42,46,0.6)]" />
                </div>
                <p className="mt-3 text-base font-semibold text-[rgb(var(--ink))]">{pipeline.label}</p>

                <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-[rgba(15,42,46,0.06)]">
                  {pipeline.pending > 0 && (
                    <span className={domainBar[pipeline.hue]} style={{ width: `${pipelinePendingPct}%`, opacity: 0.45 }} />
                  )}
                  {pipeline.followUp > 0 && (
                    <span className={domainBar[pipeline.hue]} style={{ width: `${pipelineFollowUpPct}%`, opacity: 0.75 }} />
                  )}
                  {pipeline.concluded > 0 && (
                    <span className={domainBar[pipeline.hue]} style={{ width: `${pipelineConcludedPct}%` }} />
                  )}
                </div>

                <div className="mt-4 flex items-stretch gap-2">
                  <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${pipelineRamp[0]}`}>
                    <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Attente</p>
                    <p className="mt-1 text-base font-semibold">{loading ? '...' : pipeline.pending}</p>
                  </div>
                  <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${pipelineRamp[1]}`}>
                    <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Suivi</p>
                    <p className="mt-1 text-base font-semibold">{loading ? '...' : pipeline.followUp}</p>
                  </div>
                  <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${pipelineRamp[2]}`}>
                    <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Conclu</p>
                    <p className="mt-1 text-base font-semibold">{loading ? '...' : pipeline.concluded}</p>
                  </div>
                </div>
              </button>
            </div>

            {agentType === 'immobilier' && (
            <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="surface-panel p-6 xl:col-span-2">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3 max-w-2xl">
                    <p className="chip">Vue portefeuille client</p>
                    <h2 className="text-2xl font-semibold">Pilotage des dossiers immobiliers</h2>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">
                      Suivez en un coup d oeil les clients actifs, les rapports deja transmis et les offres deja conclues.
                    </p>
                  </div>
                  <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost self-start">
                    Ouvrir les clients
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Clients actifs</p>
                    <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : propertyActiveFollowUps.length}</p>
                    <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers en suivi actuellement.</p>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Rapports transmis</p>
                    <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : stats.quotesSent}</p>
                    <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Tous les suivis envoyes a l administrateur.</p>
                  </div>
                  <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Offres conclues</p>
                    <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : propertyConcludedDeals.length}</p>
                    <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers finalises et remontes.</p>
                  </div>
                </div>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Messages recents</h2>
                  <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                    Repondre
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {!loading && recentMessages.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message.</p>
                  )}
                  {recentMessages.slice(0, 5).map((message) => (
                    <div key={message.id || message.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                          <Mail className="h-4 w-4 text-[rgb(var(--ink))]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{message.sender_name || message.sender?.full_name || 'Client'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)] truncate max-w-[180px]">
                            {message.subject || message.message || 'Nouveau message'}
                          </p>
                        </div>
                      </div>
                      {!message.is_read && <span className="chip">Nouveau</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="surface-panel p-6 xl:col-span-7">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Clients assignes</h2>
                  <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && assignedClientRequests.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun client assigne.</p>
                  )}
                  {assignedClientRequests.slice(0, 4).map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{request.name || 'Client'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {formatClientType(request.request_type)} | {request.phone || 'Sans telephone'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="chip">{clientStatusLabel(request.status)}</span>
                        <span className="chip">{getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}</span>
                        <span className="chip">{isDealConcluded(request) ? 'Offre conclue' : isAcceptedClient(request) ? 'En suivi' : 'En attente'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 xl:col-span-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Suivis en cours</h2>
                  <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && propertyActiveFollowUps.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun suivi en cours.</p>
                  )}
                  {propertyActiveFollowUps.slice(0, 4).map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{request.name || 'Client'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {request.property?.title || 'Propriete'} | {getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                        Derniere activite: {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 xl:col-span-7">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Offres conclues</h2>
                  <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && propertyConcludedDeals.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune offre conclue.</p>
                  )}
                  {propertyConcludedDeals.slice(0, 4).map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{request.name || 'Client'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {request.deal_sale_price || 'Prix non renseigne'} | Offre conclue
                      </p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                        {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 xl:col-span-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Demandes assignees</h2>
                  <button onClick={() => navigate('/agent/search-requests?view=assigned')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && assignedSearchRequests.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande assignee.</p>
                  )}
                  {assignedSearchRequests.slice(0, 4).map((request) => (
                    <div key={request.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">
                        {request.property_type?.name || 'Recherche personnalisee'}
                      </p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {request.city || request.location_preferences?.join(', ') || 'Localisation a definir'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 xl:col-span-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Proprietes assignees</h2>
                  <button onClick={() => navigate('/agent/properties')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && assignedProperties.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune propriete assignee.</p>
                  )}
                  {assignedProperties.slice(0, 6).map((property) => (
                    <div key={property.id || property.uuid} className="surface-soft px-4 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{property.title || 'Annonce sans titre'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{property.city || 'Localisation inconnue'}</p>
                      </div>
                      <span className="chip">{property.status || 'pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </>
            )}

            {agentType === 'constructeur' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="surface-panel p-6 xl:col-span-2">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3 max-w-2xl">
                      <p className="chip">Vue portefeuille client</p>
                      <h2 className="text-2xl font-semibold">Pilotage des dossiers construction</h2>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">
                        Suivez en un coup d oeil les clients actifs, les rapports deja transmis et les offres deja conclues.
                      </p>
                    </div>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost self-start">
                      Ouvrir les clients
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Clients actifs</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : constructionActiveFollowUps.length}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers en suivi actuellement.</p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Rapports transmis</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : stats.quotesSent}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Tous les suivis envoyes a l administrateur.</p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Offres conclues</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : constructionConcludedDeals.length}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers finalises et remontes.</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Messages recents</h2>
                    <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                      Repondre
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {!loading && recentMessages.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message.</p>
                    )}
                    {recentMessages.slice(0, 5).map((message) => (
                      <div key={message.id || message.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                            <Mail className="h-4 w-4 text-[rgb(var(--ink))]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{message.sender_name || message.sender?.full_name || 'Client'}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)] truncate max-w-[180px]">
                              {message.subject || message.message || 'Nouveau message'}
                            </p>
                          </div>
                        </div>
                        {!message.is_read && <span className="chip">Nouveau</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {agentType === 'investissement' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="surface-panel p-6 xl:col-span-2">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3 max-w-2xl">
                      <p className="chip">Vue portefeuille client</p>
                      <h2 className="text-2xl font-semibold">Pilotage des dossiers en investissement</h2>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">
                        Suivez en un coup d oeil les clients actifs, les rapports deja transmis et les offres deja conclues.
                      </p>
                    </div>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost self-start">
                      Ouvrir les clients
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Clients actifs</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : investmentActiveFollowUps.length}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers en suivi actuellement.</p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Rapports transmis</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : stats.quotesSent}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Tous les suivis envoyes a l administrateur.</p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Offres conclues</p>
                      <p className="mt-3 text-3xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : investmentConcludedDeals.length}</p>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.58)]">Dossiers finalises et remontes.</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Messages recents</h2>
                    <button onClick={() => navigate('/agent/messages')} className="btn-ghost">
                      Repondre
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {!loading && recentMessages.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message.</p>
                    )}
                    {recentMessages.slice(0, 5).map((message) => (
                      <div key={message.id || message.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                            <Mail className="h-4 w-4 text-[rgb(var(--ink))]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{message.sender_name || message.sender?.full_name || 'Client'}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)] truncate max-w-[180px]">
                              {message.subject || message.message || 'Nouveau message'}
                            </p>
                          </div>
                        </div>
                        {!message.is_read && <span className="chip">Nouveau</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {agentType === 'constructeur' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="surface-panel p-6 xl:col-span-7">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Clients assignes</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedClientRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun client assigne.</p>
                    )}
                    {assignedClientRequests.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.name || 'Client'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {formatClientType(request.request_type)} | {request.phone || 'Sans telephone'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="chip">{clientStatusLabel(request.status)}</span>
                          <span className="chip">{getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}</span>
                          <span className="chip">{isDealConcluded(request) ? 'Offre conclue' : isAcceptedClient(request) ? 'En suivi' : 'En attente'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Suivis en cours</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && constructionActiveFollowUps.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun suivi en cours.</p>
                    )}
                    {constructionActiveFollowUps.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.name || 'Client'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.construction_project?.title || request.constructionProject?.title || 'Projet construction'} | {getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          Derniere activite: {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-7">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Offres conclues</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && constructionConcludedDeals.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune offre conclue.</p>
                    )}
                    {constructionConcludedDeals.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.name || 'Client'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.deal_sale_price || 'Prix non renseigne'} | Offre conclue
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Demandes assignees</h2>
                    <button onClick={() => navigate('/agent/search-requests?view=assigned')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedSearchRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande assignee.</p>
                    )}
                    {assignedSearchRequests.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.property_type?.name || 'Demande assignee'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.city || request.location_preferences?.join(', ') || 'Localisation a definir'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {agentType === 'investissement' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="surface-panel p-6 xl:col-span-7">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Clients assignes</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedClientRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun client assigne.</p>
                    )}
                    {assignedClientRequests.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.name || 'Client'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {formatClientType(request.request_type)} | {request.phone || 'Sans telephone'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="chip">{clientStatusLabel(request.status)}</span>
                          <span className="chip">{getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}</span>
                          <span className="chip">{isDealConcluded(request) ? 'Offre conclue' : isAcceptedClient(request) ? 'En suivi' : 'En attente'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Suivis en cours</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedClientRequests.filter((request) => isAcceptedClient(request) && !isDealConcluded(request)).length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun suivi en cours.</p>
                    )}
                    {assignedClientRequests
                      .filter((request) => isAcceptedClient(request) && !isDealConcluded(request))
                      .slice(0, 4)
                      .map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.name || 'Client'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.investment_project?.title || request.investmentProject?.title || 'Projet investissement'} | {getClientReports(request).length} rapport{getClientReports(request).length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          Derniere activite: {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-7">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Offres conclues</h2>
                    <button onClick={() => navigate('/agent/assigned?view=clients')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && investmentConcludedDeals.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune offre conclue.</p>
                    )}
                    {investmentConcludedDeals
                      .slice(0, 4)
                      .map((request) => (
                        <div key={request.uuid} className="surface-soft px-4 py-3">
                          <p className="text-sm font-medium">{request.name || 'Client'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {request.deal_sale_price || 'Prix non renseigne'} | Offre conclue
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                            {getRequestDate(request) ? new Date(getRequestDate(request)).toLocaleString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="surface-panel p-6 xl:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Demandes assignees</h2>
                    <button onClick={() => navigate('/agent/search-requests?view=assigned')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedSearchRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande assignee.</p>
                    )}
                    {assignedSearchRequests.slice(0, 4).map((request) => (
                      <div key={request.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{request.property_type?.name || 'Demande assignee'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {request.city || request.location_preferences?.join(', ') || 'Localisation a definir'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardAgent;


