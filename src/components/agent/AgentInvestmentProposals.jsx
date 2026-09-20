import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { useToast } from '../common/Toast';
import { formatFcfa } from '../../utils/currency';
import {
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Building2,
  Loader2,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Approuvees' },
  { key: 'rejected', label: 'Rejetees' },
  { key: 'all', label: 'Toutes' },
];

const STATUS_BADGE = {
  pending: { label: 'En attente', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  approved: { label: 'Approuvee', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejetee', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AgentInvestmentProposals = () => {
  const toast = useToast();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [processingUuid, setProcessingUuid] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const extractList = (response) => {
    const payload = response?.data?.data ?? response?.data ?? [];
    return Array.isArray(payload) ? payload : payload?.data ?? [];
  };

  const loadProposals = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await agentService.getInvestmentProposals(params);
      setProposals(extractList(response));
    } catch (error) {
      if (!silent) toast.error('Impossible de charger les propositions.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const stats = useMemo(() => {
    const pending = proposals.filter((p) => p.status === 'pending').length;
    const approved = proposals.filter((p) => p.status === 'approved').length;
    const totalAmount = proposals
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { pending, approved, totalAmount };
  }, [proposals]);

  const handleApprove = async (proposal) => {
    setProcessingUuid(proposal.uuid);
    try {
      await agentService.approveInvestmentProposal(proposal.uuid);
      toast.success('Proposition approuvee avec succes.');
      await loadProposals({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur lors de l'approbation.");
    } finally {
      setProcessingUuid(null);
    }
  };

  const openReject = (proposal) => {
    setRejectTarget(proposal);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.warning('Motif obligatoire.');
      return;
    }
    setRejecting(true);
    try {
      await agentService.rejectInvestmentProposal(rejectTarget.uuid, {
        rejection_reason: rejectReason.trim(),
      });
      toast.success('Proposition rejetee avec succes.');
      setRejectTarget(null);
      await loadProposals({ silent: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du rejet.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <p className="chip">Agent investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Propositions d'investissement</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Validez ou refusez les propositions envoyees par les investisseurs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">En attente</p>
                    <p className="text-3xl font-semibold mt-2">{stats.pending}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <Clock className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Approuvees</p>
                    <p className="text-3xl font-semibold mt-2">{stats.approved}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)]">Montant approuve</p>
                    <p className="text-2xl font-semibold mt-2">{formatFcfa(stats.totalAmount)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-[rgb(var(--ink))]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel p-6">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      statusFilter === tab.key
                        ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                        : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgba(15,42,46,0.4)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                  ))}
                </div>
              ) : proposals.length === 0 ? (
                <div className="py-16 text-center text-sm text-[rgba(15,42,46,0.5)]">
                  <TrendingUp size={40} className="mx-auto mb-3 text-[rgba(15,42,46,0.2)]" />
                  Aucune proposition pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((proposal) => {
                    const investorName = proposal.user?.full_name || 'Investisseur';
                    const project = proposal.investment_project || proposal.investmentProject;
                    const isProcessing = processingUuid === proposal.uuid;
                    return (
                      <div
                        key={proposal.uuid}
                        className="border border-[rgba(15,42,46,0.08)] rounded-xl p-4 sm:p-5 bg-white/60"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--ink))]">
                                <User size={14} className="text-[rgba(15,42,46,0.5)]" />
                                {investorName}
                              </span>
                              {proposal.user?.email && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-[rgba(15,42,46,0.5)]">
                                  <Mail size={12} /> {proposal.user.email}
                                </span>
                              )}
                              <StatusBadge status={proposal.status} />
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-[rgba(15,42,46,0.7)]">
                              <Building2 size={14} className="text-[rgba(15,42,46,0.5)]" />
                              {project?.title || 'Projet d\'investissement'}
                            </div>
                            {proposal.message && (
                              <p className="text-sm text-[rgba(15,42,46,0.6)] italic">"{proposal.message}"</p>
                            )}
                            {proposal.status === 'rejected' && proposal.rejection_reason && (
                              <p className="text-xs text-[rgb(var(--clay))]">
                                Motif du rejet : {proposal.rejection_reason}
                              </p>
                            )}
                            <p className="text-xs text-[rgba(15,42,46,0.4)]">
                              Proposee le {formatDate(proposal.created_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-xl font-semibold text-[rgb(var(--ink))]">
                                {formatFcfa(proposal.amount)}
                              </p>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">Montant propose</p>
                            </div>
                            {proposal.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openReject(proposal)}
                                  disabled={isProcessing}
                                  className="btn-ghost text-xs disabled:opacity-50"
                                >
                                  Refuser
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(proposal)}
                                  disabled={isProcessing}
                                  className="btn-primary text-xs disabled:opacity-50"
                                >
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Approuver'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Refuser la proposition</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-1">
                De {rejectTarget.user?.full_name || 'cet investisseur'} — {formatFcfa(rejectTarget.amount)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Motif du refus</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Expliquez pourquoi cette proposition est refusee..."
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRejectTarget(null)} className="btn-ghost" disabled={rejecting}>
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={rejecting || !rejectReason.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {rejecting ? 'Envoi...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInvestmentProposals;
