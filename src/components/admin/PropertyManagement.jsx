import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, propertyTypeService, countryService } from '../../services/api';
import {
  Building,
  Trash2,
  Search,
  Eye,
  MapPin,
  Banknote,
  User,
  Calendar,
  Image,
  Plus,
  Upload,
  Save,
  ShieldCheck,
  Clock,
  FileWarning,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  LocateFixed,
  Map as MapIcon,
  Pencil,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { getTypeRules, resetHiddenFields } from '../../utils/propertyTypeRules';
import { useAddressLocation } from '../../hooks/useAddressLocation';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const ACCEPTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
// surface_area et land_area sont stockes en decimal:2 cote backend ; sans step="0.01"
// un input number refuse silencieusement (validation HTML native) toute valeur avec decimales.
const DECIMAL_CHAR_KEYS = ['surface_area', 'land_area'];

const initialFormData = {
  title: '',
  description: '',
  property_type_id: '',
  transaction_type: 'vente',
  price: '',
  currency: 'XOF',
  negotiable: false,
  surface_area: '',
  land_area: '',
  bedrooms: '',
  bathrooms: '',
  parking_spaces: '',
  floor_number: '',
  total_floors: '',
  year_built: '',
  address: '',
  city: '',
  commune: '',
  quartier: '',
  latitude: '',
  longitude: '',
  feature_ids: [],
  country_id: '',
};

const PER_PAGE = 12;

const PropertyManagement = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [types, setTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [planImages, setPlanImages] = useState([]);
  const [render3DImages, setRender3DImages] = useState([]);
  const [editingProperty, setEditingProperty] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [existingPlanImages, setExistingPlanImages] = useState([]);
  const [existingRender3DImages, setExistingRender3DImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, draft: 0 });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = showCreateForm;
  const isListOnlyView = viewParam === 'list' && !showCreateForm;

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  const validateFiles = (files, label) => {
    for (const file of files) {
      const extension = (file.name.split('.').pop() || '').toLowerCase();
      const mimeType = (file.type || '').toLowerCase();
      const validMime = ACCEPTED_IMAGE_TYPES.includes(mimeType);
      const validExtension = ACCEPTED_IMAGE_EXTENSIONS.includes(extension);

      if (!validMime || !validExtension) {
        return `${label} : le fichier "${file.name}" n'est pas accepte. Formats autorises : JPG, JPEG, PNG, WEBP.`;
      }
    }

    return '';
  };

  useEffect(() => {
    loadLookupData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchInput(params.get('q') || '');
    setShowCreateForm(params.get('view') === 'create');
  }, [location.search]);

  // Recherche debouncee (350ms) : on evite une requete par frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Revenir a la page 1 des qu'un filtre change.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, filterType]);

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, filterStatus, filterType]);

  const loadLookupData = async () => {
    try {
      const [typesRes, featuresRes, countriesRes] = await Promise.all([
        propertyTypeService.getAll(),
        propertyTypeService.getFeatures(),
        countryService.getAll(),
      ]);
      const typesPayload = extractPayload(typesRes);
      const featuresPayload = extractPayload(featuresRes);
      const countriesPayload = extractPayload(countriesRes);
      setTypes(Array.isArray(typesPayload) ? typesPayload : typesPayload.data || []);
      setFeatures(Array.isArray(featuresPayload) ? featuresPayload : featuresPayload.data || []);
      setCountries(Array.isArray(countriesPayload) ? countriesPayload : countriesPayload.data || []);
    } catch (lookupError) {
      console.error('Erreur chargement referentiels:', lookupError);
    }
  };

  const loadProperties = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await adminService.getAllProperties({
        page,
        per_page: PER_PAGE,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        transaction_type: filterType !== 'all' ? filterType : undefined,
      });
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProperties(Array.isArray(list) ? list : []);
      setLastPage(payload.last_page || 1);
      setTotalProperties(payload.total ?? (Array.isArray(list) ? list.length : 0));
      const responseStats = response?.data?.stats;
      if (responseStats) {
        setStats({
          total: responseStats.total || 0,
          approved: responseStats.approved || 0,
          pending: responseStats.pending || 0,
          draft: responseStats.draft || 0,
        });
      }
    } catch (loadError) {
      console.error('Erreur chargement proprietes:', loadError);
      setError(loadError.response?.data?.message || 'Impossible de charger les proprietes.');
      setProperties([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'approved') return { label: 'Approuvee', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'pending') return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
    if (status === 'rejected') return { label: 'Rejetee', className: 'bg-rose-100 text-rose-700' };
    if (status === 'draft') return { label: 'Brouillon', className: 'bg-slate-100 text-slate-700' };
    return { label: status || 'Inconnu', className: 'bg-slate-100 text-slate-700' };
  };

  const getMediaCandidate = (media) => media?.url || media?.file_path || media?.public_url || media?.secure_url || '';
  const getPropertyImage = (property) => getMediaCandidate(property?.primary_image || property?.primaryImage) || getMediaCandidate(property?.media?.[0]);

  const locationPicker = useAddressLocation({
    onResolved: ({ address, city, lat, lng }) => {
      setFormData((prev) => ({
        ...prev,
        address,
        city: prev.city || city,
        latitude: Number.isFinite(lat) ? lat : prev.latitude,
        longitude: Number.isFinite(lng) ? lng : prev.longitude,
      }));
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setImages([]);
    setPlanImages([]);
    setRender3DImages([]);
    setEditingProperty(null);
    setExistingImages([]);
    setExistingPlanImages([]);
    setExistingRender3DImages([]);
    locationPicker.reset();
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setImages([]);
    setPlanImages([]);
    setRender3DImages([]);
    const media = Array.isArray(property.media) ? property.media : [];
    setExistingImages(media.filter((item) => !item.category || item.category === 'standard'));
    setExistingPlanImages(media.filter((item) => item.category === 'plan'));
    setExistingRender3DImages(media.filter((item) => item.category === 'three_d'));
    setFormData({
      title: property.title || '',
      description: property.description || '',
      property_type_id: property.property_type_id || property.property_type?.id || '',
      transaction_type: property.transaction_type || 'vente',
      price: property.price ?? '',
      currency: property.currency || 'XOF',
      negotiable: Boolean(property.negotiable),
      surface_area: property.surface_area ?? '',
      land_area: property.land_area ?? '',
      bedrooms: property.bedrooms ?? '',
      bathrooms: property.bathrooms ?? '',
      parking_spaces: property.parking_spaces ?? '',
      floor_number: property.floor_number ?? '',
      total_floors: property.total_floors ?? '',
      year_built: property.year_built ?? '',
      address: property.address || '',
      city: property.city || '',
      commune: property.commune || '',
      quartier: property.quartier || '',
      latitude: property.latitude ?? '',
      longitude: property.longitude ?? '',
      feature_ids: Array.isArray(property.features) ? property.features.map((feature) => feature.id) : [],
      country_id: property.country_id || property.country?.id || '',
    });
    locationPicker.reset();
    setShowCreateForm(true);
    setError('');
  };

  const handleRemoveExistingMedia = async (mediaItem, categorySetter) => {
    if (!mediaItem?.id) return;
    if (!window.confirm('Supprimer ce visuel ?')) return;
    try {
      await adminService.deletePropertyMedia(mediaItem.id);
      categorySetter((prev) => prev.filter((item) => item.id !== mediaItem.id));
    } catch (removeError) {
      console.error('Erreur suppression media:', removeError);
      setError(removeError.response?.data?.message || 'Erreur lors de la suppression du visuel.');
    }
  };

  const activeRules = useMemo(
    () => getTypeRules(types, formData.property_type_id),
    [types, formData.property_type_id]
  );

  const selectedType = useMemo(
    () => types.find((type) => String(type.id) === String(formData.property_type_id)),
    [types, formData.property_type_id]
  );

  const requiredChecklist = useMemo(() => {
    const items = [
      { label: "Titre de l'annonce", done: formData.title.trim().length > 0 },
      { label: 'Type de bien', done: !!formData.property_type_id },
      { label: 'Prix', done: formData.price !== '' && Number(formData.price) > 0 },
      { label: 'Description', done: formData.description.trim().length > 0 },
      { label: 'Adresse', done: formData.address.trim().length > 0 },
      { label: 'Ville', done: formData.city.trim().length > 0 },
      { label: 'Photos du bien', done: images.length > 0 || existingImages.length > 0 },
    ];
    activeRules.fields
      .filter((field) => field.required)
      .forEach((field) => {
        items.push({ label: field.label, done: formData[field.key] !== '' && formData[field.key] !== null && formData[field.key] !== undefined });
      });
    return items;
  }, [formData, activeRules, images.length, existingImages.length]);

  const completedRequiredCount = requiredChecklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedRequiredCount / requiredChecklist.length) * 100);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'property_type_id') {
      const newRules = getTypeRules(types, value);
      setFormData((prev) => resetHiddenFields(newRules, {
        ...prev,
        property_type_id: value,
        feature_ids: newRules.showFeatures ? prev.feature_ids : [],
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleFeature = (featureId) => {
    setFormData((prev) => ({
      ...prev,
      feature_ids: prev.feature_ids.includes(featureId)
        ? prev.feature_ids.filter((id) => id !== featureId)
        : [...prev.feature_ids, featureId],
    }));
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const validationMessage = validateFiles(files, 'Images standards');
    if (validationMessage) {
      setError(validationMessage);
      event.target.value = '';
      return;
    }
    setError('');
    setImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const handlePlanUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const validationMessage = validateFiles(files, 'Plans de construction');
    if (validationMessage) {
      setError(validationMessage);
      event.target.value = '';
      return;
    }
    setError('');
    setPlanImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removePlanImage = (index) => {
    setPlanImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleRender3DUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const validationMessage = validateFiles(files, 'Representations 3D');
    if (validationMessage) {
      setError(validationMessage);
      event.target.value = '';
      return;
    }
    setError('');
    setRender3DImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeRender3DImage = (index) => {
    setRender3DImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const renderPreviewGrid = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              <img src={URL.createObjectURL(file)} alt={`${label} ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <button type="button" onClick={() => onRemove(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const renderExistingMediaGrid = (mediaItems, categorySetter, label) => (
    mediaItems.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} deja en ligne ({mediaItems.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div key={item.id} className="relative">
              <SecureImage src={resolveMediaUrl(getMediaCandidate(item))} alt={label} className="w-full h-24 object-cover rounded-lg" />
              <button type="button" onClick={() => handleRemoveExistingMedia(item, categorySetter)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    if (!editingProperty && images.length === 0) {
      setSaving(false);
      setError('Veuillez ajouter au moins une image pour creer la propriete.');
      return;
    }
    if (editingProperty && existingImages.length === 0 && images.length === 0) {
      setSaving(false);
      setError('La propriete doit conserver au moins une image.');
      return;
    }

    try {
      const standardValidation = validateFiles(images, 'Images standards');
      if (standardValidation) {
        setError(standardValidation);
        setSaving(false);
        return;
      }

      const planValidation = validateFiles(planImages, 'Plans de construction');
      if (planValidation) {
        setError(planValidation);
        setSaving(false);
        return;
      }

      const renderValidation = validateFiles(render3DImages, 'Representations 3D');
      if (renderValidation) {
        setError(renderValidation);
        setSaving(false);
        return;
      }

      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'feature_ids') {
          value.forEach((featureId) => payload.append('features[]', featureId));
          return;
        }
        if (value === '' || value === null) return;
        if (key === 'negotiable') {
          payload.append(key, value ? '1' : '0');
          return;
        }
        payload.append(key, value);
      });
      images.forEach((image) => payload.append('images[]', image));
      planImages.forEach((image) => payload.append('plan_images[]', image));
      render3DImages.forEach((image) => payload.append('render_3d_images[]', image));

      if (editingProperty?.uuid) {
        await adminService.updateProperty(editingProperty.uuid, payload);
      } else {
        await adminService.createProperty(payload);
      }
      resetForm();
      setShowCreateForm(false);
      setPage(1);
      await loadProperties({ silent: true });
    } catch (creationError) {
      console.error('Erreur enregistrement propriete:', creationError);
      const apiErrors = creationError.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(creationError.response?.data?.message || details || 'Impossible d\'enregistrer la propriete.');
    } finally {
      setSaving(false);
    }
  };

  const handleForceDelete = async (uuid) => {
    if (!window.confirm('Supprimer definitivement cette propriete ?')) return;
    try {
      await adminService.forceDeleteProperty(uuid);
      await loadProperties({ silent: true });
    } catch (deleteError) {
      console.error('Erreur suppression:', deleteError);
      alert('Erreur lors de la suppression');
    }
  };

  const handleStatusUpdate = async (uuid, status) => {
    let rejectionReason = null;
    if (status === 'rejected') {
      const input = window.prompt('Motif du rejet (optionnel)') || '';
      rejectionReason = input.trim() || 'Non conforme';
    }
    try {
      const payload = status === 'rejected' ? { status, rejection_reason: rejectionReason } : { status };
      await adminService.updatePropertyStatus(uuid, payload);
      await loadProperties({ silent: true });
    } catch (updateError) {
      console.error('Erreur mise a jour statut:', updateError);
      alert(updateError.response?.data?.message || 'Erreur lors de la mise a jour du statut');
    }
  };

  const renderFeatureSection = () => activeRules.showFeatures && features.length > 0 ? (
    <div className="surface-panel p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">4</div>
        <div>
          <h2 className="text-lg font-semibold">Equipements</h2>
          <p className="text-xs text-[rgba(15,42,46,0.55)]">Selectionnez les commodites disponibles (optionnel)</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => {
          const active = formData.feature_ids.includes(feature.id);
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => toggleFeature(feature.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                  : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgba(15,42,46,0.4)]'
              }`}
            >
              {active && <CheckCircle className="h-3.5 w-3.5" />}
              {feature.name}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">
                {isCreateOnlyView ? (editingProperty ? 'Modifier la propriete' : 'Ajouter une propriete') : 'Liste des proprietes'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? (editingProperty
                    ? "Mettez a jour les informations de cette propriete."
                    : "Renseignez les informations necessaires pour creer directement une propriete.")
                  : 'Consultez, recherchez et validez les annonces de la plateforme.'}
              </p>
            </div>

            {error && !showCreateForm && <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>}

            {!isCreateOnlyView && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'total', label: 'Proprietes', value: stats.total, icon: Building },
                  { key: 'approved', label: 'Approuvees', value: stats.approved, icon: ShieldCheck },
                  { key: 'pending', label: 'En attente', value: stats.pending, icon: Clock, highlight: stats.pending > 0 },
                  { key: 'draft', label: 'A traiter', value: stats.draft, icon: FileWarning },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {loading && stats.total === 0 ? '...' : Number(kpi.value || 0).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                          kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                        }`}
                      >
                        <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isCreateOnlyView && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou localisation..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0">
                  <option value="all">Tous types</option>
                  <option value="vente">Vente</option>
                  <option value="location">Location</option>
                </select>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0">
                  <option value="all">Tous statuts</option>
                  <option value="approved">Approuvees</option>
                  <option value="pending">En attente</option>
                  <option value="draft">Brouillons / rejetees</option>
                </select>
                {(searchInput || filterType !== 'all' || filterStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); setFilterType('all'); setFilterStatus('all'); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
                {!isListOnlyView && (
                  <button type="button" className="btn-primary w-full md:w-auto shrink-0" onClick={() => { resetForm(); setShowCreateForm(true); }}>
                    <Plus className="h-4 w-4" />
                    Ajouter une propriete
                  </button>
                )}
              </div>
            )}

            {showCreateForm && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setShowCreateForm(false); }}
                    className="btn-ghost text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Retour a la liste
                  </button>
                  <div className="flex items-center gap-2.5 text-xs text-[rgba(15,42,46,0.6)]">
                    <span className="whitespace-nowrap">{completedRequiredCount}/{requiredChecklist.length} champs requis</span>
                    <div className="h-1.5 w-20 sm:w-28 rounded-full bg-[rgba(15,42,46,0.08)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completionPercent === 100 ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`}
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                  <div className="space-y-6 min-w-0">
                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                        <div>
                          <h2 className="text-lg font-semibold">Informations generales</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre, type de bien, transaction et prix</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Titre *</label>
                          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Ex. Villa moderne avec piscine a Cocody" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Type de bien *</label>
                          <select name="property_type_id" value={formData.property_type_id} onChange={handleInputChange} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]">
                            <option value="">Selectionner</option>
                            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Transaction *</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[{ value: 'vente', label: 'Vente' }, { value: 'location', label: 'Location' }].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleInputChange({ target: { name: 'transaction_type', value: option.value, type: 'text' } })}
                                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                                  formData.transaction_type === option.value
                                    ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                                    : 'bg-white/70 border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-[rgba(15,42,46,0.4)]'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Prix *</label>
                          <div className="grid grid-cols-3 gap-2">
                            <input type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} required min="0" placeholder="0" className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                            <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="inline-flex items-center gap-2 text-xs text-[rgba(15,42,46,0.6)]">
                            <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleInputChange} className="rounded border-[rgb(var(--line))]" />
                            Prix negociable
                          </label>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Description *</label>
                          <textarea name="description" value={formData.description} onChange={handleInputChange} required rows={4} placeholder="Decrivez le bien : atouts, environnement, particularites..." className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                        </div>
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                        <div>
                          <h2 className="text-lg font-semibold">Caracteristiques</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Surfaces, pieces et details techniques</p>
                        </div>
                      </div>
                      {activeRules.hint && (
                        <p className="text-sm text-[rgba(15,42,46,0.6)] bg-[rgba(15,42,46,0.04)] px-4 py-3 rounded-xl">
                          ℹ️ {activeRules.hint}
                        </p>
                      )}
                      {activeRules.fields.length === 0 ? (
                        <p className="text-sm text-[rgba(15,42,46,0.4)] italic">Aucune caractéristique spécifique pour ce type de bien.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {activeRules.fields.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs text-[rgba(15,42,46,0.6)] mb-1">{field.label}{field.required ? ' *' : ''}</label>
                              <input type="number" step={DECIMAL_CHAR_KEYS.includes(field.key) ? '0.01' : '1'} name={field.key} required={field.required} value={formData[field.key]} onChange={handleInputChange} min="0" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                        <div>
                          <h2 className="text-lg font-semibold">Localisation</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Adresse et reperes geographiques</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 relative">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <label className="block text-sm font-medium">Adresse *</label>
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
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={(event) => { handleInputChange(event); locationPicker.handleInputChange(event.target.value); }}
                              onFocus={() => formData.address.trim().length >= 3 && locationPicker.fetchSuggestions(formData.address.trim())}
                              onBlur={() => setTimeout(() => locationPicker.clearSuggestions(), 150)}
                              required
                              autoComplete="off"
                              placeholder="Ex. Boulevard de la Marina, Cotonou"
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
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="Ville *" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                        <select name="country_id" value={formData.country_id} onChange={handleInputChange} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]">
                          <option value="">Pays (optionnel)</option>
                          {countries.map((country) => (
                            <option key={country.id} value={country.id}>{country.flag ? `${country.flag} ` : ''}{country.name}</option>
                          ))}
                        </select>
                        <input type="text" name="commune" value={formData.commune} onChange={handleInputChange} placeholder="Commune" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                        <input type="text" name="quartier" value={formData.quartier} onChange={handleInputChange} placeholder="Quartier" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                      </div>
                    </div>

                    {renderFeatureSection()}

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">{activeRules.showFeatures && features.length > 0 ? 5 : 4}</div>
                        <div>
                          <h2 className="text-lg font-semibold">Visuels du projet</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans et rendus 3D</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Images standards * <span className="text-[rgba(15,42,46,0.45)] font-normal">({images.length})</span></p>
                        </div>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Image className="h-5 w-5 text-[rgb(var(--clay))]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Photos principales de la propriete</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">JPG, PNG ou WEBP</p>
                          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="admin-property-image-upload" />
                          <label htmlFor="admin-property-image-upload" className="btn-primary cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Selectionner des photos
                          </label>
                        </div>
                        {renderExistingMediaGrid(existingImages, setExistingImages, 'Images standards')}
                        {renderPreviewGrid(images, removeImage, 'Images standards selectionnees')}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Plans de construction <span className="text-[rgba(15,42,46,0.45)] font-normal">({planImages.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <FileWarning className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Plans ou visuels techniques</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                          <input type="file" multiple accept="image/*" onChange={handlePlanUpload} className="hidden" id="admin-plan-image-upload" />
                          <label htmlFor="admin-plan-image-upload" className="btn-ghost cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Ajouter des plans
                          </label>
                        </div>
                        {renderExistingMediaGrid(existingPlanImages, setExistingPlanImages, 'Plans')}
                        {renderPreviewGrid(planImages, removePlanImage, 'Plans selectionnes')}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Representations 3D <span className="text-[rgba(15,42,46,0.45)] font-normal">({render3DImages.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Building className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Rendus 3D et visuels de projection</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                          <input type="file" multiple accept="image/*" onChange={handleRender3DUpload} className="hidden" id="admin-render3d-image-upload" />
                          <label htmlFor="admin-render3d-image-upload" className="btn-ghost cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Ajouter des visuels 3D
                          </label>
                        </div>
                        {renderExistingMediaGrid(existingRender3DImages, setExistingRender3DImages, 'Visuels 3D')}
                        {renderPreviewGrid(render3DImages, removeRender3DImage, 'Visuels 3D selectionnes')}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6">
                    <div className="surface-panel p-5 space-y-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Apercu de l'annonce</p>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {images[0] ? (
                            <img src={URL.createObjectURL(images[0])} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Building className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">{formData.title || "Titre de l'annonce"}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] truncate capitalize">{selectedType?.name || 'Type non defini'} · {formData.transaction_type}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-semibold text-[rgb(var(--ink))]">
                        {formData.price ? `${Number(formData.price).toLocaleString()} ${formData.currency}` : '—'}
                        {formData.negotiable && formData.price ? <span className="text-xs font-normal text-[rgba(15,42,46,0.5)] ml-2">Negociable</span> : null}
                      </p>
                      {(formData.address || formData.city) && (
                        <p className="text-xs text-[rgba(15,42,46,0.6)] flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{[formData.address, formData.commune, formData.city].filter(Boolean).join(', ')}</span>
                        </p>
                      )}
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Champs requis ({completedRequiredCount}/{requiredChecklist.length})</p>
                      <ul className="space-y-2">
                        {requiredChecklist.map((item) => (
                          <li key={item.label} className="flex items-center gap-2 text-sm">
                            {item.done ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border-2 border-[rgba(15,42,46,0.2)] shrink-0" />
                            )}
                            <span className={item.done ? 'text-[rgb(var(--ink))]' : 'text-[rgba(15,42,46,0.5)]'}>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {error && (
                      <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
                    )}

                    <div className="surface-panel p-5 space-y-2.5">
                      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                        <Save className="h-4 w-4" />
                        {saving
                          ? (editingProperty ? 'Enregistrement...' : 'Creation...')
                          : (editingProperty ? 'Enregistrer les modifications' : 'Creer la propriete')}
                      </button>
                      <button type="button" onClick={() => { resetForm(); setShowCreateForm(false); }} className="btn-ghost w-full justify-center">
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {!isCreateOnlyView && (
              <>
                {/* Liste - cartes empilees sur mobile (pas de scroll horizontal) */}
                <div className="surface-panel overflow-hidden md:hidden">
                  <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4">
                          <div className="h-24 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                        </div>
                      ))
                    ) : properties.length === 0 ? (
                      <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                        Aucune propriete ne correspond a ces criteres.
                      </div>
                    ) : (
                      properties.map((property) => (
                        <div key={property.uuid || property.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                              {getPropertyImage(property) ? (
                                <SecureImage src={resolveMediaUrl(getPropertyImage(property))} alt={property.title} className="w-full h-full object-cover" />
                              ) : (
                                <Building className="h-6 w-6 text-[rgba(15,42,46,0.4)]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-[rgb(var(--ink))] truncate">{property.title || 'Titre non defini'}</p>
                                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${statusBadge(property.status).className}`}>
                                  {statusBadge(property.status).label}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {property.transaction_type && <span className="chip text-[11px] capitalize">{property.transaction_type}</span>}
                                {property.property_type?.name && <span className="chip text-[11px]">{property.property_type.name}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-[rgba(15,42,46,0.6)] space-y-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{property.address || 'Adresse inconnue'}, {property.city || 'Ville'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Banknote className="h-3.5 w-3.5 shrink-0" />
                              {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'FCFA'}` : 'Prix non defini'}
                            </div>
                            <p className="truncate">Proprietaire : {property.user?.first_name} {property.user?.last_name}</p>
                            <p className="truncate">Agent : {property.agent ? `${property.agent.first_name} ${property.agent.last_name}` : 'Non assigne'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['pending', 'draft'].includes(property.status) && (
                              <>
                                <button onClick={() => handleStatusUpdate(property.uuid, 'approved')} className="btn-primary flex-1 text-xs">Approuver</button>
                                <button onClick={() => handleStatusUpdate(property.uuid, 'rejected')} className="btn-ghost flex-1 text-xs">Rejeter</button>
                              </>
                            )}
                            <button onClick={() => { setSelectedProperty(property); setShowDetailsModal(true); }} className="btn-ghost px-3"><Eye className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleEdit(property)} className="btn-ghost px-3"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleForceDelete(property.uuid)} className="btn-ghost px-3 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!loading && totalProperties > 0 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {page} sur {lastPage}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                          disabled={page >= lastPage}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Liste - tableau a partir de md */}
                <div className="surface-panel overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[960px]">
                      <thead>
                        <tr className="border-b border-[rgba(15,42,46,0.08)] text-left">
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Bien</th>
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Proprietaire / Agent</th>
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Localisation</th>
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Prix</th>
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Statut</th>
                          <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="border-b border-[rgba(15,42,46,0.06)]">
                              <td colSpan={6} className="px-5 py-4">
                                <div className="h-12 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : properties.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                              Aucune propriete ne correspond a ces criteres.
                            </td>
                          </tr>
                        ) : (
                          properties.map((property) => (
                            <tr key={property.uuid || property.id} className="border-b border-[rgba(15,42,46,0.06)] last:border-0 hover:bg-[rgba(15,42,46,0.02)] transition">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                                    {getPropertyImage(property) ? (
                                      <SecureImage src={resolveMediaUrl(getPropertyImage(property))} alt={property.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <Building className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[rgb(var(--ink))] truncate max-w-[220px]">{property.title || 'Titre non defini'}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {property.transaction_type && <span className="chip text-[11px] capitalize">{property.transaction_type}</span>}
                                      {property.property_type?.name && <span className="chip text-[11px]">{property.property_type.name}</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-[rgba(15,42,46,0.65)]">
                                <p className="truncate max-w-[160px]">{property.user?.first_name} {property.user?.last_name}</p>
                                <p className="truncate max-w-[160px] text-[rgba(15,42,46,0.5)]">
                                  {property.agent ? `${property.agent.first_name} ${property.agent.last_name}` : 'Non assigne'}
                                </p>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-[rgba(15,42,46,0.7)]">
                                <div className="flex items-center gap-1.5 max-w-[200px]">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{property.address || 'Adresse inconnue'}, {property.city || 'Ville'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-sm text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                                {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'FCFA'}` : 'N/A'}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusBadge(property.status).className}`}>
                                  {statusBadge(property.status).label}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  {['pending', 'draft'].includes(property.status) && (
                                    <>
                                      <button
                                        onClick={() => handleStatusUpdate(property.uuid, 'approved')}
                                        title="Approuver"
                                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusUpdate(property.uuid, 'rejected')}
                                        title="Rejeter"
                                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgb(var(--clay))] hover:bg-[rgba(199,109,74,0.08)] transition"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => { setSelectedProperty(property); setShowDetailsModal(true); }}
                                    title="Details"
                                    className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white hover:text-[rgb(var(--ink))] transition"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(property)}
                                    title="Modifier"
                                    className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white hover:text-[rgb(var(--ink))] transition"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleForceDelete(property.uuid)}
                                    title="Supprimer"
                                    className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!loading && totalProperties > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">
                        {totalProperties} propriete{totalProperties > 1 ? 's' : ''} - page {page} sur {lastPage}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                          disabled={page >= lastPage}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {showDetailsModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{selectedProperty.title || 'Propriete'}</h2>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(selectedProperty.status).className}`}>{statusBadge(selectedProperty.status).label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{selectedProperty.address || 'Adresse inconnue'}, {selectedProperty.city || 'Ville'}</div>
                  <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />{selectedProperty.price ? `${Number(selectedProperty.price).toLocaleString()} ${selectedProperty.currency || 'FCFA'}` : 'Prix non defini'}</div>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="btn-ghost">Fermer</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                  {getPropertyImage(selectedProperty) ? (
                    <SecureImage src={resolveMediaUrl(getPropertyImage(selectedProperty))} alt={selectedProperty.title} className="w-full h-72 object-cover" />
                  ) : (
                    <div className="h-72 flex items-center justify-center"><Building className="h-10 w-10 text-[rgba(15,42,46,0.4)]" /></div>
                  )}
                </div>
                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Image className="h-4 w-4" />Description</div>
                  <p className="text-sm text-[rgba(15,42,46,0.7)]">{selectedProperty.description || 'Aucune description disponible.'}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4" />Contacts</div>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Proprietaire</p>
                      <p className="font-medium">{selectedProperty.user?.first_name} {selectedProperty.user?.last_name}</p>
                      <p className="text-xs">{selectedProperty.user?.email || 'Email non disponible'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Agent assigne</p>
                      <p className="font-medium">{selectedProperty.agent ? `${selectedProperty.agent.first_name} ${selectedProperty.agent.last_name}` : 'Non assigne'}</p>
                      <p className="text-xs">{selectedProperty.agent?.email || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Building className="h-4 w-4" />Informations</div>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Type</p><p className="font-medium">{selectedProperty.property_type?.name || 'N/A'}</p></div>
                    <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Transaction</p><p className="font-medium">{selectedProperty.transaction_type || 'N/A'}</p></div>
                    <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Reference</p><p className="font-medium">{selectedProperty.uuid || selectedProperty.id}</p></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Chambres</p><p className="font-medium">{selectedProperty.bedrooms ?? 'N/A'}</p></div>
                      <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Salles d'eau</p><p className="font-medium">{selectedProperty.bathrooms ?? 'N/A'}</p></div>
                      <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Surface</p><p className="font-medium">{selectedProperty.surface_area ?? 'N/A'}</p></div>
                      <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Etages</p><p className="font-medium">{selectedProperty.floor_number ?? 'N/A'}</p></div>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4" />Dates</div>
                  <div className="text-sm text-[rgba(15,42,46,0.7)] space-y-2">
                    <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Creation</p><p className="font-medium">{selectedProperty.created_at ? new Date(selectedProperty.created_at).toLocaleString('fr-FR') : 'N/A'}</p></div>
                    <div><p className="text-xs text-[rgba(15,42,46,0.45)]">Derniere mise a jour</p><p className="font-medium">{selectedProperty.updated_at ? new Date(selectedProperty.updated_at).toLocaleString('fr-FR') : 'N/A'}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyManagement;
