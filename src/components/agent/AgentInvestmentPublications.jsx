import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService, countryService, partnershipLookupService } from '../../services/api';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import { useToast } from '../common/Toast';
import {
  Save, Plus, Upload, CheckCircle, XCircle, Clock, LocateFixed, Map as MapIcon,
  TrendingUp, Image, FileText,
} from 'lucide-react';

const AgentInvestmentPublications = () => {
  const toast = useToast();
  const defaultImage =
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80';
  const [projects, setProjects] = useState([]);
  const [countries, setCountries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    project_type: 'immobilier',
    location: '',
    city: '',
    country_id: '',
    partner_id: '',
    latitude: '',
    longitude: '',
    total_investment: '',
    min_investment: '',
    expected_return: '',
    duration_months: '',
    status: 'open',
    start_date: '',
    end_date: '',
    description: '',
  });

  const projectTypeOptions = [
    { value: 'immobilier', label: 'Immobilier' },
    { value: 'construction', label: 'Construction' },
    { value: 'renovation', label: 'Renovation' },
  ];

  const statusOptions = [
    { value: 'open', label: 'Ouvert' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'closed', label: 'Ferme' },
    { value: 'completed', label: 'Termine' },
  ];

  const locationPicker = useAddressLocation({
    onResolved: ({ address, city, lat, lng }) => {
      setFormData((prev) => ({
        ...prev,
        location: address,
        city: prev.city || city,
        latitude: Number.isFinite(lat) ? lat : prev.latitude,
        longitude: Number.isFinite(lng) ? lng : prev.longitude,
      }));
    },
  });

  const renderNewFilePreview = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              {file.type?.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={`${label} ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
              ) : (
                <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                  <span className="text-[11px] text-[rgba(15,42,46,0.6)] text-center break-words">{file.name}</span>
                </div>
              )}
              <button type="button" onClick={() => onRemove(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const apiBase = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProjects();
    countryService.getAll()
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? [];
        setCountries(Array.isArray(payload) ? payload : payload.data || []);
      })
      .catch((err) => console.error('Erreur chargement pays:', err));
    partnershipLookupService.getApproved('investisseur')
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? [];
        setPartners(Array.isArray(payload) ? payload : payload.data || []);
      })
      .catch((err) => console.error('Erreur chargement partenaires:', err));
  }, []);

  const loadProjects = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await agentService.getInvestmentPublications();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError('Impossible de charger vos projets.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setDocumentFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleImageFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handlePlanFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setPlanFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleRender3DFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setRender3DFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeNewDocument = (index) => {
    setDocumentFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewPlan = (index) => {
    setPlanFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewRender3D = (index) => {
    setRender3DFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setDocumentFiles([]);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
    setFormData({
      title: project.title || '',
      project_type: project.project_type || 'immobilier',
      location: project.location || '',
      city: project.city || '',
      country_id: project.country_id || project.country?.id || '',
      partner_id: project.partner_id || project.partner?.id || '',
      latitude: project.latitude ?? '',
      longitude: project.longitude ?? '',
      total_investment: project.total_investment || '',
      min_investment: project.min_investment || '',
      expected_return: project.expected_return || '',
      duration_months: project.duration_months || '',
      status: project.status || 'open',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      description: project.description || '',
    });
    locationPicker.reset();
  };

  const resetForm = () => {
    setEditingProject(null);
    setDocumentFiles([]);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
    setFormData({
      title: '',
      project_type: 'immobilier',
      location: '',
      city: '',
      country_id: '',
      partner_id: '',
      latitude: '',
      longitude: '',
      total_investment: '',
      min_investment: '',
      expected_return: '',
      duration_months: '',
      status: 'open',
      start_date: '',
      end_date: '',
      description: '',
    });
    locationPicker.reset();
  };

  const handleRemoveExistingFile = async (field, path) => {
    if (!editingProject?.uuid) return;
    if (!window.confirm('Supprimer ce fichier ?')) return;
    try {
      await agentService.updateInvestmentPublication(editingProject.uuid, { [field]: [path] });
      setEditingProject((prev) => {
        if (!prev) return prev;
        const pathField = field.replace('remove_', '') + '_path';
        return { ...prev, [pathField]: (prev[pathField] || []).filter((item) => item !== path) };
      });
      loadProjects({ silent: true });
      toast.success('Fichier supprime avec succes.');
    } catch (err) {
      console.error('Erreur suppression fichier:', err);
      toast.error('Erreur lors de la suppression du fichier.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...formData,
      total_investment: formData.total_investment ? Number(formData.total_investment) : null,
      min_investment: formData.min_investment ? Number(formData.min_investment) : null,
      expected_return: formData.expected_return ? Number(formData.expected_return) : null,
      duration_months: formData.duration_months ? Number(formData.duration_months) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      country_id: formData.country_id || null,
      latitude: formData.latitude !== '' ? Number(formData.latitude) : null,
      longitude: formData.longitude !== '' ? Number(formData.longitude) : null,
    };

    const hasFiles = documentFiles.length > 0 || imageFiles.length > 0 || planFiles.length > 0 || render3DFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      documentFiles.forEach((file) => requestData.append('documents[]', file));
      imageFiles.forEach((file) => requestData.append('images[]', file));
      planFiles.forEach((file) => requestData.append('plans[]', file));
      render3DFiles.forEach((file) => requestData.append('render_3d[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await agentService.updateInvestmentPublication(editingProject.uuid, requestData);
        toast.success('Projet modifie avec succes.');
      } else {
        await agentService.createInvestmentPublication(requestData);
        toast.success('Projet cree avec succes.');
      }
      await loadProjects({ silent: true });
      resetForm();
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      const message = err.response?.data?.message || 'Erreur lors de l\'enregistrement.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const approvalChip = (status) => {
    if (status === 'approved') {
      return { label: 'Approuve', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'rejected') {
      return { label: 'Rejete', icon: <XCircle className="h-3 w-3" />, className: 'bg-rose-100 text-rose-700' };
    }
    return { label: 'En attente', icon: <Clock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' };
  };

  const pendingProjects = projects.filter((project) => (project.approval_status || 'pending') === 'pending');
  const otherProjects = projects.filter((project) => (project.approval_status || 'pending') !== 'pending');

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Publications investissement</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Vos projets seront valides par l'administration.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {editingProject ? 'Modifier un projet' : 'Nouveau projet'}
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                <div className="space-y-6 min-w-0">
                  <div className="surface-panel p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                      <div>
                        <h2 className="text-lg font-semibold">Informations generales</h2>
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre, type et description du projet d'investissement</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Titre *</label>
                        <input
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Ex. Residence premium - Abidjan"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Type *</label>
                        <select
                          name="project_type"
                          value={formData.project_type}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        >
                          {projectTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows="4"
                          placeholder="Decrivez le projet : atouts, environnement, particularites..."
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="surface-panel p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                      <div>
                        <h2 className="text-lg font-semibold">Localisation</h2>
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Ville, adresse et reperes geographiques</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Ville</label>
                        <input
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Pays</label>
                        <select
                          name="country_id"
                          value={formData.country_id}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        >
                          <option value="">Pays (optionnel)</option>
                          {countries.map((country) => (
                            <option key={country.id} value={country.id}>{country.flag ? `${country.flag} ` : ''}{country.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Partenaire financier</label>
                        <select
                          name="partner_id"
                          value={formData.partner_id}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        >
                          <option value="">Partenaire financier (optionnel)</option>
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>{partner.company_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 relative">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <label className="block text-sm font-medium">Localisation</label>
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={locationPicker.locateMe}
                              disabled={locationPicker.locating}
                              className="inline-flex items-center gap-1 font-medium text-[rgb(var(--clay))] hover:underline disabled:opacity-50"
                            >
                              <LocateFixed className="h-3.5 w-3.5" />
                              {locationPicker.locating ? 'Localisation...' : 'Me localiser'}
                            </button>
                            <button
                              type="button"
                              onClick={() => locationPicker.setShowMap((prev) => !prev)}
                              className="inline-flex items-center gap-1 font-medium text-[rgb(var(--ink))] hover:underline"
                            >
                              <MapIcon className="h-3.5 w-3.5" />
                              {locationPicker.showMap ? 'Masquer la carte' : 'Choisir sur la carte'}
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            name="location"
                            value={formData.location}
                            onChange={(event) => { handleChange(event); locationPicker.handleInputChange(event.target.value); }}
                            onFocus={() => formData.location.trim().length >= 3 && locationPicker.fetchSuggestions(formData.location.trim())}
                            onBlur={() => setTimeout(() => locationPicker.clearSuggestions(), 150)}
                            placeholder="Ex. Boulevard de la Marina, Cotonou"
                            autoComplete="off"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                          {locationPicker.loadingSuggestions && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[rgba(15,42,46,0.4)]">...</span>
                          )}
                          {locationPicker.suggestions.length > 0 && (
                            <div className="surface-card absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto p-1.5">
                              {locationPicker.suggestions.map((item) => (
                                <button
                                  key={item.place_id}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => locationPicker.selectSuggestion(item)}
                                  className="w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg text-xs hover:bg-[rgba(15,42,46,0.05)] transition-colors"
                                >
                                  <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[rgba(15,42,46,0.4)] rotate-90" />
                                  <span className="text-[rgba(15,42,46,0.75)]">{item.display_name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {locationPicker.geoError && <p className="text-xs text-[rgb(var(--clay))] mt-2">{locationPicker.geoError}</p>}
                        {locationPicker.showMap && (
                          <div className="mt-3 rounded-xl overflow-hidden border border-[rgb(var(--line))]">
                            <div ref={locationPicker.mapContainerRef} className="h-56 w-full" />
                            <div className="px-3 py-2 bg-[rgba(15,42,46,0.03)] text-[11px] text-[rgba(15,42,46,0.6)] flex items-center justify-between gap-2">
                              <span>Cliquez sur la carte ou deplacez le repere pour ajuster la position.</span>
                              {locationPicker.reverseGeocoding && <span className="shrink-0">Recherche de l'adresse...</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="surface-panel p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                      <div>
                        <h2 className="text-lg font-semibold">Financement</h2>
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Prix, ticket minimum et rendement</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Investissement total</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total_investment"
                          value={formData.total_investment}
                          onChange={handleChange}
                          min="0"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Ticket minimum</label>
                        <input
                          type="number"
                          step="0.01"
                          name="min_investment"
                          value={formData.min_investment}
                          onChange={handleChange}
                          min="0"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rendement attendu (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="expected_return"
                          value={formData.expected_return}
                          onChange={handleChange}
                          min="0"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Duree (mois)</label>
                        <input
                          type="number"
                          step="1"
                          name="duration_months"
                          value={formData.duration_months}
                          onChange={handleChange}
                          min="0"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="surface-panel p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">4</div>
                      <div>
                        <h2 className="text-lg font-semibold">Calendrier & statut</h2>
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Periode et visibilite de l'offre</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Date de debut</label>
                        <input
                          type="date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Date de fin</label>
                        <input
                          type="date"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Statut</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="surface-panel p-6 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">5</div>
                      <div>
                        <h2 className="text-lg font-semibold">Visuels & documents</h2>
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans, rendus 3D et documents</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium">Images <span className="text-[rgba(15,42,46,0.45)] font-normal">({imageFiles.length})</span></p>
                      <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Image className="h-5 w-5 text-[rgb(var(--clay))]" />
                        </div>
                        <p className="text-sm font-medium mb-1">Photos du projet</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">JPG, PNG ou WEBP</p>
                        <input type="file" multiple accept="image/*" onChange={handleImageFiles} className="hidden" id="agent-investment-image-upload" />
                        <label htmlFor="agent-investment-image-upload" className="btn-primary cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Selectionner des photos
                        </label>
                      </div>
                      {renderNewFilePreview(imageFiles, removeNewImage, 'Nouvelles images')}
                      {editingProject && Array.isArray(editingProject.images_path) && editingProject.images_path.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-3">Images existantes ({editingProject.images_path.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {editingProject.images_path.map((path) => (
                              <div key={path} className="relative">
                                <img src={getStorageUrl(path)} alt="" className="w-full h-20 object-cover rounded-lg" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFile('remove_images', path)}
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium">Documents <span className="text-[rgba(15,42,46,0.45)] font-normal">({documentFiles.length})</span></p>
                      <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <FileText className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                        </div>
                        <p className="text-sm font-medium mb-1">Documents du dossier</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">PDF, Word, Excel ou PowerPoint</p>
                        <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleDocumentFiles} className="hidden" id="agent-investment-document-upload" />
                        <label htmlFor="agent-investment-document-upload" className="btn-ghost cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Ajouter des documents
                        </label>
                      </div>
                      {renderNewFilePreview(documentFiles, removeNewDocument, 'Nouveaux documents')}
                      {editingProject && Array.isArray(editingProject.documents_path) && editingProject.documents_path.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-3">Documents existants ({editingProject.documents_path.length})</p>
                          <div className="space-y-2">
                            {editingProject.documents_path.map((path) => (
                              <div key={path} className="flex items-center gap-2">
                                <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="flex-1 min-w-0 block rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm text-[rgb(var(--ink))] hover:underline truncate">
                                  {path.split('/').pop()}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFile('remove_documents', path)}
                                  className="shrink-0 h-8 w-8 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium">Plans <span className="text-[rgba(15,42,46,0.45)] font-normal">({planFiles.length})</span></p>
                      <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <FileText className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                        </div>
                        <p className="text-sm font-medium mb-1">Plans techniques</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Images ou PDF - optionnel</p>
                        <input type="file" multiple accept="image/*,.pdf" onChange={handlePlanFiles} className="hidden" id="agent-investment-plan-upload" />
                        <label htmlFor="agent-investment-plan-upload" className="btn-ghost cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Ajouter des plans
                        </label>
                      </div>
                      {renderNewFilePreview(planFiles, removeNewPlan, 'Nouveaux plans')}
                      {editingProject && Array.isArray(editingProject.plans_path) && editingProject.plans_path.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-3">Plans existants ({editingProject.plans_path.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {editingProject.plans_path.map((path) => (
                              <div key={path} className="relative">
                                {path.toLowerCase().endsWith('.pdf') ? (
                                  <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                                    <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="text-xs text-[rgb(var(--ink))] hover:underline break-words text-center">
                                      {path.split('/').pop()}
                                    </a>
                                  </div>
                                ) : (
                                  <img src={getStorageUrl(path)} alt="Plan" className="w-full h-20 object-cover rounded-lg" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFile('remove_plans', path)}
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium">Rendus 3D <span className="text-[rgba(15,42,46,0.45)] font-normal">({render3DFiles.length})</span></p>
                      <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <TrendingUp className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                        </div>
                        <p className="text-sm font-medium mb-1">Rendus 3D et visuels de projection</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                        <input type="file" multiple accept="image/*,.pdf" onChange={handleRender3DFiles} className="hidden" id="agent-investment-render3d-upload" />
                        <label htmlFor="agent-investment-render3d-upload" className="btn-ghost cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Ajouter des visuels 3D
                        </label>
                      </div>
                      {renderNewFilePreview(render3DFiles, removeNewRender3D, 'Nouveaux visuels 3D')}
                      {editingProject && Array.isArray(editingProject.render_3d_path) && editingProject.render_3d_path.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-3">Visuels 3D existants ({editingProject.render_3d_path.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {editingProject.render_3d_path.map((path) => (
                              <div key={path} className="relative">
                                {path.toLowerCase().endsWith('.pdf') ? (
                                  <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                                    <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="text-xs text-[rgb(var(--ink))] hover:underline break-words text-center">
                                      {path.split('/').pop()}
                                    </a>
                                  </div>
                                ) : (
                                  <img src={getStorageUrl(path)} alt="Visuel 3D" className="w-full h-20 object-cover rounded-lg" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFile('remove_render_3d', path)}
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 lg:sticky lg:top-6">
                  <div className="surface-panel p-5 space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Apercu du projet</p>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                        {imageFiles[0] ? (
                          <img src={URL.createObjectURL(imageFiles[0])} alt="" className="h-full w-full object-cover" />
                        ) : Array.isArray(editingProject?.images_path) && editingProject.images_path[0] ? (
                          <img src={getStorageUrl(editingProject.images_path[0])} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">{formData.title || 'Titre du projet'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">{formData.city || formData.location || 'Localisation non definie'}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-[rgb(var(--ink))]">
                      {formData.total_investment ? Number(formData.total_investment).toLocaleString() : 'N/A'}
                    </p>
                    {formData.min_investment && (
                      <p className="text-xs text-[rgba(15,42,46,0.6)]">Ticket min : {Number(formData.min_investment).toLocaleString()}</p>
                    )}
                  </div>

                  <div className="surface-panel p-5 space-y-2.5">
                    <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                      <Save className="h-4 w-4" />
                      {saving ? 'Enregistrement...' : editingProject ? 'Enregistrer les modifications' : 'Creer le projet'}
                    </button>
                    {editingProject && (
                      <button type="button" onClick={resetForm} className="btn-ghost w-full justify-center">
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">En attente d'approbation</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingProjects.map((project) => (
                    <div key={project.uuid} className="surface-soft p-4 flex flex-col lg:flex-row gap-4">
                      <div className="lg:w-56 w-full">
                        <img
                          src={
                            Array.isArray(project.images_path) && project.images_path.length
                              ? getStorageUrl(project.images_path[0])
                              : defaultImage
                          }
                          alt={project.title}
                          className="h-40 w-full rounded-2xl object-cover border border-[rgb(var(--line))]"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-base font-semibold">{project.title || 'Projet investissement'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} · Ticket {project.min_investment ? Number(project.min_investment).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-[rgba(15,42,46,0.6)]">
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Reference</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.reference_code || project.uuid?.slice(0, 10) || 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Surface</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.surface_area ? `${project.surface_area} m2` : 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Rendement</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.expected_return ? `${project.expected_return}%` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 lg:w-44">
                        <span className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3" />
                          En attente
                        </span>
                        <button onClick={() => handleEdit(project)} className="btn-ghost">
                          Modifier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Historique des projets</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : otherProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="space-y-3">
                  {otherProjects.map((project) => {
                    const chip = approvalChip(project.approval_status);
                    return (
                      <div key={project.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.title || 'Projet investissement'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} | Ticket {project.min_investment ? Number(project.min_investment).toLocaleString() : 'N/A'}
                          </p>
                          {project.approval_status === 'rejected' && project.rejection_reason && (
                            <p className="text-xs text-[rgb(var(--clay))]">Motif: {project.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${chip.className}`}>
                            {chip.icon}
                            {chip.label}
                          </span>
                          <button onClick={() => handleEdit(project)} className="btn-ghost">
                            Modifier
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentInvestmentPublications;
