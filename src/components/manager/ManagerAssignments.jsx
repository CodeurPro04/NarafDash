import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService } from '../../services/api';
import ClientRequestDomainSections from '../admin/ClientRequestDomainSections';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, FileText, HardHat, CheckCircle, XCircle, Home, Search } from 'lucide-react';

const ManagerAssignments = () => {
  const [agents, setAgents] = useState([]);
  const [searchRequests, setSearchRequests] = useState([]);
  const [constructionRequests, setConstructionRequests] = useState([]);
  const [propertyRequests, setPropertyRequests] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [constructionHistory, setConstructionHistory] = useState([]);
  const [propertyHistory, setPropertyHistory] = useState([]);
  const [clientHistory, setClientHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState({});
  const [rejectModal, setRejectModal] = useState({ open: false, type: null, item: null, reason: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, item: null, title: '' });
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeDecision, setActiveDecision] = useState('all');
  const [activeAgent, setActiveAgent] = useState('all');
  const [scopedSearchTerm, setScopedSearchTerm] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const viewType = new URLSearchParams(location.search).get('type');
  const isPropertyView = viewType === 'property';
  const isConstructionView = viewType === 'construction';

  const assignmentService = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const formatRequester = (user) => {
    if (!user) return 'Client';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const phone = user.phone ? ` (${user.phone})` : '';
    return `${name || 'Client'}${phone}`;
  };
  const decisionLabel = (status) => {
    if (!status) return 'En attente';
    if (['approved', 'agent_approved', 'property_created', 'fulfilled', 'completed'].includes(status)) return 'Accepte';
    if (['rejected', 'agent_rejected'].includes(status)) return 'Refuse';
    if (['assigned', 'in_progress', 'in_study', 'quoted'].includes(status)) return 'En cours';
    return 'En attente';
  };
  const statusLabel = (status) => {
    const normalized = status || 'pending';
    const mapping = {
      pending: 'En attente',
      approved: 'Approuve',
      rejected: 'Rejete',
      assigned: 'Assigne',
      in_study: 'En etude',
      in_progress: 'En cours',
      quoted: 'Devis envoye',
      submitted: 'Soumis',
      agent_approved: "Approuve par l'agent",
      agent_rejected: "Refuse par l'agent",
      property_created: 'Propriete creee',
      fulfilled: 'Traitee',
      completed: 'Terminee',
    };
    return mapping[normalized] || normalized;
  };
  const statusBadge = (status) => {
    const normalized = status || 'pending';
    if (['approved', 'agent_approved', 'property_created', 'fulfilled', 'completed'].includes(normalized)) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (['rejected', 'agent_rejected'].includes(normalized)) {
      return 'bg-rose-100 text-rose-700';
    }
    if (['assigned', 'in_progress', 'in_study', 'quoted'].includes(normalized)) {
      return 'bg-amber-100 text-amber-700';
    }
    return 'bg-slate-100 text-slate-700';
  };
  const matchesStatus = (item) => activeStatus === 'all' || (item.status || 'pending') === activeStatus;
  const matchesDecision = (item) => activeDecision === 'all' || decisionLabel(item.status) === activeDecision;
  const matchesAgent = (item) => {
    if (activeAgent === 'all') return true;
    if (activeAgent === 'assigned') return Boolean(item.agent);
    if (activeAgent === 'unassigned') return !item.agent;
    return true;
  };
  const filteredItems = (items, type) => {
    if (activeType !== 'all' && activeType !== type) return [];
    return items.filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item));
  };
  const getItemDate = (item) => item?.updated_at || item?.created_at || null;
  const typeLabel = (type) => {
    if (type === 'search') return 'Recherche';
    if (type === 'construction') return 'Construction';
    if (type === 'property') return 'Propriete';
    return 'Demande';
  };
  const scopedPropertyRequests = useMemo(
    () => filteredItems(propertyRequests, 'property').filter((item) => {
      const term = scopedSearchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.toLowerCase().includes(term)
        || (item.description || '').toLowerCase().includes(term)
        || decisionLabel(item.status).toLowerCase().includes(term)
        || statusLabel(item.status).toLowerCase().includes(term)
      );
    }),
    [propertyRequests, activeType, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedPropertyHistory = useMemo(
    () => propertyHistory
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.toLowerCase().includes(term)
          || (item.description || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aDate = getItemDate(a) ? new Date(getItemDate(a)).getTime() : 0;
        const bDate = getItemDate(b) ? new Date(getItemDate(b)).getTime() : 0;
        return bDate - aDate;
      }),
    [propertyHistory, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedConstructionRequests = useMemo(
    () => filteredItems(constructionRequests, 'construction').filter((item) => {
      const term = scopedSearchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (item.title || '').toLowerCase().includes(term)
        || (item.city || '').toLowerCase().includes(term)
        || (item.location || '').toLowerCase().includes(term)
        || decisionLabel(item.status).toLowerCase().includes(term)
        || statusLabel(item.status).toLowerCase().includes(term)
      );
    }),
    [constructionRequests, activeType, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedConstructionClientRequests = useMemo(
    () => clientRequests
      .filter((item) => item.request_type === 'construction')
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.sector || '').toLowerCase().includes(term)
          || (item.department || '').toLowerCase().includes(term)
          || (item.project_description || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      }),
    [clientRequests, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedConstructionHistory = useMemo(
    () => constructionHistory
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.title || '').toLowerCase().includes(term)
          || (item.city || '').toLowerCase().includes(term)
          || (item.location || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aDate = getItemDate(a) ? new Date(getItemDate(a)).getTime() : 0;
        const bDate = getItemDate(b) ? new Date(getItemDate(b)).getTime() : 0;
        return bDate - aDate;
      }),
    [constructionHistory, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedConstructionClientHistory = useMemo(
    () => clientHistory
      .filter((item) => item.request_type === 'construction')
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.sector || '').toLowerCase().includes(term)
          || (item.department || '').toLowerCase().includes(term)
          || (item.project_description || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aDate = getItemDate(a) ? new Date(getItemDate(a)).getTime() : 0;
        const bDate = getItemDate(b) ? new Date(getItemDate(b)).getTime() : 0;
        return bDate - aDate;
      }),
    [clientHistory, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedPropertyClientRequests = useMemo(
    () => clientRequests
      .filter((item) => (item.request_type || 'immobilier') === 'immobilier')
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      }),
    [clientRequests, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const scopedPropertyClientHistory = useMemo(
    () => clientHistory
      .filter((item) => (item.request_type || 'immobilier') === 'immobilier')
      .filter((item) => matchesStatus(item) && matchesDecision(item) && matchesAgent(item))
      .filter((item) => {
        const term = scopedSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
          || decisionLabel(item.status).toLowerCase().includes(term)
          || statusLabel(item.status).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aDate = getItemDate(a) ? new Date(getItemDate(a)).getTime() : 0;
        const bDate = getItemDate(b) ? new Date(getItemDate(b)).getTime() : 0;
        return bDate - aDate;
      }),
    [clientHistory, activeStatus, activeDecision, activeAgent, scopedSearchTerm]
  );
  const agentActivity = useMemo(() => {
    const map = new Map();
    const addItem = (item, type) => {
      if (!item?.agent) return;
      const agentId = item.agent.id || item.agent.user_id || item.agent_id;
      if (!agentId) return;
      const prev = map.get(agentId) || {
        id: agentId,
        name: `${item.agent.first_name || ''} ${item.agent.last_name || ''}`.trim() || 'Agent',
        agent_type: item.agent.agent_type || 'N/A',
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        inProgress: 0,
        types: { search: 0, construction: 0, property: 0 },
        lastActivity: null,
      };

      prev.total += 1;
      prev.types[type] = (prev.types[type] || 0) + 1;

      const decision = decisionLabel(item.status);
      if (decision === 'Accepte') prev.approved += 1;
      else if (decision === 'Refuse') prev.rejected += 1;
      else if (decision === 'En cours') prev.inProgress += 1;
      else prev.pending += 1;

      const dateValue = getItemDate(item);
      if (dateValue && (!prev.lastActivity || new Date(dateValue) > new Date(prev.lastActivity))) {
        prev.lastActivity = dateValue;
      }

      map.set(agentId, prev);
    };

    searchHistory.forEach((item) => addItem(item, 'search'));
    constructionHistory.forEach((item) => addItem(item, 'construction'));
    propertyHistory.forEach((item) => addItem(item, 'property'));
    searchRequests.forEach((item) => addItem(item, 'search'));
    constructionRequests.forEach((item) => addItem(item, 'construction'));
    propertyRequests.forEach((item) => addItem(item, 'property'));

    return Array.from(map.values()).sort((a, b) => {
      const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return bDate - aDate;
    });
  }, [searchHistory, constructionHistory, propertyHistory, searchRequests, constructionRequests, propertyRequests]);

  const activityFeed = useMemo(() => {
    const entries = [];
    const pushEntry = (item, type, title, subtitle) => {
      if (!item) return;
      entries.push({
        uuid: item.uuid,
        type,
        title,
        subtitle,
        status: item.status || 'pending',
        decision: decisionLabel(item.status),
        agent: item.agent,
        date: getItemDate(item),
        rejection_reason: item.rejection_reason,
      });
    };

    searchHistory.forEach((item) => pushEntry(
      item,
      'search',
      item.property_type?.name || 'Recherche personnalisee',
      `${item.city || item.location_preferences?.join(', ') || 'Localisation'}`
    ));
    constructionHistory.forEach((item) => pushEntry(
      item,
      'construction',
      item.title || 'Projet construction',
      `${item.city || item.location || 'Localisation'}`
    ));
    propertyHistory.forEach((item) => pushEntry(
      item,
      'property',
      item.user ? `${item.user.first_name} ${item.user.last_name}` : 'Proprietaire',
      item.description?.slice(0, 80) || 'Demande de propriete'
    ));

    return entries
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [searchHistory, constructionHistory, propertyHistory]);
  const scopedActivityFeed = useMemo(() => (
    isPropertyView
      ? activityFeed.filter((entry) => entry.type === 'property')
      : activityFeed
  ), [activityFeed, isPropertyView]);

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (['search', 'construction', 'property'].includes(type)) {
      setActiveType(type);
      return;
    }
    setActiveType('all');
  }, [location.search]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const [agentsRes, searchRes, constructionRes, propertyRes, clientRes, searchHistoryRes, constructionHistoryRes, propertyHistoryRes, clientHistoryRes] = await Promise.all([
        assignmentService.getAvailableAgents(),
        assignmentService.getPendingSearchRequests(),
        assignmentService.getPendingConstructionProjects(),
        assignmentService.getPendingPropertyRequests(),
        assignmentService.getPendingClientRequests(),
        assignmentService.getSearchRequestHistory(),
        assignmentService.getConstructionHistory(),
        assignmentService.getPropertyRequestHistory(),
        assignmentService.getClientRequestHistory(),
      ]);

      const agentsList = extractPayload(agentsRes);
      const searchPayload = extractPayload(searchRes);
      const constructionPayload = extractPayload(constructionRes);
      const propertyPayload = extractPayload(propertyRes);
      const clientPayload = extractPayload(clientRes);
      const searchHistoryPayload = extractPayload(searchHistoryRes);
      const constructionHistoryPayload = extractPayload(constructionHistoryRes);
      const propertyHistoryPayload = extractPayload(propertyHistoryRes);
      const clientHistoryPayload = extractPayload(clientHistoryRes);

      setAgents(Array.isArray(agentsList) ? agentsList : []);
      setSearchRequests(Array.isArray(searchPayload.data || searchPayload) ? (searchPayload.data || searchPayload) : []);
      setConstructionRequests(Array.isArray(constructionPayload.data || constructionPayload) ? (constructionPayload.data || constructionPayload) : []);
      setPropertyRequests(Array.isArray(propertyPayload.data || propertyPayload) ? (propertyPayload.data || propertyPayload) : []);
      setClientRequests(Array.isArray(clientPayload.data || clientPayload) ? (clientPayload.data || clientPayload) : []);
      setSearchHistory(Array.isArray(searchHistoryPayload.data || searchHistoryPayload) ? (searchHistoryPayload.data || searchHistoryPayload) : []);
      setConstructionHistory(Array.isArray(constructionHistoryPayload.data || constructionHistoryPayload) ? (constructionHistoryPayload.data || constructionHistoryPayload) : []);
      setPropertyHistory(Array.isArray(propertyHistoryPayload.data || propertyHistoryPayload) ? (propertyHistoryPayload.data || propertyHistoryPayload) : []);
      setClientHistory(Array.isArray(clientHistoryPayload.data || clientHistoryPayload) ? (clientHistoryPayload.data || clientHistoryPayload) : []);
    } catch (error) {
      console.error('Erreur lors du chargement des assignations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (type, uuid) => {
    const agentId = assignments[uuid];
    if (!agentId) {
      alert('Veuillez selectionner un agent');
      return;
    }

    try {
      if (type === 'search') {
        await assignmentService.assignSearchRequest(uuid, { agent_id: agentId });
        setSearchRequests((prev) => prev.filter((item) => item.uuid !== uuid));
      }
      if (type === 'construction') {
        await assignmentService.assignConstructionProject(uuid, { agent_id: agentId });
        setConstructionRequests((prev) => prev.filter((item) => item.uuid !== uuid));
      }
      if (type === 'construction-client') {
        await assignmentService.assignClientRequest(uuid, { agent_id: agentId });
        setClientRequests((prev) => prev.filter((item) => item.uuid !== uuid));
      }
      if (type === 'property') {
        await assignmentService.assignPropertyRequest(uuid, { agent_id: agentId });
        setPropertyRequests((prev) => prev.filter((item) => item.uuid !== uuid));
      }
      await loadAssignments();
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const handleApproveDomainClientRequest = async (uuid) => {
    try {
      await assignmentService.approveClientRequest(uuid);
      await loadAssignments();
    } catch (error) {
      console.error('Erreur lors de la decision:', error);
      alert('Erreur lors de la decision');
    }
  };

  const handleAssignDomainClientRequest = async (uuid) => {
    const agentId = assignments[uuid];
    if (!agentId) {
      alert('Veuillez selectionner un agent');
      return;
    }
    try {
      await assignmentService.assignClientRequest(uuid, { agent_id: agentId });
      await loadAssignments();
    } catch (error) {
      console.error('Erreur lors de l assignation:', error);
      alert(error.response?.data?.message || 'Erreur lors de l assignation');
    }
  };

  const openDomainClientRejectModal = (item) => {
    setRejectModal({ open: true, type: 'client-request', item, reason: '' });
  };

  const handleDecision = async (type, item, decision) => {
    if (decision === 'reject' && (type === 'construction' || type === 'construction-client' || type === 'property')) {
      setRejectModal({ open: true, type, item, reason: '' });
      return;
    }
    try {
      if (type === 'search') {
        if (decision === 'approve') {
          await assignmentService.approveSearchRequest(item.uuid);
        } else {
          await assignmentService.rejectSearchRequest(item.uuid);
        }
      }
      if (type === 'construction') {
        if (decision === 'approve') {
          await assignmentService.approveConstructionProject(item.uuid);
        }
      }
      if (type === 'construction-client' && decision === 'approve') {
        await assignmentService.approveClientRequest(item.uuid);
      }
      if (type === 'property') {
        if (decision === 'approve') {
          await assignmentService.approvePropertyRequest(item.uuid);
        }
      }
      await loadAssignments();
    } catch (error) {
      console.error('Erreur lors de la decision:', error);
      alert('Erreur lors de la decision');
    }
  };

  const confirmReject = async () => {
    if (!rejectModal.item?.uuid) return;
    const reason = rejectModal.reason.trim();
    if (rejectModal.type === 'construction' && !reason) {
      alert('Motif obligatoire.');
      return;
    }
    try {
      if (rejectModal.type === 'construction') {
        await assignmentService.rejectConstructionProject(rejectModal.item.uuid, { rejection_reason: reason });
      }
      if (rejectModal.type === 'construction-client' || rejectModal.type === 'client-request') {
        await assignmentService.rejectClientRequest(rejectModal.item.uuid, { rejection_reason: reason });
      }
      if (rejectModal.type === 'property') {
        await assignmentService.rejectPropertyRequest(rejectModal.item.uuid, { rejection_reason: reason || null });
      }
      await loadAssignments();
      setRejectModal({ open: false, type: null, item: null, reason: '' });
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      alert('Erreur lors du rejet');
    }
  };

  const requiredAgentType = (type) => (
    type === 'construction' || type === 'construction-client' ? 'constructeur' : 'immobilier'
  );

  const canDecide = (item, type) => {
    const status = item.status || 'pending';
    if (type === 'construction') return ['submitted', 'pending'].includes(status);
    if (type === 'construction-client') return ['pending', 'approved'].includes(status);
    if (type === 'search') return status === 'pending';
    if (type === 'property') return status === 'pending';
    return status === 'pending';
  };
  const rejectionModalTitle = (item, fallback = 'Motif du rejet') => (
    item?.status === 'agent_rejected' ? 'Motif du refus agent' : fallback
  );

  const renderAssignRow = (item, type, title, subtitle) => (
    <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">{subtitle}</p>
          <p className="text-xs text-[rgba(15,42,46,0.5)]">
            Decision: {decisionLabel(item.status)} | Agent: {item.agent ? `${item.agent.first_name} ${item.agent.last_name}` : 'Non assigne'}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
          Statut: {statusLabel(item.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 items-start">
        {canDecide(item, type) && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleDecision(type, item, 'approve')} className="btn-primary">
              <CheckCircle className="h-4 w-4" />
              Approuver
            </button>
            <button onClick={() => handleDecision(type, item, 'reject')} className="btn-ghost">
              <XCircle className="h-4 w-4" />
              Rejeter
            </button>
          </div>
        )}
        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
          <button
            type="button"
            className="btn-ghost text-[rgb(var(--clay))]"
            onClick={() => setHistoryModal({ open: true, item, title: rejectionModalTitle(item) })}
          >
            {item.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:grid-cols-1 gap-2">
          <p className="text-xs text-[rgba(15,42,46,0.55)]">
            Agents requis: {requiredAgentType(type)}
          </p>
          <select
            value={assignments[item.uuid] || ''}
            onChange={(e) => setAssignments((prev) => ({ ...prev, [item.uuid]: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
          >
            <option value="">Selectionner un agent</option>
            {agents
              .filter((agent) => {
                const needed = requiredAgentType(type);
                return !agent.agent_type || agent.agent_type === needed;
              })
              .map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.first_name} {agent.last_name} {agent.agent_type ? `(${agent.agent_type})` : ''}
              </option>
              ))}
          </select>
          <button onClick={() => handleAssign(type, item.uuid)} className="btn-primary" disabled={item.status !== 'approved'}>
            <UserCheck className="h-4 w-4" />
            Assigner
          </button>
        </div>
      </div>
    </div>
  );

  const renderConstructionClientRow = (item, isHistory = false) => {
    const description = item.project_description || item.message || 'Demande de projet de construction';
    const location = [item.sector, item.department].filter(Boolean).join(' | ') || 'Localisation non renseignee';
    const requester = [item.name || 'Client', item.email, item.phone].filter(Boolean).join(' | ');

    return (
      <div key={item.uuid} className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white px-5 py-4 shadow-[0_16px_36px_rgba(15,42,46,0.05)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[rgb(var(--ink))]">Demande de projet de construction</p>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <p className="text-sm leading-6 text-[rgba(15,42,46,0.68)]">{description}</p>
          </div>
          <div className="text-xs text-[rgba(15,42,46,0.48)]">
            {getItemDate(item) ? new Date(getItemDate(item)).toLocaleString('fr-FR') : 'N/A'}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Client</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{requester || 'Non renseigne'}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Zone du projet</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{location}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Decision</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{decisionLabel(item.status)}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Agent</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">
              {item.agent ? `${item.agent.first_name} ${item.agent.last_name}` : 'Non assigne'}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgb(var(--line))] bg-white/75 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Reference</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{item.uuid}</p>
          </div>
        </div>

        {!isHistory && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 items-start">
            {canDecide(item, 'construction-client') && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleDecision('construction-client', item, 'approve')} className="btn-primary">
                  <CheckCircle className="h-4 w-4" />
                  Approuver
                </button>
                <button onClick={() => handleDecision('construction-client', item, 'reject')} className="btn-ghost">
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:grid-cols-1 gap-2">
              <p className="text-xs text-[rgba(15,42,46,0.55)]">Agents requis: constructeur</p>
              <select
                value={assignments[item.uuid] || ''}
                onChange={(e) => setAssignments((prev) => ({ ...prev, [item.uuid]: e.target.value }))}
                className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              >
                <option value="">Choisir un agent</option>
                {agents
                  .filter((agent) => agent.agent_type === 'constructeur')
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name}
                    </option>
                  ))}
              </select>
              <button type="button" onClick={() => handleAssign('construction-client', item.uuid)} className="btn-primary">
                <UserCheck className="h-4 w-4" />
                Assigner
              </button>
            </div>
          </div>
        )}

        {['rejected', 'agent_rejected'].includes(item.status) && item.rejection_reason && (
          <button
            type="button"
            className="mt-3 btn-ghost text-[rgb(var(--clay))]"
            onClick={() => setHistoryModal({
              open: true,
              item,
              title: rejectionModalTitle(item, 'Motif de rejet - Construction'),
            })}
          >
            {item.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
          </button>
        )}
      </div>
    );
  };
  const renderPropertyRequestCard = (request) => (
    <div key={request.uuid} className="overflow-hidden rounded-[28px] border border-[rgba(15,42,46,0.08)] bg-white shadow-[0_20px_45px_rgba(15,42,46,0.06)]">
      <div className="border-b border-[rgba(15,42,46,0.06)] bg-[linear-gradient(135deg,rgba(15,42,46,0.06),rgba(199,109,74,0.10))] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(15,42,46,0.62)]">
                Demande de propriete
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(request.status)}`}>
                {decisionLabel(request.status)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[rgb(var(--ink))]">
              {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Proprietaire'}
            </h3>
            <p className="text-sm text-[rgba(15,42,46,0.65)]">
              {request.description || 'Demande de propriete'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-xs text-[rgba(15,42,46,0.62)]">
            <p>Statut: <span className="font-semibold text-[rgb(var(--ink))]">{request.status || 'pending'}</span></p>
            <p className="mt-1">Etat: <span className="font-semibold text-[rgb(var(--ink))]">{statusLabel(request.status)}</span></p>
            <p className="mt-1">Agent: <span className="font-semibold text-[rgb(var(--ink))]">{request.agent ? `${request.agent.first_name} ${request.agent.last_name}` : 'Non assigne'}</span></p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Demandeur</p>
            <p className="mt-2 text-sm font-medium text-[rgb(var(--ink))]">{formatRequester(request.user)}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Decision</p>
            <p className="mt-2 text-sm font-medium text-[rgb(var(--ink))]">{decisionLabel(request.status)}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Derniere mise a jour</p>
            <p className="mt-2 text-sm font-medium text-[rgb(var(--ink))]">
              {getItemDate(request) ? new Date(getItemDate(request)).toLocaleString('fr-FR') : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="rounded-2xl border border-[rgba(15,42,46,0.08)] bg-[rgba(255,253,250,0.8)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Notes de la demande</p>
            <p className="mt-3 text-sm leading-6 text-[rgba(15,42,46,0.72)]">
              {request.description || 'Aucune precision complementaire fournie.'}
            </p>
            {['rejected', 'agent_rejected'].includes(request.status) && request.rejection_reason && (
              <div className="mt-4 rounded-2xl border border-[rgba(199,109,74,0.18)] bg-[rgba(199,109,74,0.08)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">
                  {request.status === 'agent_rejected' ? 'Refus agent' : 'Rejet'}
                </p>
                <p className="mt-2 text-sm font-medium text-[rgb(var(--ink))]">
                  {request.status === 'agent_rejected'
                    ? "Un agent assigne a refuse cette demande."
                    : 'Cette demande a ete rejetee.'}
                </p>
                <button
                  type="button"
                  className="mt-3 btn-ghost text-[rgb(var(--clay))]"
                  onClick={() => setHistoryModal({
                    open: true,
                    item: request,
                    title: rejectionModalTitle(request, 'Motif de rejet - Propriete'),
                  })}
                >
                  {request.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[rgba(15,42,46,0.08)] bg-[rgba(15,42,46,0.02)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.45)]">Actions</p>
            {canDecide(request, 'property') && (
              <div className="mt-4 flex flex-col gap-2">
                <button onClick={() => handleDecision('property', request, 'approve')} className="btn-primary w-full justify-center">
                  <CheckCircle className="h-4 w-4" />
                  Approuver
                </button>
                <button onClick={() => handleDecision('property', request, 'reject')} className="btn-ghost w-full justify-center">
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <select
                value={assignments[request.uuid] || ''}
                onChange={(e) => setAssignments((prev) => ({ ...prev, [request.uuid]: e.target.value }))}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm"
              >
                <option value="">Selectionner un agent</option>
                {agents
                  .filter((agent) => !agent.agent_type || agent.agent_type === 'immobilier')
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name} {agent.agent_type ? `(${agent.agent_type})` : ''}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => handleAssign('property', request.uuid)}
                className="btn-primary w-full justify-center"
                disabled={request.status !== 'approved'}
              >
                <UserCheck className="h-4 w-4" />
                Assigner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const renderPropertyHistoryCard = (request) => (
    <div key={request.uuid} className="rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white px-5 py-4 shadow-[0_16px_36px_rgba(15,42,46,0.05)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[rgb(var(--ink))]">
              {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Proprietaire'}
            </p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(request.status)}`}>
              {statusLabel(request.status)}
          </span>
          </div>
          <p className="text-sm leading-6 text-[rgba(15,42,46,0.68)]">
            {request.description?.slice(0, 140) || 'Demande de propriete'}
          </p>
          <p className="text-xs text-[rgba(15,42,46,0.5)]">
            Decision: {decisionLabel(request.status)} | Agent: {request.agent ? `${request.agent.first_name} ${request.agent.last_name}` : 'Non assigne'}
          </p>
        </div>
        <div className="text-xs text-[rgba(15,42,46,0.48)]">
          {getItemDate(request) ? new Date(getItemDate(request)).toLocaleString('fr-FR') : 'N/A'}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Decision</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{decisionLabel(request.status)}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Agent</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">
            {request.agent ? `${request.agent.first_name} ${request.agent.last_name}` : 'Non assigne'}
          </p>
        </div>
        <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Date</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">
            {getItemDate(request) ? new Date(getItemDate(request)).toLocaleString('fr-FR') : 'N/A'}
          </p>
        </div>
      </div>
      {['rejected', 'agent_rejected'].includes(request.status) && request.rejection_reason && (
        <button
          type="button"
          className="mt-3 btn-ghost text-[rgb(var(--clay))]"
          onClick={() => setHistoryModal({
            open: true,
            item: request,
            title: rejectionModalTitle(request, 'Motif de rejet - Propriete'),
          })}
        >
          {request.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
        </button>
      )}
    </div>
  );
  const renderPropertyFeedCard = (entry) => (
    <div key={`${entry.type}-${entry.uuid}`} className="relative rounded-[24px] border border-[rgba(15,42,46,0.08)] bg-white px-5 py-4 shadow-[0_16px_36px_rgba(15,42,46,0.05)]">
      <div className="absolute left-0 top-6 h-10 w-1 rounded-r-full bg-[rgb(var(--clay))]" />
      <div className="pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">Propriete</span>
          <p className="text-sm font-semibold text-[rgb(var(--ink))]">{entry.title}</p>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(entry.status)}`}>
            {statusLabel(entry.status)}
          </span>
        </div>
        <p className="mt-2 text-sm text-[rgba(15,42,46,0.66)]">{entry.subtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Decision</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">{entry.decision}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Agent</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">
              {entry.agent ? `${entry.agent.first_name} ${entry.agent.last_name}` : 'Non assigne'}
            </p>
          </div>
          <div className="rounded-2xl bg-[rgba(15,42,46,0.04)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(15,42,46,0.42)]">Date</p>
            <p className="mt-2 text-sm font-semibold text-[rgb(var(--ink))]">
              {entry.date ? new Date(entry.date).toLocaleString('fr-FR') : 'N/A'}
            </p>
          </div>
        </div>
        {['rejected', 'agent_rejected'].includes(entry.status) && entry.rejection_reason && (
          <button
            type="button"
            className="mt-3 btn-ghost text-[rgb(var(--clay))]"
            onClick={() => setHistoryModal({
              open: true,
              item: entry,
              title: rejectionModalTitle(entry),
            })}
          >
            {entry.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">{roleLabel}</p>
              <h1 className="text-3xl font-semibold mt-3">
                {isPropertyView ? 'Demandes de propriete' : isConstructionView ? 'Demandes de construction' : 'Assignations'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isPropertyView
                  ? 'Consultez uniquement les demandes de propriete, leur historique et le journal recent associe.'
                  : isConstructionView
                    ? 'Consultez uniquement les demandes de construction et leur historique associe.'
                  : 'Distribuez les demandes de recherche, construction et propriete.'}
              </p>
            </div>

            <div className="surface-panel p-5 space-y-4">
              <div className={`grid grid-cols-1 ${isPropertyView || isConstructionView ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-3`}>
                {!isPropertyView && !isConstructionView && (
                  <select
                    value={activeType}
                    onChange={(e) => setActiveType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                  >
                    <option value="all">Tous types</option>
                    <option value="search">Recherche</option>
                    <option value="construction">Construction</option>
                    <option value="property">Propriete</option>
                  </select>
                )}
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuve</option>
                  <option value="rejected">Rejete</option>
                  <option value="assigned">Assigne</option>
                </select>
                <select
                  value={activeDecision}
                  onChange={(e) => setActiveDecision(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                >
                  <option value="all">Toutes decisions</option>
                  <option value="Accepte">Accepte</option>
                  <option value="Refuse">Refuse</option>
                  <option value="En cours">En cours</option>
                  <option value="En attente">En attente</option>
                </select>
                <select
                  value={activeAgent}
                  onChange={(e) => setActiveAgent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                >
                  <option value="all">Tous agents</option>
                  <option value="assigned">Assigne</option>
                  <option value="unassigned">Non assigne</option>
                </select>
              </div>
            </div>

            {(isPropertyView || isConstructionView) && (
              <div className="surface-panel p-5">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder={isPropertyView ? 'Rechercher une demande de propriete...' : 'Rechercher une demande de construction...'}
                    value={scopedSearchTerm}
                    onChange={(e) => setScopedSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>
            )}

            {!isPropertyView && !isConstructionView && (
              <div className="surface-panel p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Activite des agents</h2>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">
                      Suivi des assignations, decisions et dernieres actions par agent.
                    </p>
                  </div>
                  <span className="chip">{agentActivity.length} agent(s) actifs</span>
                </div>
                {loading ? (
                  <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                ) : agentActivity.length === 0 ? (
                  <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune activite agent.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {agentActivity.map((agent) => (
                      <div key={agent.id} className="surface-soft px-4 py-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{agent.name}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">
                              Type: {agent.agent_type || 'N/A'}
                            </p>
                          </div>
                          <span className="chip">Total: {agent.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="chip">Recherche: {agent.types.search || 0}</span>
                          <span className="chip">Construction: {agent.types.construction || 0}</span>
                          <span className="chip">Propriete: {agent.types.property || 0}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[rgba(15,42,46,0.6)]">
                          <div>Accepte: {agent.approved}</div>
                          <div>Refuse: {agent.rejected}</div>
                          <div>En cours: {agent.inProgress}</div>
                          <div>En attente: {agent.pending}</div>
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          Derniere activite: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {isConstructionView && (
                <>
                  <div className="xl:col-span-2 space-y-6">
                    <ClientRequestDomainSections
                      requestType="construction"
                      requests={scopedConstructionClientRequests}
                      history={scopedConstructionClientHistory}
                      agents={agents}
                      assignments={assignments}
                      setAssignments={setAssignments}
                      loading={loading}
                      onApprove={handleApproveDomainClientRequest}
                      onOpenReject={openDomainClientRejectModal}
                      onAssign={handleAssignDomainClientRequest}
                      onOpenHistoryReason={(item) => setHistoryModal({ open: true, item, title: rejectionModalTitle(item, 'Motif de rejet - Construction') })}
                      pendingTitle="Demandes de construction"
                      pendingDescription="Traitez d'abord les demandes de projet de construction envoyees depuis le site public, puis consultez leur historique."
                      historyTitle="Historique construction"
                      emptyPendingLabel="Aucune demande en attente."
                      emptyHistoryLabel="Aucun historique."
                    />
                  </div>
                </>
              )}

              {!isConstructionView && (
              <div className={`${isPropertyView ? 'xl:col-span-2' : ''} ${isPropertyView ? 'space-y-6' : 'surface-panel p-6 space-y-4'}`}>
                {isPropertyView ? (
                  <>
                    <ClientRequestDomainSections
                      requestType="immobilier"
                      requests={scopedPropertyClientRequests}
                      history={[]}
                      agents={agents}
                      assignments={assignments}
                      setAssignments={setAssignments}
                      loading={loading}
                      onApprove={handleApproveDomainClientRequest}
                      onOpenReject={openDomainClientRejectModal}
                      onAssign={handleAssignDomainClientRequest}
                      onOpenHistoryReason={(item) => setHistoryModal({ open: true, item, title: rejectionModalTitle(item) })}
                      pendingTitle="Demandes clients de propriete"
                      pendingDescription="Traitez d'abord les demandes immobilieres envoyees par les clients, puis consultez leur historique."
                      historyTitle=""
                      emptyPendingLabel="Aucune demande client en attente."
                      emptyHistoryLabel=""
                    />

                    <div className="surface-panel p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Demandes des proprietaires</h2>
                      </div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">
                        Retrouvez ici les demandes envoyees par les proprietaires pour la creation de leurs biens.
                      </p>
                      {loading ? (
                        <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                      ) : scopedPropertyRequests.length === 0 ? (
                        <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande proprietaire en attente.</p>
                      ) : (
                        <div className="space-y-5">
                          {scopedPropertyRequests.map((request) => renderPropertyRequestCard(request))}
                        </div>
                      )}
                    </div>

                    <div className="surface-panel p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Historique des demandes proprietaires</h2>
                      </div>
                      {loading ? (
                        <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                      ) : scopedPropertyHistory.length === 0 ? (
                        <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique proprietaire.</p>
                      ) : (
                        <div className="space-y-4">
                          {scopedPropertyHistory.map((request) => renderPropertyHistoryCard(request))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Demandes de propriete</h2>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : scopedPropertyRequests.length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande en attente.</p>
                    ) : (
                      <div className="space-y-5">
                        {scopedPropertyRequests.map((request) =>
                          renderAssignRow(
                            request,
                            'property',
                            request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Proprietaire',
                            request.description || 'Demande de propriete'
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              )}

              {!isConstructionView && !isPropertyView && (
              <div className={`${isPropertyView ? 'xl:col-span-2' : ''} surface-panel p-6 space-y-4`}>
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Historique proprietes</h2>
                </div>
                {loading ? (
                  <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                ) : scopedPropertyHistory.length === 0 ? (
                  <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique.</p>
                ) : (
                  <div className="space-y-4">
                    {scopedPropertyHistory.map((request) => renderPropertyHistoryCard(request))}
                  </div>
                )}
              </div>
              )}

              {!isPropertyView && !isConstructionView && (
                <>
                  <div className="surface-panel p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold">Journal recent</h2>
                        <p className="text-sm text-[rgba(15,42,46,0.6)]">
                          Dernieres decisions sur les demandes et projets.
                        </p>
                      </div>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : scopedActivityFeed.length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune activite recente.</p>
                    ) : (
                      <div className="space-y-3">
                        {scopedActivityFeed.map((entry) => (
                          <div key={`${entry.type}-${entry.uuid}`} className="surface-soft px-4 py-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="chip">{typeLabel(entry.type)}</span>
                              <p className="text-sm font-medium">{entry.title}</p>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(entry.status)}`}>
                                {entry.status}
                              </span>
                            </div>
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">{entry.subtitle}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">
                              Decision: {entry.decision} | Agent: {entry.agent ? `${entry.agent.first_name} ${entry.agent.last_name}` : 'Non assigne'} | {entry.date ? new Date(entry.date).toLocaleString('fr-FR') : 'N/A'}
                            </p>
                      {['rejected', 'agent_rejected'].includes(entry.status) && entry.rejection_reason && (
                        <button
                          type="button"
                          className="btn-ghost text-[rgb(var(--clay))]"
                          onClick={() => setHistoryModal({
                            open: true,
                            item: entry,
                            title: rejectionModalTitle(entry),
                          })}
                        >
                          {entry.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
                        </button>
                      )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="surface-panel p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Historique demandes</h2>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : searchHistory.length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique.</p>
                    ) : (
                      <div className="space-y-3">
                        {searchHistory.map((request) => (
                          <div key={request.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">
                                {request.property_type?.name || 'Recherche personnalisee'}
                              </p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">
                                {request.transaction_type || ''} | {request.city || request.location_preferences?.join(', ') || 'Localisation'} | {formatRequester(request.user)}
                              </p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">
                                Decision: {decisionLabel(request.status)} | Agent: {request.agent ? `${request.agent.first_name} ${request.agent.last_name}` : 'Non assigne'} | Statut: {request.status || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                    )}
                  </div>

                  <div className="surface-panel p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Historique construction</h2>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : constructionHistory.length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique.</p>
                    ) : (
                      <div className="space-y-3">
                        {constructionHistory.map((project) => (
                          <div key={project.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">
                                {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'} | {formatRequester(project.user)}
                              </p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">
                                Decision: {decisionLabel(project.status)} | Agent: {project.agent ? `${project.agent.first_name} ${project.agent.last_name}` : 'Non assigne'} | Statut: {project.status || 'N/A'}
                              </p>
                              {['rejected', 'agent_rejected'].includes(project.status) && project.rejection_reason && (
                                <button
                                  type="button"
                                  className="mt-2 btn-ghost text-[rgb(var(--clay))]"
                                  onClick={() => setHistoryModal({
                                    open: true,
                                    item: project,
                                    title: rejectionModalTitle(project, 'Motif de rejet - Construction'),
                                  })}
                                >
                                  {project.status === 'agent_rejected' ? 'Voir le motif du refus agent' : 'Voir le motif'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="surface-panel p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Demandes de recherche</h2>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : filteredItems(searchRequests, 'search').length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande en attente.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredItems(searchRequests, 'search').map((request) =>
                          renderAssignRow(
                            request,
                            'search',
                            request.property_type?.name || 'Recherche personnalisee',
                            `${request.transaction_type || ''} | ${request.city || request.location_preferences?.join(', ') || 'Localisation a definir'} | ${formatRequester(request.user)}`
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="surface-panel p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <HardHat className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">Projets construction</h2>
                    </div>
                    {loading ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
                    ) : filteredItems(constructionRequests, 'construction').length === 0 ? (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredItems(constructionRequests, 'construction').map((project) =>
                          renderAssignRow(
                            project,
                            'construction',
                            project.title || 'Projet construction',
                            `${project.city || project.location || 'Localisation'} | Budget ${project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'} | ${formatRequester(project.user)}`
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      {rejectModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Motif du rejet</h3>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              {rejectModal.type === 'construction'
                ? 'Motif obligatoire pour rejeter un projet de construction.'
                : 'Vous pouvez ajouter un motif (optionnel) pour cette demande.'}
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              rows="4"
              className="mt-4 w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              placeholder="Motif du rejet..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setRejectModal({ open: false, type: null, item: null, reason: '' })}
              >
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={confirmReject}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
      {historyModal.open && historyModal.item && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">{historyModal.title}</h3>
            <div className="mt-4 surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.7)]">
              {historyModal.item.rejection_reason}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setHistoryModal({ open: false, item: null, title: '' })}
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

export default ManagerAssignments;
