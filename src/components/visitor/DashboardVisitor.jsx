import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { visitorService } from '../../services/api';
import { Search, FileText, MessageSquare, HardHat, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardVisitor = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    searchRequests: 0,
    messagesSent: 0,
    constructionRequests: 0,
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [messagesRes, searchesRes, constructionRes] = await Promise.all([
        visitorService.getMessages(),
        visitorService.getMySearchRequests(),
        visitorService.getMyConstructionRequests()
      ]);

      const messagesPayload = extractPayload(messagesRes);
      const searchesPayload = extractPayload(searchesRes);
      const constructionPayload = extractPayload(constructionRes);

      const messages = messagesPayload.data || messagesPayload;
      const searches = searchesPayload.data || searchesPayload;
      const construction = constructionPayload.data || constructionPayload;

      setRecentMessages(Array.isArray(messages) ? messages.slice(0, 5) : []);
      setRecentSearches(Array.isArray(searches) ? searches.slice(0, 5) : []);

      setStats({
        searchRequests: Array.isArray(searches) ? searches.length : 0,
        messagesSent: Array.isArray(messages) ? messages.length : 0,
        constructionRequests: Array.isArray(construction) ? construction.length : 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard visiteur:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Demandes de recherche', value: stats.searchRequests, icon: Search },
    { title: 'Messages envoyés', value: stats.messagesSent, icon: MessageSquare },
    { title: 'Projets construction', value: stats.constructionRequests, icon: HardHat },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Espace visiteur</p>
              <h1 className="text-3xl font-semibold mt-3">Votre activité immobilière</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Retrouvez vos messages et vos recherches récentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recherches récentes</h2>
                  <button onClick={() => navigate('/visitor/requests')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {!loading && recentSearches.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune recherche enregistrée.</p>
                  )}
                  {recentSearches.map((search) => (
                    <div key={search.id || search.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{search.property_type?.name || 'Recherche personnalisée'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {search.transaction_type} • {search.city || 'Localisation à définir'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Messages récents</h2>
                  <button onClick={() => navigate('/visitor/messages')} className="btn-ghost">
                    Voir tout
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {!loading && recentMessages.length === 0 && (
                    <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message envoyé.</p>
                  )}
                  {recentMessages.map((message) => (
                    <div key={message.id || message.uuid} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{message.subject || 'Message'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">
                        {message.recipient?.full_name || message.recipient_name || 'Destinataire'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardVisitor;
