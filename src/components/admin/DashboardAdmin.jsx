import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building,
  Handshake,
  HardHat,
  Mail,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    users: 0,
    agents: 0,
    unreadMessages: 0,
    pendingPartnerships: 0,
  });
  const [domainCards, setDomainCards] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [roleStats, setRoleStats] = useState([]);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const extractList = (response) => {
    const payload = extractPayload(response);
    const list = payload?.data || payload;
    return Array.isArray(list) ? list : [];
  };
  const typeLabel = (type) => (
    type === 'construction' ? 'Construction'
      : type === 'investissement' ? 'Investissement'
        : 'Immobilier'
  );
  const statusLabel = (status) => {
    if (status === 'agent_approved') return 'Accepte par l agent';
    if (status === 'approved') return 'Accepte';
    if (status === 'agent_rejected') return 'Refuse par l agent';
    if (status === 'rejected') return 'Refuse';
    if (status === 'assigned') return 'Assigne';
    if (status === 'deal_concluded') return 'Offre conclue';
    if (status === 'pending') return 'En attente';
    return status || 'En attente';
  };
  const countConcluded = (items) => items.filter((item) => item?.deal_status === 'deal_concluded' || item?.status === 'deal_concluded').length;
  const countInFollowUp = (items) => items.filter((item) => ['approved', 'agent_approved'].includes(item?.status)).length;

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [
          dashboardRes,
          usersRes,
          agentsRes,
          propertyPendingRes,
          propertyHistoryRes,
          clientPendingRes,
          clientHistoryRes,
          messagesRes,
          partnershipsRes,
          pendingPartnershipsRes,
        ] = await Promise.all([
          adminService.getDashboard(),
          // per_page=1 : seules les stats globales (repartition par role, etc.)
          // nous interessent ici, pas la liste elle-meme.
          adminService.getUsers({ per_page: 1 }),
          adminService.getAvailableAgents(),
          adminService.getPendingPropertyRequests(),
          adminService.getPropertyRequestHistory(),
          adminService.getPendingClientRequests(),
          adminService.getClientRequestHistory(),
          adminService.getMessages(),
          adminService.getAllPartnerships(),
          adminService.getPendingPartnerships(),
        ]);

        const dashboardData = extractPayload(dashboardRes) || {};
        const userStats = usersRes?.data?.stats || {};
        const agents = extractList(agentsRes);
        const propertyPending = extractList(propertyPendingRes);
        const propertyHistory = extractList(propertyHistoryRes);
        const clientPending = extractList(clientPendingRes);
        const clientHistory = extractList(clientHistoryRes);
        const messages = extractList(messagesRes);
        const partnerships = extractList(partnershipsRes);
        const pendingPartnerships = extractList(pendingPartnershipsRes);

        const propertyClientPending = clientPending.filter((item) => (item.request_type || 'immobilier') === 'immobilier');
        const propertyClientHistory = clientHistory.filter((item) => (item.request_type || 'immobilier') === 'immobilier');
        const constructionClientPending = clientPending.filter((item) => item.request_type === 'construction');
        const constructionClientHistory = clientHistory.filter((item) => item.request_type === 'construction');
        const investmentClientPending = clientPending.filter((item) => item.request_type === 'investissement');
        const investmentClientHistory = clientHistory.filter((item) => item.request_type === 'investissement');
        const unreadMessages = messages.filter((message) => !message.is_read).length;

        setSummary({
          users: dashboardData.users_count ?? userStats.total ?? 0,
          agents: agents.length,
          unreadMessages,
          pendingPartnerships: pendingPartnerships.length,
        });

        setRoleStats(Array.isArray(userStats.by_role) ? userStats.by_role : []);
        setRecentMessages(messages.slice(0, 5));
        setDomainCards([
          {
            key: 'property',
            label: 'Propriete',
            icon: Building,
            hue: 'sky',
            pending: propertyPending.length + propertyClientPending.length,
            followUp: countInFollowUp(propertyClientHistory),
            concluded: countConcluded(propertyClientHistory),
            action: () => navigate('/admin/assignments?type=property'),
          },
          {
            key: 'construction',
            label: 'Construction',
            icon: HardHat,
            hue: 'amber',
            pending: constructionClientPending.length,
            followUp: countInFollowUp(constructionClientHistory),
            concluded: countConcluded(constructionClientHistory),
            action: () => navigate('/admin/assignments?type=construction'),
          },
          {
            key: 'investment',
            label: 'Investissement',
            icon: TrendingUp,
            hue: 'emerald',
            pending: investmentClientPending.length,
            followUp: countInFollowUp(investmentClientHistory),
            concluded: countConcluded(investmentClientHistory),
            action: () => navigate('/admin/investments?view=requests'),
          },
        ]);

        setRecentAlerts([
          {
            label: 'Demandes propriete a traiter',
            value: propertyPending.length + propertyClientPending.length,
            note: 'Demandes proprietaires et clients en attente.',
          },
          {
            label: 'Demandes construction a traiter',
            value: constructionClientPending.length,
            note: 'Demandes clients a assigner ou valider.',
          },
          {
            label: 'Demandes investissement a traiter',
            value: investmentClientPending.length,
            note: 'Demandes clients investissement a suivre.',
          },
          {
            label: 'Partenariats en attente',
            value: pendingPartnerships.length,
            note: `${partnerships.length} dossier(s) de partenariat au total.`,
          },
        ]);
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard admin:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const statCards = useMemo(
    () => [
      {
        title: 'Utilisateurs',
        value: summary.users,
        icon: Users,
        note: 'Comptes presents sur la plateforme',
      },
      {
        title: 'Agents disponibles',
        value: summary.agents,
        icon: UserCheck,
        note: 'Mobilisables pour les assignations',
      },
      {
        title: 'Messages non lus',
        value: summary.unreadMessages,
        icon: MessageSquare,
        note: 'A traiter par l equipe',
        highlight: summary.unreadMessages > 0,
      },
      {
        title: 'Partenariats en attente',
        value: summary.pendingPartnerships,
        icon: Handshake,
        note: 'Candidatures a valider',
        highlight: summary.pendingPartnerships > 0,
      },
    ],
    [summary]
  );

  // Rampe monotone (claire -> foncee) par domaine, pour les 3 etapes du pipeline
  // (Attente / Suivi / Conclu) : meme teinte que le domaine, intensite croissante.
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

  const maxRoleValue = Math.max(1, ...roleStats.map((item) => item.value));

  const quickActions = [
    {
      label: 'Demandes propriete',
      icon: Building,
      onClick: () => navigate('/admin/assignments?type=property'),
    },
    {
      label: 'Demandes construction',
      icon: HardHat,
      onClick: () => navigate('/admin/assignments?type=construction'),
    },
    {
      label: "Demandes d'investissement",
      icon: TrendingUp,
      onClick: () => navigate('/admin/investments?view=requests'),
    },
    {
      label: 'Demandes clients',
      icon: Users,
      onClick: () => navigate('/admin/clients?view=pending'),
    },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* En-tete */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 min-w-0">
                <p className="chip">Administration centrale</p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[rgb(var(--ink))]">Pilotage global du backoffice</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] max-w-2xl">
                  Vue d ensemble des demandes par domaine, des suivis agents et des points d attention prioritaires.
                </p>
              </div>
              <div className="surface-soft px-4 py-2.5 flex items-center gap-2.5 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                  Backoffice operationnel
                </span>
              </div>
            </div>

            {/* KPI cles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{stat.title}</p>
                      <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                        {loading ? '...' : Number(stat.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                        stat.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                      }`}
                    >
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[rgba(15,42,46,0.5)] mt-3 truncate">{stat.note}</p>
                </div>
              ))}
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.42)] mr-1">
                Actions rapides
              </span>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] bg-white/70 pl-3 pr-4 py-2 text-xs sm:text-sm font-medium text-[rgb(var(--ink))] transition hover:border-[rgba(15,42,46,0.25)] hover:bg-white"
                >
                  <action.icon className="h-4 w-4 text-[rgba(15,42,46,0.55)]" />
                  {action.label}
                </button>
              ))}
            </div>

            {/* Pipeline operationnel par domaine */}
            <div className="surface-panel p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Pipeline operationnel</h2>
                  <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">Repartition des dossiers par etape, pour chaque domaine.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {domainCards.map((card) => {
                  const total = Math.max(1, card.pending + card.followUp + card.concluded);
                  const pendingPct = (card.pending / total) * 100;
                  const followUpPct = (card.followUp / total) * 100;
                  const concludedPct = (card.concluded / total) * 100;
                  const ramp = domainRamp[card.hue];
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={card.action}
                      className="group rounded-[20px] border border-[rgba(15,42,46,0.08)] bg-white/80 p-5 text-left transition hover:border-[rgba(15,42,46,0.2)] hover:shadow-[0_12px_28px_rgba(15,42,46,0.08)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${domainBadge[card.hue]}`}>
                          <card.icon className="h-5 w-5" />
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-[rgba(15,42,46,0.35)] transition group-hover:text-[rgba(15,42,46,0.6)]" />
                      </div>
                      <p className="mt-3 text-base font-semibold text-[rgb(var(--ink))]">{card.label}</p>

                      {/* Barre proportionnelle des 3 etapes */}
                      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-[rgba(15,42,46,0.06)]">
                        {card.pending > 0 && (
                          <span className={domainBar[card.hue]} style={{ width: `${pendingPct}%`, opacity: 0.45 }} />
                        )}
                        {card.followUp > 0 && (
                          <span className={domainBar[card.hue]} style={{ width: `${followUpPct}%`, opacity: 0.75 }} />
                        )}
                        {card.concluded > 0 && (
                          <span className={domainBar[card.hue]} style={{ width: `${concludedPct}%` }} />
                        )}
                      </div>

                      <div className="mt-4 flex items-stretch gap-2">
                        <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${ramp[0]}`}>
                          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Attente</p>
                          <p className="mt-1 text-base font-semibold">{loading ? '...' : card.pending}</p>
                        </div>
                        <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${ramp[1]}`}>
                          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Suivi</p>
                          <p className="mt-1 text-base font-semibold">{loading ? '...' : card.followUp}</p>
                        </div>
                        <div className={`flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center ${ramp[2]}`}>
                          <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">Conclu</p>
                          <p className="mt-1 text-base font-semibold">{loading ? '...' : card.concluded}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panneaux secondaires - hauteur egale, 3 colonnes sur grand ecran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              <div className="surface-panel p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Repartition des roles</h2>
                  <Users className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3 flex-1">
                  {roleStats.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune donnee disponible.</p>
                  )}
                  {roleStats.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-[rgb(var(--ink))] truncate capitalize">{item.label}</p>
                        <p className="text-sm font-semibold text-[rgb(var(--ink))] shrink-0">{item.value}</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[rgba(15,42,46,0.06)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[rgb(var(--ink))]"
                          style={{ width: `${Math.max(6, (item.value / maxRoleValue) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {roleStats.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[rgba(15,42,46,0.08)] flex items-center justify-between">
                    <p className="text-xs text-[rgba(15,42,46,0.5)]">Total comptes actifs</p>
                    <p className="text-sm font-semibold text-[rgb(var(--ink))]">
                      {roleStats.reduce((sum, item) => sum + Number(item.value || 0), 0)}
                    </p>
                  </div>
                )}
              </div>

              <div className="surface-panel p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Messages recents</h2>
                  <Mail className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3 flex-1">
                  {recentMessages.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message recent.</p>
                  )}
                  {recentMessages.map((message) => (
                    <div key={message.uuid || message.id} className="surface-soft px-4 py-3.5 rounded-[18px]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">
                          {message.sender_name || message.sender?.full_name || 'Client'}
                        </p>
                        {!message.is_read && <span className="chip shrink-0">Nouveau</span>}
                      </div>
                      <p className="mt-2 text-sm text-[rgba(15,42,46,0.62)] line-clamp-2">
                        {message.subject || message.message || 'Nouveau message'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Points d attention</h2>
                  <Handshake className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3 flex-1">
                  {recentAlerts.map((alert) => (
                    <div key={alert.label} className="surface-soft px-4 py-3.5 rounded-[18px] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">{alert.label}</p>
                        <p className="mt-1 text-xs text-[rgba(15,42,46,0.55)] truncate">{alert.note}</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-[rgba(15,42,46,0.06)] h-10 w-10 flex items-center justify-center">
                        <p className="text-sm font-semibold text-[rgb(var(--ink))]">{loading ? '...' : alert.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardAdmin;
