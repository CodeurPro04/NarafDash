import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { investorService } from '../../services/api';
import { BarChart3 } from 'lucide-react';
import { formatFcfa } from '../../utils/currency';

const InvestorPortfolio = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await investorService.getMyProposals();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProposals(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement portefeuille:', err);
      setError(err.response?.data?.message || 'Impossible de charger le portefeuille.');
    } finally {
      setLoading(false);
    }
  };

  const approved = useMemo(
    () => proposals.filter((proposal) => proposal.status === 'approved'),
    [proposals]
  );

  const total = approved.reduce((sum, proposal) => sum + (Number(proposal.amount) || 0), 0);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Espace investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Portefeuille</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Vos investissements approuves et leur total.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <div className="surface-panel p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-[rgba(15,42,46,0.6)]">Total investi</p>
                <p className="text-3xl font-semibold mt-2">
                  {loading ? '...' : formatFcfa(total)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-[rgb(var(--ink))]" />
              </div>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : approved.length === 0 ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucun investissement approuve pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {approved.map((proposal) => (
                  <div key={proposal.uuid || proposal.id} className="surface-panel p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {proposal.investment_project?.title || 'Projet investissement'}
                      </p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        Montant: {formatFcfa(proposal.amount)}
                      </p>
                    </div>
                    <span className="chip">Approuve</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default InvestorPortfolio;
