import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ownerService, notificationService } from '../../services/api';
import { Building, Plus, MessageSquare, Activity, Home, Edit, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardOwner = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProperties: 0,
    approvedProperties: 0,
    pendingProperties: 0,
    totalViews: 0,
    unreadMessages: 0,
  });
  const [recentProperties, setRecentProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, unreadRes] = await Promise.all([
        ownerService.getMyProperties(),
        notificationService.getUnreadCount()
      ]);

      const propertiesPayload = extractPayload(propertiesRes);
      const properties = propertiesPayload.data || propertiesPayload;
      const unreadCount = extractPayload(unreadRes)?.unread_count ?? 0;

      const propertyList = Array.isArray(properties) ? properties : [];
      const approved = propertyList.filter((p) => p.status === 'approved').length;
      const pending = propertyList.filter((p) => ['pending', 'draft'].includes(p.status)).length;
      const views = propertyList.reduce((sum, p) => sum + (p.views_count || 0), 0);

      setStats({
        totalProperties: propertyList.length,
        approvedProperties: approved,
        pendingProperties: pending,
        totalViews: views,
        unreadMessages: unreadCount,
      });
      setRecentProperties(propertyList.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard propriétaire:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total annonces', value: stats.totalProperties, icon: Building },
    { title: 'Approuvées', value: stats.approvedProperties, icon: Home },
    { title: 'En attente', value: stats.pendingProperties, icon: Activity },
    { title: 'Messages non lus', value: stats.unreadMessages, icon: MessageSquare },
  ];

  const quickActions = [
    { label: 'Créer une annonce', description: 'Publier un nouveau bien', action: () => navigate('/owner/add-property'), icon: Plus },
    { label: 'Gérer mes biens', description: 'Mettre à jour vos annonces', action: () => navigate('/owner/properties'), icon: Building },
    { label: 'Messages', description: 'Répondre aux intéressés', action: () => navigate('/owner/messages'), icon: MessageSquare },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Espace propriétaire</p>
              <h1 className="text-3xl font-semibold mt-3">Pilotez vos annonces</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Publiez, suivez et optimisez vos biens en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.title}</p>
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
              <div className="lg:col-span-2 surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Annonces récentes</h2>
                  <button onClick={() => navigate('/owner/properties')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                  {!loading && recentProperties.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune annonce créée.</p>
                  )}
                  {recentProperties.map((property) => (
                    <div key={property.id || property.uuid} className="surface-soft px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{property.title || 'Annonce sans titre'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {property.city || property.address || 'Localisation inconnue'}
                        </p>
                      </div>
                      <span className="chip capitalize">{property.status || 'pending'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
                  <div className="space-y-3">
                    {quickActions.map((action) => (
                      <button key={action.label} onClick={action.action} className="w-full surface-soft px-4 py-3 text-left">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{action.label}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">{action.description}</p>
                          </div>
                          <action.icon className="h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">Conseils</h2>
                  <div className="text-sm text-[rgba(15,42,46,0.6)] space-y-2">
                    <p>• Ajoutez au moins 5 photos pour augmenter la visibilité.</p>
                    <p>• Gardez vos descriptions détaillées et à jour.</p>
                    <p>• Répondez rapidement aux messages entrants.</p>
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

export default DashboardOwner;
