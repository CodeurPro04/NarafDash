import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { investorService } from '../../services/api';
import { TrendingUp, FileText, BarChart3, DollarSign, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardInvestor = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalInvested: 0,
    activeProposals: 0,
    completedInvestments: 0,
    portfolioValue: 0
  });
  const [recentProposals, setRecentProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const proposalsRes = await investorService.getMyProposals();
      const proposalsPayload = extractPayload(proposalsRes);
      const proposals = proposalsPayload.data || proposalsPayload;
      const proposalList = Array.isArray(proposals) ? proposals : [];

      const approved = proposalList.filter((p) => p.status === 'approved');
      const pending = proposalList.filter((p) => p.status === 'pending');
      const totalApproved = approved.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setStats({
        totalInvested: totalApproved,
        activeProposals: pending.length,
        completedInvestments: approved.length,
        portfolioValue: totalApproved,
      });

      setRecentProposals(proposalList.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard investisseur:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total investi', value: stats.totalInvested, icon: DollarSign },
    { title: 'Propositions actives', value: stats.activeProposals, icon: FileText },
    { title: 'Investissements approuvés', value: stats.completedInvestments, icon: TrendingUp },
    { title: 'Valeur portefeuille', value: stats.portfolioValue, icon: BarChart3 },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Espace investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Suivi de vos investissements</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Analysez vos propositions et la performance de votre portefeuille.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.title}</p>
                      <p className="text-3xl font-semibold mt-2">
                        {loading ? '...' : `${Number(stat.value || 0).toLocaleString()} FCFA`}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-[rgb(var(--ink))]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="surface-panel p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Propositions récentes</h2>
                <button onClick={() => navigate('/investor/proposals')} className="btn-ghost">
                  Voir tout
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {!loading && recentProposals.length === 0 && (
                  <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune proposition enregistrée.</p>
                )}
                {recentProposals.map((proposal) => (
                  <div key={proposal.id || proposal.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{proposal.investment_project?.title || proposal.property_title || 'Projet d’investissement'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {proposal.amount ? `${Number(proposal.amount).toLocaleString()} FCFA` : 'Montant à confirmer'}
                      </p>
                    </div>
                    <span className="chip capitalize">{proposal.status || 'pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardInvestor;
