import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { managerService } from '../../services/api';
import { Building, FileText, HardHat, Users } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';

const ManagerReports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await managerService.getReports();
      const payload = response?.data?.data ?? response?.data ?? null;
      setReport(payload);
    } catch (err) {
      console.error('Erreur lors du chargement des rapports:', err);
      setError('Impossible de charger les rapports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const typeLabel = (type) => {
  switch (type) {
    case 'property':
      return 'Propriete';
    case 'search':
      return 'Demande de recherche';
    case 'construction':
      return 'Projet construction';
    default:
      return 'Assignation';
  }
};

const StatCard = ({ icon: Icon, label, value }) => (
    <div className="surface-panel p-5 space-y-2">
      <div className="flex items-center gap-2 text-sm text-[rgba(15,42,46,0.6)]">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-[rgb(var(--ink))]">{value ?? '0'}</p>
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
              <p className="chip">Gestionnaire</p>
              <h1 className="text-3xl font-semibold mt-3">Rapports</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Suivi global des annonces, demandes et assignations.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Building} label="Proprietes totales" value={report?.properties_total} />
                  <StatCard icon={Building} label="Proprietes en attente" value={report?.properties_pending} />
                  <StatCard icon={FileText} label="Demandes en attente" value={report?.search_pending} />
                  <StatCard icon={HardHat} label="Construction en attente" value={report?.construction_pending} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={Building} label="Proprietes assignees" value={report?.properties_assigned} />
                  <StatCard icon={FileText} label="Demandes assignees" value={report?.search_assigned} />
                  <StatCard icon={HardHat} label="Construction assignee" value={report?.construction_assigned} />
                  <StatCard icon={Users} label="Agents actifs" value={report?.agents_active} />
                </div>

                {Array.isArray(report?.recent_assignments) && report.recent_assignments.length > 0 && (
                  <div className="surface-panel p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Dernieres assignations</h2>
                    <div className="space-y-3">
                      {report.recent_assignments.map((item, index) => (
                        <div key={`${item.type}-${index}`} className="surface-soft px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {item.type === 'property' && item.image ? (
                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-[rgba(15,42,46,0.08)]">
                                <SecureImage
                                  src={resolveMediaUrl(item.image)}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : null}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{item.title}</p>
                                <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border border-[rgba(15,42,46,0.2)] text-[rgba(15,42,46,0.6)]">
                                  {typeLabel(item.type)}
                                </span>
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.5)]">{item.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs text-[rgba(15,42,46,0.6)]">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagerReports;
