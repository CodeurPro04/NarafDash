import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, FileText, CheckCircle, XCircle, Mail, Phone } from 'lucide-react';

const ClientRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('tous');
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, reason: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, item: null });

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';

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
  const relatedLabel = (item) => (
    item.property?.title
    || item.construction_project?.title
    || item.constructionProject?.title
    || item.investment_project?.title
    || item.investmentProject?.title
    || null
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, pendingRes, historyRes] = await Promise.all([
        service.getAvailableAgents(),
        service.getPendingClientRequests(),
        service.getClientRequestHistory(),
      ]);
      const agentsList = extractPayload(agentsRes);
      const pendingPayload = extractPayload(pendingRes);
      const historyPayload = extractPayload(historyRes);

      setAgents(Array.isArray(agentsList) ? agentsList : []);
      setRequests(Array.isArray(pendingPayload.data || pendingPayload) ? (pendingPayload.data || pendingPayload) : []);
      setHistory(Array.isArray(historyPayload.data || historyPayload) ? (historyPayload.data || historyPayload) : []);
    } catch (error) {
      console.error('Erreur chargement demandes clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (uuid, decision) => {
    try {
      if (decision === 'approve') {
        await service.approveClientRequest(uuid);
      } else {
        const target = requests.find((item) => item.uuid === uuid);
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
      await service.rejectClientRequest(rejectModal.item.uuid, { rejection_reason: rejectModal.reason.trim() });
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
      await service.assignClientRequest(uuid, { agent_id: agentId });
      await loadData();
    } catch (error) {
      console.error('Erreur assignation client:', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'assignation');
    }
  };

  const matchesFilter = (item) => (
    activeFilter === 'tous' || (item.request_type || 'immobilier') === activeFilter
  );
  const filteredRequests = requests.filter(matchesFilter);
  const filteredHistory = history.filter(matchesFilter);

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
                Traitez les demandes clients, acceptez/refusez puis assignez.
              </p>
            </div>

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Demandes en attente</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'tous', label: 'Tous' },
                  { key: 'immobilier', label: 'Immobilier' },
                  { key: 'construction', label: 'Construction' },
                  { key: 'investissement', label: 'Investissement' },
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
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredRequests.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande.</p>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((item) => (
                    <div key={item.uuid} className="surface-soft px-4 py-4 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeBadgeClass(item.request_type)}`}>
                              {typeLabel(item.request_type)}
                            </span>
                          </div>
                          {relatedLabel(item) && (
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">
                              Cible: {relatedLabel(item)}
                            </p>
                          )}
                          <p className="text-xs text-[rgba(15,42,46,0.55)] break-words">
                            {item.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[rgba(15,42,46,0.5)]">
                            {item.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {item.email}
                              </span>
                            )}
                            {item.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {item.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="chip shrink-0">Statut: {item.status || 'pending'}</span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3 items-start">
                        {item.status === 'pending' && (
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
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:grid-cols-1 gap-2">
                          {item.request_type && (
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">
                              Agents requis: {requiredAgentType(item.request_type)}
                            </p>
                          )}
                          <select
                            value={assignments[item.uuid] || ''}
                            onChange={(e) => setAssignments((prev) => ({ ...prev, [item.uuid]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
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
                            className={`btn-primary ${item.status === 'approved' ? '' : 'opacity-60 cursor-not-allowed'}`}
                            disabled={item.status !== 'approved'}
                          >
                            <UserCheck className="h-4 w-4" />
                            Assigner
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Historique</h2>
              </div>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun historique.</p>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => (
                    <div key={item.uuid} className="surface-soft px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.name}</p>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${typeBadgeClass(item.request_type)}`}>
                          {typeLabel(item.request_type)}
                        </span>
                      </div>
                      {relatedLabel(item) && (
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">
                          Cible: {relatedLabel(item)}
                        </p>
                      )}
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">{item.message}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                        Statut: {item.status || 'N/A'} | Agent: {item.agent ? `${item.agent.first_name} ${item.agent.last_name}` : 'Non assigne'}
                      </p>
                      {item.status === 'rejected' && item.rejection_reason && (
                        <button
                          type="button"
                          className="mt-2 btn-ghost text-[rgb(var(--clay))]"
                          onClick={() => setHistoryModal({ open: true, item })}
                        >
                          Voir le motif
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
