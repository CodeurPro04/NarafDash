import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  Banknote,
  Building,
  HardHat,
  TrendingUp,
  UserCheck,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';

const PAGE_SIZE = 6;

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'immobilier', label: 'Propriete' },
  { value: 'construction', label: 'Construction' },
  { value: 'investissement', label: 'Investissement' },
  { value: 'recherche', label: 'Recherche' },
];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toute periode' },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'year', label: 'Cette annee' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus recent' },
  { value: 'amount', label: 'Montant le plus eleve' },
];

const parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/,/g, '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) => `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;

const formatCompactAmount = (value) => {
  const amount = value || 0;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Md FCFA`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M FCFA`;
  if (abs >= 1_000) return `${(amount / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k FCFA`;
  return formatAmount(amount);
};

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

const dealDate = (deal) => new Date(deal.deal_concluded_at || deal.updated_at || deal.created_at || 0);

const dealTargetTitle = (deal) =>
  deal.property?.title
  || deal.construction_project?.title
  || deal.investment_project?.title
  || deal.property_type?.name
  || deal.propertyType?.name
  || (deal.request_type === 'recherche' ? 'Recherche de bien' : 'Projet ou bien non renseigne');

const dealAgentName = (deal) =>
  deal.agent ? `${deal.agent.first_name || ''} ${deal.agent.last_name || ''}`.trim() || deal.agent.name || 'Agent' : 'Non renseigne';

