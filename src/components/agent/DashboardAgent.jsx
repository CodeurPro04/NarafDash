import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { CheckCircle, Clock, MessageSquare, Building, Mail, ArrowUpRight, Archive, FileText, HardHat, Send, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const DashboardAgent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agentType = (user?.agent_type || user?.agentType || 'immobilier').toLowerCase();
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

  useEffect(() => {
    loadDashboardData();
  }, [agentType]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      if (agentType === 'immobilier') {
        const [propertiesRes, messagesRes, searchesRes, clientsRes] = await Promise.all([
          agentService.getAssignedProperties(),
          agentService.getMessages(),
          agentService.getAssignedSearchRequests(),
          agentService.getAssignedClientRequests(),
        ]);

        const properties = extractPayload(propertiesRes).data || extractPayload(propertiesRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);
        const searches = extractPayload(searchesRes).data || extractPayload(searchesRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);

        setAssignedProperties(Array.isArray(properties) ? properties : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);
        setAssignedSearchRequests(Array.isArray(searches) ? searches : []);
        setAssignedClientRequests(Array.isArray(clients) ? clients : []);

        const toValidate = (Array.isArray(properties) ? properties : []).filter((p) => ['pending', 'draft'].includes(p.status)).length;
        const validated = (Array.isArray(properties) ? properties : []).filter((p) => p.status === 'approved').length;
        const archived = (Array.isArray(properties) ? properties : []).filter((p) => ['rejected', 'archived'].includes(p.status)).length;
        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;

        setStats((prev) => ({
          ...prev,
          propertiesToValidate: toValidate,
          validatedProperties: validated,
          archivedProperties: archived,
          unreadMessages: unreadMsgs,
          assignedProperties: Array.isArray(properties) ? properties.length : 0,
          assignedSearchRequests: Array.isArray(searches) ? searches.length : 0,
          assignedClientRequests: Array.isArray(clients) ? clients.length : 0,
        }));
      } else if (agentType === 'constructeur') {
        const [constructionsRes, publicationsRes, clientsRes, messagesRes] = await Promise.all([
          agentService.getAssignedConstructionProjects(),
          agentService.getConstructionPublications(),
          agentService.getAssignedClientRequests(),
          agentService.getMessages(),
        ]);

        const constructions = extractPayload(constructionsRes).data || extractPayload(constructionsRes);
        const publications = extractPayload(publicationsRes).data || extractPayload(publicationsRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);

        setAssignedConstructionProjects(Array.isArray(constructions) ? constructions : []);
        setConstructionPublications(Array.isArray(publications) ? publications : []);
        setAssignedClientRequests(Array.isArray(clients) ? clients : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);

        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;
        const quotesSent = (Array.isArray(constructions) ? constructions : []).filter((project) => (
          project.status === 'sent'
          || project.status === 'quoted'
          || project.status === 'completed'
          || project.quote_sent_at
          || project.has_quote
        )).length;
        const pendingPublications = (Array.isArray(publications) ? publications : []).filter((project) => (
          project.status === 'submitted' || project.status === 'pending'
        )).length;

        setStats((prev) => ({
          ...prev,
          unreadMessages: unreadMsgs,
          assignedConstructionProjects: Array.isArray(constructions) ? constructions.length : 0,
          quotesSent,
          assignedClientRequests: Array.isArray(clients) ? clients.length : 0,
          pendingPublications,
          totalPublications: Array.isArray(publications) ? publications.length : 0,
        }));
      } else {
        const [publicationsRes, clientsRes, messagesRes] = await Promise.all([
          agentService.getInvestmentPublications(),
          agentService.getAssignedClientRequests(),
          agentService.getMessages(),
        ]);

        const publications = extractPayload(publicationsRes).data || extractPayload(publicationsRes);
        const clients = extractPayload(clientsRes).data || extractPayload(clientsRes);
        const messages = extractPayload(messagesRes).data || extractPayload(messagesRes);

        setInvestmentPublications(Array.isArray(publications) ? publications : []);
        setAssignedClientRequests(Array.isArray(clients) ? clients : []);
        setRecentMessages(Array.isArray(messages) ? messages : []);

        const unreadMsgs = (Array.isArray(messages) ? messages : []).filter((m) => !m.is_read).length;
        const pendingPublications = (Array.isArray(publications) ? publications : []).filter((project) => (
          project.approval_status === 'pending' || project.approval_status === 'submitted'
        )).length;

        setStats((prev) => ({
          ...prev,
          unreadMessages: unreadMsgs,
          assignedClientRequests: Array.isArray(clients) ? clients.length : 0,
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
        { title: 'Messages non lus', value: stats.unreadMessages, icon: MessageSquare },
        { title: 'Annonces', value: stats.assignedProperties, icon: Building },
        { title: 'Demandes', value: stats.assignedSearchRequests, icon: FileText },
        { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
      ];
    }
    if (agentType === 'constructeur') {
      return [
        { title: 'Messages non lus', value: stats.unreadMessages, icon: MessageSquare },
        { title: 'Chantiers assignes', value: stats.assignedConstructionProjects, icon: HardHat },
        { title: 'Devis envoyes', value: stats.quotesSent, icon: Send },
        { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
        { title: 'Publications', value: stats.totalPublications, icon: Building },
        { title: 'En attente', value: stats.pendingPublications, icon: Clock },
      ];
    }
    return [
      { title: 'Messages non lus', value: stats.unreadMessages, icon: MessageSquare },
      { title: 'Clients', value: stats.assignedClientRequests, icon: Users },
      { title: 'Publications', value: stats.totalPublications, icon: Building },
      { title: 'En attente', value: stats.pendingPublications, icon: Clock },
    ];
  }, [agentType, stats]);

  const headerCopy = useMemo(() => {
    if (agentType === 'constructeur') {
      return {
        label: 'Agent constructeur',
        title: 'Suivi des projets de construction',
        subtitle: 'Gerez les demandes clients et vos publications en attente.',
      };
    }
    if (agentType === 'investissement') {
      return {
        label: 'Agent investisseur',
        title: "Suivi des projets d'investissement",
        subtitle: "Pilotez les demandes d'investissement et vos publications.",
      };
    }
    return {
      label: 'Agent',
      title: 'Vos taches prioritaires',
      subtitle: 'Suivez les annonces assignees et repondez aux demandes clients.',
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

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="chip">{headerCopy.label}</p>
                <span className={`chip ${typeBadge.className}`}>Type: {typeBadge.label}</span>
              </div>
              <h1 className="text-3xl font-semibold mt-3">{headerCopy.title}</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {headerCopy.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.title}</p>
                      <p className="text-3xl font-semibold mt-2">{loading ? '...' : stat.value}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-[rgb(var(--ink))]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agentType === 'immobilier' && (
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Annonces assignees</h2>
                    <button onClick={() => navigate('/agent/properties')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedProperties.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune annonce assignee.</p>
                    )}
                    {assignedProperties.slice(0, 5).map((property) => (
                      <div key={property.id || property.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{property.title || 'Annonce sans titre'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">{property.city || 'Localisation inconnue'}</p>
                        </div>
                        <span className="chip">{property.status || 'pending'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agentType === 'constructeur' && (
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Chantiers assignes</h2>
                    <button onClick={() => navigate('/agent/construction')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && assignedConstructionProjects.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet assigne.</p>
                    )}
                    {assignedConstructionProjects.slice(0, 5).map((project) => (
                      <div key={project.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

            {agentType === 'immobilier' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Demandes de recherche</h2>
                    <button onClick={() => navigate('/agent/search-requests')} className="btn-ghost">
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

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Clients assignes</h2>
                    <button onClick={() => navigate('/agent/assigned')} className="btn-ghost">
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {agentType === 'constructeur' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Publications construction</h2>
                    <button onClick={() => navigate('/agent/construction-publications')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && constructionPublications.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune publication.</p>
                    )}
                    {constructionPublications.slice(0, 4).map((project) => (
                      <div key={project.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | Statut {project.status || 'submitted'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Clients assignes</h2>
                    <button onClick={() => navigate('/agent/assigned')} className="btn-ghost">
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {agentType === 'investissement' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Clients assignes</h2>
                    <button onClick={() => navigate('/agent/assigned')} className="btn-ghost">
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
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Publications investissement</h2>
                    <button onClick={() => navigate('/agent/investment-publications')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && investmentPublications.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune publication.</p>
                    )}
                    {investmentPublications.slice(0, 4).map((project) => (
                      <div key={project.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{project.title || 'Projet investissement'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | Statut {project.approval_status || 'pending'}
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

