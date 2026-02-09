import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { visitorService } from '../../services/api';
import { FileText, HardHat, Send } from 'lucide-react';

const VisitorRequests = () => {
  const [searchRequests, setSearchRequests] = useState([]);
  const [constructionRequests, setConstructionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchForm, setSearchForm] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    city: '',
  });
  const [constructionForm, setConstructionForm] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    surface_area: '',
    location: '',
    city: '',
  });
  const [savingSearch, setSavingSearch] = useState(false);
  const [savingConstruction, setSavingConstruction] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const [searchRes, constructionRes] = await Promise.all([
        visitorService.getMySearchRequests(),
        visitorService.getMyConstructionRequests(),
      ]);
      const searchPayload = extractPayload(searchRes);
      const constructionPayload = extractPayload(constructionRes);
      setSearchRequests(Array.isArray(searchPayload.data || searchPayload) ? (searchPayload.data || searchPayload) : []);
      setConstructionRequests(Array.isArray(constructionPayload.data || constructionPayload) ? (constructionPayload.data || constructionPayload) : []);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      setError(err.response?.data?.message || 'Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConstructionChange = (e) => {
    const { name, value } = e.target;
    setConstructionForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitSearch = async () => {
    if (!searchForm.description) {
      setError('Veuillez renseigner la description de recherche.');
      return;
    }
    try {
      setSavingSearch(true);
      setError('');
      await visitorService.createSearchRequest(searchForm);
      setSearchForm({ title: '', description: '', budget_min: '', budget_max: '', city: '' });
      await loadRequests();
    } catch (err) {
      console.error('Erreur creation recherche:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la demande de recherche.');
    } finally {
      setSavingSearch(false);
    }
  };

  const submitConstruction = async () => {
    if (!constructionForm.description) {
      setError('Veuillez renseigner la description du projet.');
      return;
    }
    try {
      setSavingConstruction(true);
      setError('');
      await visitorService.submitConstructionRequest(constructionForm);
      setConstructionForm({
        title: '',
        description: '',
        budget_min: '',
        budget_max: '',
        surface_area: '',
        location: '',
        city: '',
      });
      await loadRequests();
    } catch (err) {
      console.error('Erreur creation construction:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la demande de construction.');
    } finally {
      setSavingConstruction(false);
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
              <p className="chip">Espace visiteur</p>
              <h1 className="text-3xl font-semibold mt-3">Demandes</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Suivez vos demandes et soumettez de nouveaux besoins.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-panel p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Demandes de recherche</h2>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="title"
                      placeholder="Titre"
                      value={searchForm.title}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <textarea
                      name="description"
                      placeholder="Description"
                      value={searchForm.description}
                      onChange={handleSearchChange}
                      rows={4}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        name="budget_min"
                        placeholder="Budget min"
                        value={searchForm.budget_min}
                        onChange={handleSearchChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                      <input
                        type="number"
                        name="budget_max"
                        placeholder="Budget max"
                        value={searchForm.budget_max}
                        onChange={handleSearchChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      name="city"
                      placeholder="Ville"
                      value={searchForm.city}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <button onClick={submitSearch} className="btn-primary" disabled={savingSearch}>
                      <Send className="h-4 w-4" />
                      {savingSearch ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(searchRequests || []).map((req) => (
                      <div key={req.uuid || req.id} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{req.title || 'Recherche de bien'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{req.status || 'pending'}</p>
                      </div>
                    ))}
                    {searchRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande pour le moment.</p>
                    )}
                  </div>
                </div>

                <div className="surface-panel p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Demandes de construction</h2>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="title"
                      placeholder="Titre"
                      value={constructionForm.title}
                      onChange={handleConstructionChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <textarea
                      name="description"
                      placeholder="Description"
                      value={constructionForm.description}
                      onChange={handleConstructionChange}
                      rows={4}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        name="budget_min"
                        placeholder="Budget min"
                        value={constructionForm.budget_min}
                        onChange={handleConstructionChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                      <input
                        type="number"
                        name="budget_max"
                        placeholder="Budget max"
                        value={constructionForm.budget_max}
                        onChange={handleConstructionChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        name="surface_area"
                        placeholder="Surface"
                        value={constructionForm.surface_area}
                        onChange={handleConstructionChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                      <input
                        type="text"
                        name="location"
                        placeholder="Localisation"
                        value={constructionForm.location}
                        onChange={handleConstructionChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      name="city"
                      placeholder="Ville"
                      value={constructionForm.city}
                      onChange={handleConstructionChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <button onClick={submitConstruction} className="btn-primary" disabled={savingConstruction}>
                      <Send className="h-4 w-4" />
                      {savingConstruction ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(constructionRequests || []).map((req) => (
                      <div key={req.uuid || req.id} className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium">{req.title || 'Projet construction'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">{req.status || 'submitted'}</p>
                      </div>
                    ))}
                    {constructionRequests.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucune demande pour le moment.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VisitorRequests;