const AdminReports = () => {
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, typeFilter, periodFilter]);

  useEffect(() => {
    const loadDeals = async () => {
      try {
        setLoading(true);
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
          .sort((a, b) => dealDate(b) - dealDate(a));

        setDeals(concludedDeals);
      } catch (err) {
        console.error('Erreur lors du chargement des gains admin:', err);
        toast.error('Impossible de charger les gains.');
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

  const filteredDeals = useMemo(() => {
    const now = new Date();
    let list = deals;

    if (typeFilter !== 'all') {
      list = list.filter((deal) => (deal.request_type || 'immobilier') === typeFilter);
    }

    if (periodFilter !== 'all') {
      list = list.filter((deal) => {
        const date = dealDate(deal);
        if (Number.isNaN(date.getTime())) return false;
        if (periodFilter === '7d') return now - date <= 7 * 24 * 60 * 60 * 1000;
        if (periodFilter === '30d') return now - date <= 30 * 24 * 60 * 60 * 1000;
        if (periodFilter === 'year') return date.getFullYear() === now.getFullYear();
        return true;
      });
    }

    if (searchTerm) {
      list = list.filter((deal) => {
        const haystack = [deal.name, dealAgentName(deal), dealTargetTitle(deal)]
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm);
      });
    }

    return [...list].sort((a, b) => (sortBy === 'amount' ? b.gainAmount - a.gainAmount : dealDate(b) - dealDate(a)));
  }, [deals, typeFilter, periodFilter, searchTerm, sortBy]);

  const filteredTotal = useMemo(() => filteredDeals.reduce((sum, deal) => sum + deal.gainAmount, 0), [filteredDeals]);
  const lastPage = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
  const pagedDeals = filteredDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(searchInput) || typeFilter !== 'all' || periodFilter !== 'all';

  const resetFilters = () => {
    setSearchInput('');
    setTypeFilter('all');
    setPeriodFilter('all');
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">Rapports &amp; gains</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Vue globale des gains generes a partir des offres conclues et des prix finaux renseignes par les agents.
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="surface-card p-4 sm:p-5 h-[92px] animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  {[
                    { key: 'total', label: 'Gains totaux', value: summary.totalAmount, count: summary.totalDeals, icon: Banknote, highlight: true },
                    { key: 'property', label: 'Propriete', value: summary.propertyAmount, count: summary.propertyDeals, icon: Building },
                    { key: 'construction', label: 'Construction', value: summary.constructionAmount, count: summary.constructionDeals, icon: HardHat },
                    { key: 'investment', label: 'Investissement', value: summary.investmentAmount, count: summary.investmentDeals, icon: TrendingUp },
                    { key: 'search', label: 'Recherche', value: summary.searchAmount, count: summary.searchDeals, icon: UserCheck },
                  ].map((kpi) => (
                    <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                          <p className="text-lg sm:text-xl font-semibold mt-1.5 text-[rgb(var(--ink))] truncate" title={formatAmount(kpi.value)}>
                            {formatCompactAmount(kpi.value)}
                          </p>
                          <p className="text-[11px] text-[rgba(15,42,46,0.5)] mt-1">{kpi.count} offre{kpi.count !== 1 ? 's' : ''}</p>
                        </div>
                        <div
                          className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                            kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                          }`}
                        >
                          <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filtres */}
                <div className="surface-panel p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                      <input
                        type="text"
                        placeholder="Rechercher un client, un agent, un bien..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm text-[rgb(var(--ink))] focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm text-[rgb(var(--ink))] focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm text-[rgb(var(--ink))] focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {hasActiveFilters && (
                      <button type="button" onClick={resetFilters} className="btn-ghost text-xs shrink-0 justify-center">
                        <X className="h-3.5 w-3.5" />
                        Reinitialiser
                      </button>
                    )}
                  </div>
                </div>

                <div className="surface-panel p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Offres conclues</h2>
                      <p className="text-sm text-[rgba(15,42,46,0.55)]">
                        {filteredDeals.length} offre{filteredDeals.length !== 1 ? 's' : ''} correspondant aux filtres actifs.
                      </p>
                    </div>
                    <div className="surface-soft px-4 py-3 text-right shrink-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Total filtre</p>
                      <p className="mt-1 text-xl font-semibold text-[rgb(var(--ink))]">{formatAmount(filteredTotal)}</p>
                    </div>
                  </div>

                  {deals.length === 0 ? (
                    <div className="px-4 py-14 text-center text-sm text-[rgba(15,42,46,0.55)]">
                      <ClipboardList className="h-8 w-8 mx-auto mb-3 text-[rgba(15,42,46,0.3)]" />
                      Aucun gain disponible pour le moment. Les gains apparaitront ici une fois qu'une offre sera conclue avec un prix final.
                    </div>
                  ) : filteredDeals.length === 0 ? (
                    <div className="px-4 py-14 text-center text-sm text-[rgba(15,42,46,0.55)]">
                      <Search className="h-8 w-8 mx-auto mb-3 text-[rgba(15,42,46,0.3)]" />
                      Aucune offre ne correspond a ces criteres.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {pagedDeals.map((deal) => {
                          const Icon = typeIcon(deal.request_type);
                          return (
                            <div key={deal.uuid || deal.id} className="surface-soft px-5 py-4 rounded-[22px]">
                              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                                <div className="space-y-3 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(15,42,46,0.08)] shrink-0">
                                      <Icon className="h-5 w-5 text-[rgb(var(--ink))]" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">
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
                                      <p className="font-medium text-[rgb(var(--ink))]">{dealAgentName(deal)}</p>
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
                                      <p className="font-medium text-[rgb(var(--ink))]">{dealTargetTitle(deal)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-[rgba(15,42,46,0.42)]">Note de conclusion</p>
                                      <p className="font-medium text-[rgb(var(--ink))]">
                                        {deal.deal_closure_note || deal.finalReport?.closure_note || 'Non renseignee'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="xl:min-w-[220px] xl:shrink-0">
                                  <div className="rounded-[22px] bg-white px-4 py-4 border border-[rgba(15,42,46,0.08)]">
                                    <p className="text-xs uppercase tracking-[0.16em] text-[rgba(15,42,46,0.42)]">Gain realise</p>
                                    <p className="mt-3 text-2xl font-semibold text-[rgb(var(--ink))]">
                                      {deal.gainAmount > 0 ? formatAmount(deal.gainAmount) : deal.gainLabel}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs text-[rgba(15,42,46,0.55)]">
                                      <UserCheck className="h-4 w-4 shrink-0" />
                                      Prix final renseigne par l'agent
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {lastPage > 1 && (
                        <div className="flex items-center justify-between gap-3 pt-2">
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {page} sur {lastPage}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page <= 1}
                              className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                              disabled={page >= lastPage}
                              className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminReports;
