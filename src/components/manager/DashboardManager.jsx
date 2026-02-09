import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { managerService } from '../../services/api';
import { Building, UserCheck, FileText, HardHat, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardManager = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingProperties: 0,
    pendingSearchRequests: 0,
    pendingConstruction: 0,
    availableAgents: 0,
  });
  const [pendingProperties, setPendingProperties] = useState([]);
  const [pendingSearchRequests, setPendingSearchRequests] = useState([]);
  const [pendingConstruction, setPendingConstruction] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, searchRes, constructionRes, agentsRes] = await Promise.all([
        managerService.getPendingProperties(),
        managerService.getPendingSearchRequests(),
        managerService.getPendingConstructionProjects(),
        managerService.getAvailableAgents(),
      ]);

      const properties = extractPayload(propertiesRes).data || extractPayload(propertiesRes);
      const searches = extractPayload(searchRes).data || extractPayload(searchRes);
      const construction = extractPayload(constructionRes).data || extractPayload(constructionRes);
      const agents = extractPayload(agentsRes);

      setPendingProperties(Array.isArray(properties) ? properties : []);
      setPendingSearchRequests(Array.isArray(searches) ? searches : []);
      setPendingConstruction(Array.isArray(construction) ? construction : []);
      setStats({
        pendingProperties: Array.isArray(properties) ? properties.length : 0,
        pendingSearchRequests: Array.isArray(searches) ? searches.length : 0,
        pendingConstruction: Array.isArray(construction) ? construction.length : 0,
        availableAgents: Array.isArray(agents) ? agents.length : 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Annonces en attente', value: stats.pendingProperties, icon: Building },
    { label: 'Demandes de recherche', value: stats.pendingSearchRequests, icon: FileText },
    { label: 'Projets construction', value: stats.pendingConstruction, icon: HardHat },
    { label: 'Agents disponibles', value: stats.availableAgents, icon: UserCheck },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Gestionnaire</p>
              <h1 className="text-3xl font-semibold mt-3">Vue d'ensemble des affectations</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Suivez les demandes entrantes et assignez rapidement aux agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {statCards.map((stat) => (
                <div key={stat.label} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.label}</p>
                      <p className="text-3xl font-semibold mt-2">{loading ? '...' : stat.value}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-[rgb(var(--ink))]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Annonces proprietaires a traiter</h2>
                    <button onClick={() => navigate('/manager/properties')} className="btn-ghost">
                      Voir tout
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                    {!loading && pendingProperties.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune annonce en attente.</p>
                    )}
                    {pendingProperties.slice(0, 5).map((property) => (
                      <div key={property.id || property.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{property.title || 'Annonce sans titre'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            Soumis le {property.created_at ? new Date(property.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                        <span className="chip">En attente</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Demandes de recherche</h2>
                    <button onClick={() => navigate('/manager/assignments')} className="btn-ghost">
                      Assigner
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {!loading && pendingSearchRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande en attente.</p>
                    )}
                    {pendingSearchRequests.slice(0, 5).map((request) => (
                      <div key={request.id || request.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{request.property_type?.name || 'Recherche personnalisee'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">{request.transaction_type} - {request.city || 'Localisation a definir'}</p>
                        </div>
                        <span className="chip">A assigner</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">Projets construction</h2>
                  <div className="space-y-3">
                    {!loading && pendingConstruction.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
                    )}
                    {pendingConstruction.slice(0, 4).map((project) => (
                      <div key={project.id || project.uuid} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{project.title || 'Projet sans titre'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{project.city || 'Localisation inconnue'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
                  <div className="space-y-3">
                    <button onClick={() => navigate('/manager/properties')} className="btn-primary w-full">Assigner une annonce</button>
                    <button onClick={() => navigate('/manager/assignments')} className="btn-ghost w-full">Gerer les demandes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardManager;

