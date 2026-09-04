import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { publicInvestmentService, investorService } from '../../services/api';
import { TrendingUp, MapPin, Wallet } from 'lucide-react';

const InvestorOpportunities = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [proposal, setProposal] = useState({ amount: '', message: '' });
  const [saving, setSaving] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await publicInvestmentService.getAll();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement investissements:', err);
      setError(err.response?.data?.message || 'Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const openProposal = (project) => {
    setSelectedProject(project);
    setProposal({ amount: '', message: '' });
    setShowModal(true);
  };

  const submitProposal = async () => {
    if (!selectedProject) return;
    if (!proposal.amount) {
      setError('Veuillez saisir un montant.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await investorService.proposeInvestment(selectedProject.uuid, {
        amount: proposal.amount,
        message: proposal.message || null,
      });
      setShowModal(false);
    } catch (err) {
      console.error('Erreur envoi proposition:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la proposition.');
    } finally {
      setSaving(false);
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
              <h1 className="text-3xl font-semibold mt-3">Opportunites d'investissement</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Explorez les projets disponibles et proposez votre investissement.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : projects.length === 0 ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucun projet disponible pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <div key={project.uuid || project.id} className="surface-panel p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-[rgb(var(--ink))]" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{project.title || 'Projet investissement'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{project.project_type || 'Investissement'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[rgba(15,42,46,0.6)] line-clamp-3">
                      {project.description || 'Aucune description.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.5)]">
                      <MapPin className="h-4 w-4" />
                      {project.city || project.location || 'Localisation'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.5)]">
                      <Wallet className="h-4 w-4" />
                      {project.min_investment ? `Min: ${formatFcfa(project.min_investment)}` : 'Montant libre'}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => openProposal(project)} className="btn-primary">
                        Proposer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && selectedProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Proposition</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Fermer</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Montant</label>
                <input
                  type="number"
                  value={proposal.amount}
                  onChange={(e) => setProposal((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  rows={4}
                  value={proposal.message}
                  onChange={(e) => setProposal((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={submitProposal} className="btn-primary" disabled={saving}>
                {saving ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorOpportunities;
