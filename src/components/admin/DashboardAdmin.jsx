import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building,
  FileText,
  Handshake,
  HardHat,
  Mail,
  MessageSquare,
  ShieldCheck,
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
    propertyRequests: 0,
    constructionRequests: 0,
    investmentRequests: 0,
    unreadMessages: 0,
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
          rolesRes,
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
          adminService.getRoles(),
          adminService.getUsers(),
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
        const roles = extractList(rolesRes);
        const users = extractList(usersRes);
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

        const roleNameById = new Map(roles.map((role) => [role.id, role.name || role.slug]));
        const usersPerRole = Array.from(
          users.reduce((acc, user) => {
            const roleId = user.role_id || user.role?.id || user.role;
            const label = roleNameById.get(roleId) || user.role?.name || user.role?.slug || 'Autre';
            acc.set(label, (acc.get(label) || 0) + 1);
            return acc;
          }, new Map())
        ).map(([label, value]) => ({ label, value }));

        setSummary({
          users: dashboardData.users_count ?? users.length,
          agents: agents.length,
          propertyRequests: propertyPending.length + propertyClientPending.length,
          constructionRequests: constructionClientPending.length,
          investmentRequests: investmentClientPending.length,
          unreadMessages,
        });

        setRoleStats(usersPerRole);
        setRecentMessages(messages.slice(0, 5));
        setDomainCards([
          {
            key: 'property',
            label: 'Propriete',
            icon: Building,
            color: 'bg-sky-100 text-sky-700',
            pending: propertyPending.length + propertyClientPending.length,
            followUp: countInFollowUp(propertyClientHistory),
            concluded: countConcluded(propertyClientHistory),
            action: () => navigate('/admin/assignments?type=property'),
          },
          {
            key: 'construction',
            label: 'Construction',
            icon: HardHat,
            color: 'bg-amber-100 text-amber-700',
            pending: constructionClientPending.length,
            followUp: countInFollowUp(constructionClientHistory),
            concluded: countConcluded(constructionClientHistory),
            action: () => navigate('/admin/assignments?type=construction'),
          },
          {
            key: 'investment',
            label: 'Investissement',
            icon: TrendingUp,
            color: 'bg-emerald-100 text-emerald-700',
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
        note: 'Agents mobilisables pour les assignations',
      },
      {
        title: 'Demandes propriete',
        value: summary.propertyRequests,
        icon: Building,
        note: 'Demandes proprietaires et clients',
      },
      {
        title: 'Demandes construction',
        value: summary.constructionRequests,
        icon: HardHat,
        note: 'Demandes clients construction',
      },
      {
        title: 'Demandes investissement',
        value: summary.investmentRequests,
        icon: TrendingUp,
        note: 'Demandes clients investissement',
      },
      {
        title: 'Messages non lus',
        value: summary.unreadMessages,
        icon: MessageSquare,
        note: 'Messages administratifs a traiter',
      },
    ],
    [summary]
  );

  const quickActions = [
    {
      label: 'Demandes propriete',
      description: 'Traiter et assigner',
      onClick: () => navigate('/admin/assignments?type=property'),
    },
    {
      label: 'Demandes construction',
      description: 'Traiter et assigner',
      onClick: () => navigate('/admin/assignments?type=construction'),
    },
    {
      label: "Demandes d'investissement",
      description: 'Traiter et assigner',
      onClick: () => navigate('/admin/investments?view=requests'),
    },
    {
      label: 'Historique clients',
      description: 'Suivi et offres conclues',
      onClick: () => navigate('/admin/clients?view=history'),
    },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="surface-panel p-6 xl:col-span-2">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3 max-w-2xl">
                    <p className="chip">Administration centrale</p>
                    <h1 className="text-3xl font-semibold">Pilotage global du backoffice</h1>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">
                      Supervisez les demandes par domaine, les suivis agents, les dossiers conclus et les points d attention prioritaires.
                    </p>
                  </div>
                  <div className="surface-soft px-4 py-3 flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--sage))]" />
                    <span className="text-xs font-medium text-[rgba(15,42,46,0.7)]">
                      Backoffice operationnel
                    </span>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {domainCards.map((card) => (
                    <button
                      key={card.key}
                      type="button"
                      onClick={card.action}
                      className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white/80 px-5 py-5 text-left transition hover:border-[rgba(15,42,46,0.18)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}>
                          <card.icon className="h-5 w-5" />
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                      </div>
                      <p className="mt-4 text-lg font-semibold text-[rgb(var(--ink))]">{card.label}</p>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">En attente</p>
                          <p className="mt-2 text-lg font-semibold">{loading ? '...' : card.pending}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Suivi</p>
                          <p className="mt-2 text-lg font-semibold">{loading ? '...' : card.followUp}</p>
                        </div>
                        <div className="rounded-2xl bg-[rgba(245,248,248,0.9)] px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Conclu</p>
                          <p className="mt-2 text-lg font-semibold">{loading ? '...' : card.concluded}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Actions rapides</h2>
                  <ShieldCheck className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="w-full flex items-center justify-between surface-soft px-4 py-3 text-left hover:border-[rgba(15,42,46,0.2)] transition"
                    >
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{action.description}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.title}</p>
                      <p className="text-3xl font-semibold mt-2">
                        {loading ? '...' : Number(stat.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-[rgb(var(--ink))]" />
                    </div>
                  </div>
                  <p className="text-xs text-[rgba(15,42,46,0.5)] mt-4">{stat.note}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Repartition des roles</h2>
                  <Users className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {roleStats.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune donnee disponible.</p>
                  )}
                  {roleStats.map((item) => (
                    <div key={item.label} className="surface-soft px-4 py-4 rounded-[22px]">
                      <p className="text-xs uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Role</p>
                      <p className="mt-2 text-sm font-medium text-[rgb(var(--ink))] break-words">{item.label}</p>
                      <p className="mt-4 text-2xl font-semibold text-[rgb(var(--ink))]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Messages recents</h2>
                  <Mail className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3">
                  {recentMessages.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message recent.</p>
                  )}
                  {recentMessages.map((message) => (
                    <div key={message.uuid || message.id} className="surface-soft px-4 py-4 rounded-[22px]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">
                          {message.sender_name || message.sender?.full_name || 'Client'}
                        </p>
                        {!message.is_read && <span className="chip shrink-0">Nouveau</span>}
                      </div>
                      <p className="mt-3 text-sm text-[rgba(15,42,46,0.62)] line-clamp-2 min-h-[2.5rem]">
                        {message.subject || message.message || 'Nouveau message'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Points d attention</h2>
                  <Handshake className="h-5 w-5 text-[rgba(15,42,46,0.55)]" />
                </div>
                <div className="space-y-3">
                  {recentAlerts.map((alert) => (
                    <div key={alert.label} className="surface-soft px-4 py-4 rounded-[22px]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[rgb(var(--ink))]">{alert.label}</p>
                          <p className="mt-2 text-xs text-[rgba(15,42,46,0.55)]">{alert.note}</p>
                        </div>
                        <div className="shrink-0 rounded-2xl bg-white px-3 py-2 text-center min-w-[64px]">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Total</p>
                          <p className="mt-1 text-xl font-semibold text-[rgb(var(--ink))]">{loading ? '...' : alert.value}</p>
                        </div>
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
