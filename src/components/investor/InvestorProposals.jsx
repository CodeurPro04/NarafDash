import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { investorService } from '../../services/api';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

const InvestorProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await investorService.getMyProposals();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProposals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement propositions:', err);
      setError(err.response?.data?.message || 'Impossible de charger vos propositions.');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'approved':
        return { label: 'Approuvee', icon: CheckCircle };
      case 'rejected':
        return { label: 'Refusee', icon: XCircle };
      default:
        return { label: 'En attente', icon: Clock };
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Espace investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Mes propositions</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Suivez l'etat de vos propositions d'investissement.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : proposals.length === 0 ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucune proposition pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => {
                  const status = statusLabel(proposal.status);
                  return (
                    <div key={proposal.uuid || proposal.id} className="surface-panel p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                          <FileText className="h-5 w-5 text-[rgb(var(--ink))]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {proposal.investment_project?.title || 'Projet investissement'}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            Montant: {formatFcfa(proposal.amount)}
                          </p>
                        </div>
                      </div>
                      <span className="chip flex items-center gap-2">
                        <status.icon className="h-4 w-4" />
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InvestorProposals;
