import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import { visitorService, propertyTypeService } from '../../services/api';
import { FileText, HardHat, Mail, Send } from 'lucide-react';
import { useToast } from '../common/Toast';

const VisitorProfile = () => {
  const toast = useToast();
  const [tab, setTab] = useState('requests');
  const [searchRequests, setSearchRequests] = useState([]);
  const [constructionRequests, setConstructionRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchForm, setSearchForm] = useState({
    transaction_type: 'location',
    property_type_id: '',
    budget_min: '',
    budget_max: '',
    bedrooms_min: '',
    surface_min: '',
    location_preferences: '',
    additional_requirements: '',
  });
  const [propertyTypes, setPropertyTypes] = useState([]);
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadData();
    propertyTypeService.getAll()
      .then((response) => setPropertyTypes(extractPayload(response)))
      .catch((err) => console.error('Erreur chargement types de bien:', err));
  }, []);

  const loadData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [messagesRes, searchRes, constructionRes] = await Promise.all([
        visitorService.getMessages(),
        visitorService.getMySearchRequests(),
        visitorService.getMyConstructionRequests(),
      ]);
      const messagesPayload = extractPayload(messagesRes);
      const searchPayload = extractPayload(searchRes);
      const constructionPayload = extractPayload(constructionRes);

      setMessages(Array.isArray(messagesPayload.data || messagesPayload) ? (messagesPayload.data || messagesPayload) : []);
      setSearchRequests(Array.isArray(searchPayload.data || searchPayload) ? (searchPayload.data || searchPayload) : []);
      setConstructionRequests(Array.isArray(constructionPayload.data || constructionPayload) ? (constructionPayload.data || constructionPayload) : []);
    } catch (err) {
      console.error('Erreur chargement profil visiteur:', err);
      setError(err.response?.data?.message || 'Impossible de charger vos donnees.');
    } finally {
      if (!silent) setLoading(false);
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
    if (!searchForm.transaction_type) {
      setError('Veuillez préciser le type de transaction recherché.');
      toast.warning('Veuillez préciser le type de transaction recherché.');
      return;
    }
    try {
      setSavingSearch(true);
      setError('');
      await visitorService.createSearchRequest({
        transaction_type: searchForm.transaction_type,
        property_type_id: searchForm.property_type_id || null,
        budget_min: searchForm.budget_min || null,
        budget_max: searchForm.budget_max || null,
        bedrooms_min: searchForm.bedrooms_min || null,
        surface_min: searchForm.surface_min || null,
        location_preferences: searchForm.location_preferences
          ? [searchForm.location_preferences]
          : null,
        additional_requirements: searchForm.additional_requirements || null,
      });
      setSearchForm({
        transaction_type: 'location',
        property_type_id: '',
        budget_min: '',
        budget_max: '',
        bedrooms_min: '',
        surface_min: '',
        location_preferences: '',
        additional_requirements: '',
      });
      await loadData({ silent: true });
      toast.success('Demande de recherche envoyée avec succès.');
    } catch (err) {
      console.error('Erreur creation recherche:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      const message = err.response?.data?.message || details || 'Erreur lors de la demande de recherche.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingSearch(false);
    }
  };

  const submitConstruction = async () => {
    if (!constructionForm.description) {
      setError('Veuillez renseigner la description du projet.');
      toast.warning('Veuillez renseigner la description du projet.');
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
      await loadData({ silent: true });
      toast.success('Demande de construction envoyée avec succès.');
    } catch (err) {
      console.error('Erreur creation construction:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      const message = err.response?.data?.message || details || 'Erreur lors de la demande de construction.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingConstruction(false);
    }
  };

  const sendReply = async () => {
    if (!replyingTo || !replyText.trim()) return;
    try {
      await visitorService.replyToMessage(replyingTo.uuid || replyingTo.id, { message: replyText });
      setReplyingTo(null);
      setReplyText('');
      await loadData({ silent: true });
      toast.success('Réponse envoyée avec succès.');
    } catch (err) {
      console.error('Erreur lors de la reponse:', err);
      const message = err.response?.data?.message || 'Erreur lors de la reponse.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <p className="chip">Espace visiteur</p>
            <h1 className="text-3xl font-semibold mt-3">Mon profil</h1>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              Gere vos demandes et vos messages depuis le site public.
            </p>
          </div>

          <div className="surface-panel p-2 flex gap-2">
            <button
              onClick={() => setTab('requests')}
              className={`flex-1 btn-ghost ${tab === 'requests' ? 'bg-white' : ''}`}
            >
              Demandes
            </button>
            <button
              onClick={() => setTab('messages')}
              className={`flex-1 btn-ghost ${tab === 'messages' ? 'bg-white' : ''}`}
            >
              Messages
            </button>
          </div>

          {error && (
            <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
          )}

          {loading ? (
            <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
          ) : tab === 'requests' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="surface-panel p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Demandes de recherche</h2>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="transaction_type"
                      value={searchForm.transaction_type}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    >
                      <option value="location">Location</option>
                      <option value="vente">Vente</option>
                    </select>
                    <select
                      name="property_type_id"
                      value={searchForm.property_type_id}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    >
                      <option value="">Type de bien</option>
                      {propertyTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    name="additional_requirements"
                    placeholder="Décrivez ce que vous recherchez"
                    value={searchForm.additional_requirements}
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
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      name="bedrooms_min"
                      placeholder="Chambres min"
                      value={searchForm.bedrooms_min}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <input
                      type="number"
                      name="surface_min"
                      placeholder="Surface min (m²)"
                      value={searchForm.surface_min}
                      onChange={handleSearchChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    name="location_preferences"
                    placeholder="Ville / quartier souhaité"
                    value={searchForm.location_preferences}
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
          ) : (
            <div className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Messages</h2>
              </div>
              {messages.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun message pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.uuid || message.id} className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium">{message.subject || 'Message'}</p>
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">{message.message || message.content}</p>
                      <div className="flex justify-end">
                        <button onClick={() => setReplyingTo(message)} className="btn-ghost">
                          Repondre
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {replyingTo && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Repondre au message</h2>
              <button onClick={() => setReplyingTo(null)} className="btn-ghost">Fermer</button>
            </div>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
            />
            <div className="flex justify-end">
              <button onClick={sendReply} className="btn-primary">
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorProfile;
