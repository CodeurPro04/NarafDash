import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { companyService } from '../../services/api';
import { Building, Handshake, FileText, CheckCircle, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardCompany = () => {
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? null;

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const applicationRes = await companyService.getMyApplication();
      setApplication(extractPayload(applicationRes));
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard entreprise:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    approved: { label: 'Approuvée', icon: CheckCircle },
    pending: { label: 'En attente', icon: Clock },
    rejected: { label: 'Rejetée', icon: AlertCircle },
  };

  const currentStatus = statusConfig[application?.status] || { label: 'Non soumise', icon: Handshake };

  const statCards = [
    { title: 'Candidature', value: application ? 1 : 0, icon: FileText },
    { title: 'Statut', value: currentStatus.label, icon: currentStatus.icon },
    { title: 'Partenariat actif', value: application?.status === 'approved' ? 1 : 0, icon: Building },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Espace entreprise</p>
              <h1 className="text-3xl font-semibold mt-3">Suivi de votre partenariat</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Centralisez vos candidatures et la gestion de vos partenariats.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">{stat.title}</p>
                      <p className="text-2xl font-semibold mt-2">{loading ? '...' : stat.value}</p>
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
                  <h2 className="text-lg font-semibold">Votre dossier</h2>
                  <button
                    onClick={() => navigate('/company/applications')}
                    className="btn-ghost"
                  >
                    Voir la candidature
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
                {loading && <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>}
                {!loading && !application && (
                  <div className="surface-soft px-4 py-4 text-sm text-[rgba(15,42,46,0.6)]">
                    Aucune candidature en cours. Vous pouvez soumettre une demande de partenariat.
                  </div>
                )}
                {!loading && application && (
                  <div className="space-y-3">
                    <div className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{application.company_name || 'Entreprise partenaire'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">{application.contact_email || application.email}</p>
                    </div>
                    <div className="surface-soft px-4 py-3 flex items-center justify-between">
                      <span className="text-sm">Statut</span>
                      <span className="chip">{currentStatus.label}</span>
                    </div>
                    {application.message && (
                      <div className="surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.6)]">
                        {application.message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="surface-panel p-6 space-y-3">
                <h2 className="text-lg font-semibold">Actions rapides</h2>
                <button onClick={() => navigate('/company/partnership')} className="btn-primary w-full">
                  Nouvelle candidature
                </button>
                <button onClick={() => navigate('/company/profile')} className="btn-ghost w-full">
                  Mettre à jour le profil
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardCompany;
