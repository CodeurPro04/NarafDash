import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService, countryService, partnershipLookupService } from '../../services/api';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import { useToast } from '../common/Toast';
import {
  Save,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Upload,
  FileWarning,
  Building,
  LocateFixed,
  MapPin,
  Map as MapIcon,
} from 'lucide-react';

const AgentConstructionPublications = () => {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingPlans, setExistingPlans] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [existingRender3D, setExistingRender3D] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [countries, setCountries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    surface_area: '',
    location: '',
    city: '',
    country_id: '',
    partner_id: '',
    latitude: '',
    longitude: '',
  });

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
    partnershipLookupService.getApproved('constructeur')
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? [];
        setPartners(Array.isArray(payload) ? payload : []);
      })
      .catch((err) => console.error('Erreur chargement partenaires:', err));
  }, []);

  const loadProjects = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await agentService.getConstructionPublications();
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

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewPlan = (index) => {
    setPlanFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewRender3D = (index) => {
    setRender3DFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleRemoveImage = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await agentService.updateConstructionPublication(editingProject.uuid, { remove_images: [path] });
      setExistingImages((prev) => prev.filter((item) => item !== path));
      toast.success('Image supprimee avec succes.');
    } catch (err) {
      console.error("Erreur lors de la suppression de l'image:", err);
      setError("Erreur lors de la suppression de l'image.");
      toast.error("Erreur lors de la suppression de l'image.");
    }
  };

  const handleRemovePlan = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce plan ?')) return;
    try {
      await agentService.updateConstructionPublication(editingProject.uuid, { remove_plans: [path] });
      setExistingPlans((prev) => prev.filter((item) => item !== path));
      toast.success('Plan supprime avec succes.');
    } catch (err) {
      console.error('Erreur lors de la suppression du plan:', err);
      setError('Erreur lors de la suppression du plan.');
      toast.error('Erreur lors de la suppression du plan.');
    }
  };

  const handleRemoveRender3D = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce visuel 3D ?')) return;
    try {
      await agentService.updateConstructionPublication(editingProject.uuid, { remove_render_3d: [path] });
      setExistingRender3D((prev) => prev.filter((item) => item !== path));
      toast.success('Visuel 3D supprime avec succes.');
    } catch (err) {
      console.error('Erreur lors de la suppression du visuel 3D:', err);
      setError('Erreur lors de la suppression du visuel 3D.');
      toast.error('Erreur lors de la suppression du visuel 3D.');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
    setExistingImages(Array.isArray(project.images_path) ? project.images_path : []);
    setExistingPlans(Array.isArray(project.plans_path) ? project.plans_path : []);
    setExistingRender3D(Array.isArray(project.render_3d_path) ? project.render_3d_path : []);
    setFormData({
      title: project.title || '',
      description: project.description || '',
      budget_min: project.budget_min || '',
      budget_max: project.budget_max || '',
      surface_area: project.surface_area || '',
      location: project.location || '',
      city: project.city || '',
      country_id: project.country_id || project.country?.id || '',
      partner_id: project.partner_id || project.partner?.id || '',
      latitude: project.latitude ?? '',
      longitude: project.longitude ?? '',
    });
    locationPicker.reset();
  };

  const resetForm = () => {
    setEditingProject(null);
    setExistingImages([]);
    setImageFiles([]);
    setExistingPlans([]);
    setPlanFiles([]);
    setExistingRender3D([]);
    setRender3DFiles([]);
    setFormData({
      title: '',
      description: '',
      budget_min: '',
      budget_max: '',
      surface_area: '',
      location: '',
      city: '',
      country_id: '',
      partner_id: '',
      latitude: '',
      longitude: '',
    });
    locationPicker.reset();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...formData,
      budget_min: formData.budget_min ? Number(formData.budget_min) : null,
      budget_max: formData.budget_max ? Number(formData.budget_max) : null,
      surface_area: formData.surface_area ? Number(formData.surface_area) : null,
      country_id: formData.country_id || null,
      partner_id: formData.partner_id || null,
      latitude: formData.latitude !== '' ? Number(formData.latitude) : null,
      longitude: formData.longitude !== '' ? Number(formData.longitude) : null,
    };
    const hasFiles = imageFiles.length > 0 || planFiles.length > 0 || render3DFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      imageFiles.forEach((file) => requestData.append('images[]', file));
      planFiles.forEach((file) => requestData.append('plans[]', file));
      render3DFiles.forEach((file) => requestData.append('render_3d[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await agentService.updateConstructionPublication(editingProject.uuid, requestData);
        toast.success('Projet modifie avec succes.');
      } else {
        await agentService.createConstructionPublication(requestData);
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

  const statusChip = (status) => {
    if (status === 'published') {
      return { label: 'Publie', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'rejected') {
      return { label: 'Rejete', icon: <XCircle className="h-3 w-3" />, className: 'bg-rose-100 text-rose-700' };
    }
    return { label: 'En attente', icon: <ImageIcon className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' };
  };

  const renderNewFilePreview = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              <img src={URL.createObjectURL(file)} alt={`${label} ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
              <button type="button" onClick={() => onRemove(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent constructeur</p>
              <h1 className="text-3xl font-semibold mt-3">Publications construction</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Creez vos projets, ils seront valides par l'administration.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="surface-panel p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                  <div>
                    <h2 className="text-lg font-semibold">{editingProject ? 'Modifier le projet' : 'Informations generales'}</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre et description du projet de construction</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Titre</label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    required
                  />
                </div>
              </div>

              <div className="surface-panel p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                  <div>
                    <h2 className="text-lg font-semibold">Budget et caracteristiques</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Fourchette de prix, surface et emplacement</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Budget min</label>
                    <input
                      type="number"
                      name="budget_min"
                      value={formData.budget_min}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Budget max</label>
                    <input
                      type="number"
                      name="budget_max"
                      value={formData.budget_max}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Surface (m2)</label>
                    <input
                      type="number"
                      name="surface_area"
                      value={formData.surface_area}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                  </div>
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
                    <label className="block text-sm font-medium mb-2">Partenaire</label>
                    <select
                      name="partner_id"
                      value={formData.partner_id}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    >
                      <option value="">Partenaire (optionnel)</option>
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
                              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[rgba(15,42,46,0.4)]" />
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

              <div className="surface-panel p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                  <div>
                    <h2 className="text-lg font-semibold">Visuels du projet</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans et rendus 3D</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium">Images <span className="text-[rgba(15,42,46,0.45)] font-normal">({imageFiles.length + existingImages.length})</span></p>
                  <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <ImageIcon className="h-5 w-5 text-[rgb(var(--clay))]" />
                    </div>
                    <p className="text-sm font-medium mb-1">Photos du projet</p>
                    <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">JPG, PNG ou WEBP</p>
                    <input type="file" multiple accept="image/*" onChange={handleImageFiles} className="hidden" id="agent-construction-image-upload" />
                    <label htmlFor="agent-construction-image-upload" className="btn-primary cursor-pointer inline-flex">
                      <Upload className="h-4 w-4" />
                      Selectionner des photos
                    </label>
                  </div>
                  {renderNewFilePreview(imageFiles, removeNewImage, 'Nouvelles images')}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Images existantes ({existingImages.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingImages.map((path) => (
                          <div key={path} className="relative">
                            <img src={getStorageUrl(path)} alt="Image projet" className="w-full h-20 object-cover rounded-lg" />
                            <button type="button" onClick={() => handleRemoveImage(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium">Plans de construction <span className="text-[rgba(15,42,46,0.45)] font-normal">({planFiles.length + existingPlans.length})</span></p>
                  <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <FileWarning className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                    </div>
                    <p className="text-sm font-medium mb-1">Plans techniques</p>
                    <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Images ou PDF - optionnel</p>
                    <input type="file" multiple accept="image/*,.pdf" onChange={handlePlanFiles} className="hidden" id="agent-construction-plan-upload" />
                    <label htmlFor="agent-construction-plan-upload" className="btn-ghost cursor-pointer inline-flex">
                      <Upload className="h-4 w-4" />
                      Ajouter des plans
                    </label>
                  </div>
                  {renderNewFilePreview(planFiles, removeNewPlan, 'Nouveaux plans')}
                  {existingPlans.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Plans existants ({existingPlans.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingPlans.map((path) => (
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
                            <button type="button" onClick={() => handleRemovePlan(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium">Rendus 3D <span className="text-[rgba(15,42,46,0.45)] font-normal">({render3DFiles.length + existingRender3D.length})</span></p>
                  <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <Building className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                    </div>
                    <p className="text-sm font-medium mb-1">Rendus 3D et visuels de projection</p>
                    <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                    <input type="file" multiple accept="image/*,.pdf" onChange={handleRender3DFiles} className="hidden" id="agent-construction-render3d-upload" />
                    <label htmlFor="agent-construction-render3d-upload" className="btn-ghost cursor-pointer inline-flex">
                      <Upload className="h-4 w-4" />
                      Ajouter des visuels 3D
                    </label>
                  </div>
                  {renderNewFilePreview(render3DFiles, removeNewRender3D, 'Nouveaux visuels 3D')}
                  {existingRender3D.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Visuels 3D existants ({existingRender3D.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingRender3D.map((path) => (
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
                            <button type="button" onClick={() => handleRemoveRender3D(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                {editingProject && (
                  <button type="button" className="btn-ghost" onClick={resetForm}>
                    Annuler
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Mes projets</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const chip = statusChip(project.status);
                    return (
                      <div key={project.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                          </p>
                          {project.status === 'rejected' && project.rejection_reason && (
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

export default AgentConstructionPublications;
