import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { Banknote, Building, HardHat, TrendingUp, UserCheck } from 'lucide-react';

const parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/,/g, '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) => `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;

const requestTypeLabel = (type) => {
  if (type === 'construction') return 'Construction';
  if (type === 'investissement') return 'Investissement';
  if (type === 'recherche') return 'Recherche';
  return 'Propriete';
};

const typeIcon = (type) => {
  if (type === 'construction') return HardHat;
  if (type === 'investissement') return TrendingUp;
  if (type === 'recherche') return UserCheck;
  return Building;
};

const StatCard = ({ icon: Icon, label, value, note }) => (
  <div className="surface-panel p-5 space-y-3">
    <div className="flex items-center gap-2 text-sm text-[rgba(15,42,46,0.6)]">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <p className="text-2xl font-semibold text-[rgb(var(--ink))]">{value}</p>
    {note && <p className="text-xs text-[rgba(15,42,46,0.5)]">{note}</p>}
  </div>
);

const AdminReports = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
        setError('');
        const [clientResponse, searchResponse] = await Promise.all([
          adminService.getClientRequestHistory(),
          adminService.getSearchRequestHistory(),
        ]);

        const clientPayload = clientResponse?.data?.data ?? clientResponse?.data ?? [];
        const clientItems = clientPayload?.data || clientPayload;
        const clientList = Array.isArray(clientItems) ? clientItems : [];

        const searchPayload = searchResponse?.data?.data ?? searchResponse?.data ?? [];
        const searchItems = searchPayload?.data || searchPayload;
        const searchList = Array.isArray(searchItems) ? searchItems : [];

        const concludedDeals = [...clientList, ...searchList]
          .filter((item) => item?.status === 'deal_concluded' || item?.deal_status === 'deal_concluded')
          .map((item) => {
            const finalReport = Array.isArray(item.reports)
              ? item.reports.find((report) => report?.report_type === 'final_report')
              : null;
            const salePrice = finalReport?.sale_price || item?.deal_sale_price || '';
            const requestType = item?.request_type || (item?.property_type || item?.propertyType ? 'recherche' : 'immobilier');
            return {
              ...item,
              request_type: requestType,
              name: item?.name || (item?.user ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() : 'Client'),
              gainAmount: parseAmount(salePrice),
              gainLabel: salePrice || 'Non renseigne',
              finalReport,
            };
          })
          .sort((a, b) => new Date(b.deal_concluded_at || b.updated_at || b.created_at || 0) - new Date(a.deal_concluded_at || a.updated_at || a.created_at || 0));

        setDeals(concludedDeals);
      } catch (err) {
        console.error('Erreur lors du chargement des gains admin:', err);
        setError('Impossible de charger les gains.');
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  const summary = useMemo(() => {
    const propertyDeals = deals.filter((deal) => (deal.request_type || 'immobilier') === 'immobilier');
    const constructionDeals = deals.filter((deal) => deal.request_type === 'construction');
    const investmentDeals = deals.filter((deal) => deal.request_type === 'investissement');
    const searchDeals = deals.filter((deal) => deal.request_type === 'recherche');

    return {
      totalAmount: deals.reduce((sum, deal) => sum + deal.gainAmount, 0),
      totalDeals: deals.length,
      propertyAmount: propertyDeals.reduce((sum, deal) => sum + deal.gainAmount, 0),
      constructionAmount: constructionDeals.reduce((sum, deal) => sum + deal.gainAmount, 0),
      investmentAmount: investmentDeals.reduce((sum, deal) => sum + deal.gainAmount, 0),
      searchAmount: searchDeals.reduce((sum, deal) => sum + deal.gainAmount, 0),
      propertyDeals: propertyDeals.length,
      constructionDeals: constructionDeals.length,
      investmentDeals: investmentDeals.length,
      searchDeals: searchDeals.length,
    };
  }, [deals]);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-3xl font-semibold mt-3">Gains</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Vue globale des gains generes a partir des offres conclues et des prix finaux renseignes par les agents.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <StatCard
                    icon={Banknote}
                    label="Gains totaux"
                    value={formatAmount(summary.totalAmount)}
                    note={`${summary.totalDeals} offre(s) conclue(s)`}
                  />
                  <StatCard
                    icon={Building}
                    label="Gains propriete"
                    value={formatAmount(summary.propertyAmount)}
                    note={`${summary.propertyDeals} offre(s) conclue(s)`}
                  />
                  <StatCard
                    icon={HardHat}
                    label="Gains construction"
                    value={formatAmount(summary.constructionAmount)}
                    note={`${summary.constructionDeals} offre(s) conclue(s)`}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Gains investissement"
                    value={formatAmount(summary.investmentAmount)}
                    note={`${summary.investmentDeals} offre(s) conclue(s)`}
                  />
                  <StatCard
                    icon={UserCheck}
                    label="Gains recherche"
                    value={formatAmount(summary.searchAmount)}
                    note={`${summary.searchDeals} offre(s) conclue(s)`}
                  />
                </div>

                <div className="surface-panel p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Offres conclues</h2>
                      <p className="text-sm text-[rgba(15,42,46,0.55)]">
                        Chaque ligne correspond a un gain issu d une offre finalisee.
                      </p>
                    </div>
                    <div className="surface-soft px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Total cumule</p>
                      <p className="mt-2 text-xl font-semibold text-[rgb(var(--ink))]">{formatAmount(summary.totalAmount)}</p>
                    </div>
                  </div>

                  {deals.length === 0 ? (
                    <div className="surface-soft px-4 py-6 text-sm text-[rgba(15,42,46,0.55)]">
                      Aucun gain disponible pour le moment. Les gains apparaitront ici une fois qu une offre sera conclue avec un prix final.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deals.map((deal) => {
                        const Icon = typeIcon(deal.request_type);
                        return (
                          <div key={deal.uuid || deal.id} className="surface-soft px-5 py-4 rounded-[22px]">
                            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                              <div className="space-y-3 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(15,42,46,0.08)]">
                                    <Icon className="h-5 w-5 text-[rgb(var(--ink))]" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-[rgb(var(--ink))]">
                                      {deal.name || 'Client'}
                                    </p>
                                    <p className="text-xs text-[rgba(15,42,46,0.55)]">
                                      {requestTypeLabel(deal.request_type)}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-[rgba(15,42,46,0.42)]">Agent</p>
                                    <p className="font-medium text-[rgb(var(--ink))]">
                                      {deal.agent ? `${deal.agent.first_name || ''} ${deal.agent.last_name || ''}`.trim() || deal.agent.name || 'Agent' : 'Non renseigne'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[rgba(15,42,46,0.42)]">Date de conclusion</p>
                                    <p className="font-medium text-[rgb(var(--ink))]">
                                      {deal.deal_concluded_at ? new Date(deal.deal_concluded_at).toLocaleString('fr-FR') : 'Non renseignee'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[rgba(15,42,46,0.42)]">Statut</p>
                                    <p className="font-medium text-[rgb(var(--ink))]">Offre conclue</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-[rgba(15,42,46,0.42)]">Cible</p>
                                    <p className="font-medium text-[rgb(var(--ink))]">
                                      {deal.property?.title || deal.construction_project?.title || deal.investment_project?.title || deal.property_type?.name || deal.propertyType?.name || (deal.request_type === 'recherche' ? 'Recherche de bien' : 'Projet ou bien non renseigne')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[rgba(15,42,46,0.42)]">Note de conclusion</p>
                                    <p className="font-medium text-[rgb(var(--ink))]">
                                      {deal.deal_closure_note || deal.finalReport?.closure_note || 'Non renseignee'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="xl:min-w-[220px]">
                                <div className="rounded-[22px] bg-white px-4 py-4 border border-[rgba(15,42,46,0.08)]">
                                  <p className="text-xs uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Gain realise</p>
                                  <p className="mt-3 text-2xl font-semibold text-[rgb(var(--ink))]">
                                    {deal.gainAmount > 0 ? formatAmount(deal.gainAmount) : deal.gainLabel}
                                  </p>
                                  <div className="mt-4 flex items-center gap-2 text-xs text-[rgba(15,42,46,0.55)]">
                                    <UserCheck className="h-4 w-4" />
                                    Prix final renseigne par l agent
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminReports;
