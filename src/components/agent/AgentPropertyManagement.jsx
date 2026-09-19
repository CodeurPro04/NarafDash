import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService, propertyTypeService, countryService } from '../../services/api';
import { Building, Search, Eye, MapPin, Banknote, User, Calendar, Image, Edit, Upload, Save, LocateFixed, Map as MapIcon } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { useAuth } from '../../contexts/AuthContext';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import { getTypeRules, resetHiddenFields } from '../../utils/propertyTypeRules';

const AgentPropertyManagement = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [countries, setCountries] = useState([]);
  const [images, setImages] = useState([]);
  const [planImages, setPlanImages] = useState([]);
  const [render3DImages, setRender3DImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [existingPlanImages, setExistingPlanImages] = useState([]);
  const [existingRender3DImages, setExistingRender3DImages] = useState([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    agent_comment: '',
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
    country_id: '',
    feature_ids: [],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const locationPicker = useAddressLocation({
    onResolved: ({ address, city, lat, lng }) => {
      setEditForm((prev) => ({
        ...prev,
        address,
        city: prev.city || city,
        latitude: Number.isFinite(lat) ? lat : prev.latitude,
        longitude: Number.isFinite(lng) ? lng : prev.longitude,
      }));
    },
  });

  const activeRules = useMemo(
    () => getTypeRules(types, editForm.property_type_id),
    [types, editForm.property_type_id]
  );

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProperties();
    loadLookupData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchTerm(query);
  }, [location.search]);

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
    } catch (err) {
      console.error('Erreur lors du chargement des donnees de reference:', err);
    }
  };

  const loadProperties = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await agentService.getAllProperties();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProperties(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur lors du chargement des proprietes:', err);
      setError(err.response?.data?.message || 'Impossible de charger les proprietes.');
      setProperties([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const address = (property.address || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const normalizedStatus = property.status === 'rejected' ? 'draft' : property.status;
      const matchesSearch = title.includes(searchLower) || address.includes(searchLower) || city.includes(searchLower);
      const matchesStatus = filterStatus === 'all' || normalizedStatus === filterStatus;
      const matchesType = filterType === 'all' || property.transaction_type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [properties, searchTerm, filterStatus, filterType]);

  const statusBadge = (status) => {
    const normalized = status === 'rejected' ? 'draft' : status;
    switch (normalized) {
      case 'approved':
        return { label: 'Approuvee', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700' };
      case 'pending':
        return { label: 'En attente', className: 'border-amber-500/30 bg-amber-500/15 text-amber-700' };
      case 'draft':
        return { label: 'Brouillon', className: 'border-slate-500/30 bg-slate-500/15 text-slate-700' };
      default:
        return { label: status || 'Inconnu', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-700' };
    }
  };

  const getMediaCandidate = (media) => (
    media?.url
    || media?.file_path
    || media?.public_url
    || media?.secure_url
    || ''
  );

  const getPropertyImage = (property) => (
    getMediaCandidate(property?.primary_image || property?.primaryImage)
    || getMediaCandidate(property?.media?.[0])
  );

  const handleViewProperty = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  const canEditProperty = (property) => (
    property?.agent_id && user?.id && String(property.agent_id) === String(user.id)
  );

  const openEditModal = (property) => {
    if (!canEditProperty(property)) {
      alert('Vous pouvez modifier uniquement les proprietes qui vous sont assignees.');
      return;
    }
    setEditingProperty(property);
    setEditError('');
    setImages([]);
    setPlanImages([]);
    setRender3DImages([]);
    const media = Array.isArray(property.media) ? property.media : [];
    setExistingImages(media.filter((item) => !item.category || item.category === 'standard'));
    setExistingPlanImages(media.filter((item) => item.category === 'plan'));
    setExistingRender3DImages(media.filter((item) => item.category === 'three_d'));
    setEditForm({
      title: property.title || '',
      description: property.description || '',
      agent_comment: property.agent_comment || '',
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
      country_id: property.country_id || property.country?.id || '',
      feature_ids: Array.isArray(property.features) ? property.features.map((feature) => feature.id) : [],
    });
    locationPicker.reset();
  };

  const handleEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'property_type_id') {
      const newRules = getTypeRules(types, value);
      setEditForm((prev) => resetHiddenFields(newRules, {
        ...prev,
        property_type_id: value,
        feature_ids: newRules.showFeatures ? prev.feature_ids : [],
      }));
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleEditFeature = (featureId) => {
    setEditForm((prev) => ({
      ...prev,
      feature_ids: prev.feature_ids.includes(featureId)
        ? prev.feature_ids.filter((id) => id !== featureId)
        : [...prev.feature_ids, featureId],
    }));
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setImages((prev) => [...prev, ...files]);
  };
  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const handlePlanUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setPlanImages((prev) => [...prev, ...files]);
  };
  const removePlanImage = (index) => setPlanImages((prev) => prev.filter((_, i) => i !== index));

  const handleRender3DUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setRender3DImages((prev) => [...prev, ...files]);
  };
  const removeRender3DImage = (index) => setRender3DImages((prev) => prev.filter((_, i) => i !== index));

  const renderPreviewGrid = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={`${label} ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const handleRemoveExistingMedia = async (mediaItem, categorySetter) => {
    if (!mediaItem?.id) return;
    if (!window.confirm('Supprimer ce visuel ?')) return;
    try {
      await agentService.deletePropertyMedia(mediaItem.id);
      categorySetter((prev) => prev.filter((item) => item.id !== mediaItem.id));
    } catch (removeError) {
      console.error('Erreur suppression media:', removeError);
      setEditError(removeError.response?.data?.message || 'Erreur lors de la suppression du visuel.');
    }
  };

  const renderExistingMediaGrid = (mediaItems, categorySetter, label) => (
    mediaItems.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} existants ({mediaItems.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div key={item.id} className="relative">
              <SecureImage
                src={resolveMediaUrl(item.file_path)}
                alt={label}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveExistingMedia(item, categorySetter)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const handleSaveEdit = async () => {
    if (!editingProperty?.uuid) return;
    if (existingImages.length === 0 && images.length === 0) {
      setEditError('La propriete doit conserver au moins une image.');
      return;
    }
    try {
      setSavingEdit(true);
      setEditError('');
      const payload = new FormData();
      Object.entries(editForm).forEach(([key, value]) => {
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

      await agentService.updateProperty(editingProperty.uuid, payload);
      setEditingProperty(null);
      await loadProperties({ silent: true });
    } catch (err) {
      console.error('Erreur lors de la mise a jour:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setEditError(err.response?.data?.message || details || 'Erreur lors de la mise a jour.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Proprietes</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Visualisez toutes les annonces et mettez-les a jour.
              </p>
            </div>

            <div className="surface-panel p-5 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher par titre ou localisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous types</option>
                <option value="vente">Vente</option>
                <option value="location">Location</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous statuts</option>
                <option value="approved">Approuvees</option>
                <option value="pending">En attente</option>
                <option value="draft">Brouillons</option>
              </select>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : error ? (
              <div className="surface-panel p-6 text-sm text-[rgb(var(--clay))]">{error}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProperties.map((property) => (
                  <div key={property.uuid || property.id} className="surface-panel p-5">
                    <div className="flex gap-4">
                      <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                        {getPropertyImage(property) ? (
                          <SecureImage
                            src={resolveMediaUrl(getPropertyImage(property))}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building className="h-8 w-8 text-[rgba(15,42,46,0.4)]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{property.title || 'Titre non defini'}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(property.status).className}`}>
                                {statusBadge(property.status).label}
                              </span>
                              {canEditProperty(property) ? (
                                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  Assignee a vous
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-700">
                                  Lecture seule
                                </span>
                              )}
                              {property.transaction_type && (
                                <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">
                                  {property.transaction_type}
                                </span>
                              )}
                              {property.property_type?.name && (
                                <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">
                                  {property.property_type.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[rgba(15,42,46,0.6)]">
                          <div>
                            <span className="text-[rgba(15,42,46,0.4)]">Proprietaire: </span>
                            {property.user?.first_name} {property.user?.last_name}
                          </div>
                          <div>
                            <span className="text-[rgba(15,42,46,0.4)]">Agent: </span>
                            {property.agent ? `${property.agent.first_name} ${property.agent.last_name}` : 'Non assigne'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {property.address || 'Adresse inconnue'}, {property.city || 'Ville'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'FCFA'}` : 'Prix non defini'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <button onClick={() => handleViewProperty(property)} className="btn-ghost flex-1">
                        <Eye className="h-4 w-4" />
                        Details
                      </button>
                      <button
                        onClick={() => openEditModal(property)}
                        className={`btn-ghost flex-1 ${canEditProperty(property) ? '' : 'cursor-not-allowed border-[rgba(15,42,46,0.08)] bg-[rgba(15,42,46,0.06)] text-[rgba(15,42,46,0.35)] hover:border-[rgba(15,42,46,0.08)] hover:bg-[rgba(15,42,46,0.06)] hover:text-[rgba(15,42,46,0.35)]'}`}
                        disabled={!canEditProperty(property)}
                        aria-disabled={!canEditProperty(property)}
                        title={!canEditProperty(property) ? 'Cette propriete est en lecture seule.' : 'Modifier la propriete'}
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredProperties.length === 0 && (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucune propriete trouvee.
              </div>
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
                  <h2 className="text-2xl font-semibold">{selectedProperty.title || 'Propriete'} </h2>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(selectedProperty.status).className}`}>
                    {statusBadge(selectedProperty.status).label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedProperty.address || 'Adresse inconnue'}, {selectedProperty.city || 'Ville'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    {selectedProperty.price ? `${Number(selectedProperty.price).toLocaleString()} ${selectedProperty.currency || 'FCFA'}` : 'Prix non defini'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="btn-ghost">Fermer</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                  {getPropertyImage(selectedProperty) ? (
                    <SecureImage
                      src={resolveMediaUrl(getPropertyImage(selectedProperty))}
                      alt={selectedProperty.title}
                      className="w-full h-72 object-cover"
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <Building className="h-10 w-10 text-[rgba(15,42,46,0.4)]" />
                    </div>
                  )}
                </div>

                {Array.isArray(selectedProperty.media) && selectedProperty.media.length > 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedProperty.media.slice(0, 8).map((mediaItem) => (
                      <div key={mediaItem.id || mediaItem.uuid || mediaItem.file_path} className="h-24 rounded-xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                        <SecureImage
                          src={resolveMediaUrl(getMediaCandidate(mediaItem))}
                          alt={selectedProperty.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Image className="h-4 w-4" />
                    Description
                  </div>
                  <p className="text-sm text-[rgba(15,42,46,0.7)]">
                    {selectedProperty.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4" />
                    Contacts
                  </div>
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
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Building className="h-4 w-4" />
                    Informations
                  </div>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Type</p>
                      <p className="font-medium">{selectedProperty.property_type?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Transaction</p>
                      <p className="font-medium">{selectedProperty.transaction_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Reference</p>
                      <p className="font-medium">{selectedProperty.uuid || selectedProperty.id}</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </div>
                  <div className="text-sm text-[rgba(15,42,46,0.7)] space-y-2">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Creation</p>
                      <p className="font-medium">{selectedProperty.created_at ? new Date(selectedProperty.created_at).toLocaleString('fr-FR') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Derniere mise a jour</p>
                      <p className="font-medium">{selectedProperty.updated_at ? new Date(selectedProperty.updated_at).toLocaleString('fr-FR') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingProperty && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="surface-card w-full max-w-5xl p-6 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold">Modifier la propriete</h3>
                <p className="text-sm text-[rgba(15,42,46,0.6)]">Toute modification repasse la propriete en attente de validation.</p>
              </div>
              <button onClick={() => setEditingProperty(null)} className="btn-ghost">Fermer</button>
            </div>

            {editError && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))] mb-6">{editError}</div>
            )}

            <div className="space-y-8">
              <div className="surface-panel p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                  <div>
                    <h2 className="text-lg font-semibold">Informations generales</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre, type de bien et tarification</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Titre *</label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Type de bien *</label>
                    <select
                      name="property_type_id"
                      value={editForm.property_type_id}
                      onChange={handleEditChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    >
                      <option value="">Selectionner</option>
                      {types.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Transaction *</label>
                    <select
                      name="transaction_type"
                      value={editForm.transaction_type}
                      onChange={handleEditChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    >
                      <option value="vente">Vente</option>
                      <option value="location">Location</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Prix *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        name="price"
                        value={editForm.price}
                        onChange={handleEditChange}
                        required
                        className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        name="currency"
                        value={editForm.currency}
                        onChange={handleEditChange}
                        className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.6)] mt-2">
                      <input
                        type="checkbox"
                        name="negotiable"
                        checked={editForm.negotiable}
                        onChange={handleEditChange}
                        className="rounded border-[rgb(var(--line))]"
                      />
                      Prix negociable
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    required
                    rows={4}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Commentaire</label>
                  <textarea
                    name="agent_comment"
                    value={editForm.agent_comment}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    placeholder="Commentaire interne..."
                  />
                </div>
              </div>

              <div className="surface-panel p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                  <div>
                    <h2 className="text-lg font-semibold">Caracteristiques</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Surfaces, pieces et equipements specifiques</p>
                  </div>
                </div>
                {activeRules.hint && (
                  <p className="text-sm text-[rgba(15,42,46,0.6)] bg-[rgba(15,42,46,0.04)] px-4 py-3 rounded-xl">
                    {activeRules.hint}
                  </p>
                )}
                {activeRules.fields.length === 0 ? (
                  <p className="text-sm text-[rgba(15,42,46,0.4)] italic">
                    Aucune caracteristique specifique pour ce type de bien.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {activeRules.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs text-[rgba(15,42,46,0.6)] mb-1">{field.label}</label>
                        <input
                          type="number"
                          name={field.key}
                          required={field.required}
                          value={editForm[field.key]}
                          onChange={handleEditChange}
                          min="0"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm"
                        />
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
                        value={editForm.address}
                        onChange={(event) => { handleEditChange(event); locationPicker.handleInputChange(event.target.value); }}
                        onFocus={() => editForm.address.trim().length >= 3 && locationPicker.fetchSuggestions(editForm.address.trim())}
                        onBlur={() => setTimeout(() => locationPicker.clearSuggestions(), 150)}
                        required
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
                  <input type="text" name="city" value={editForm.city} onChange={handleEditChange} required placeholder="Ville *" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                  <select name="country_id" value={editForm.country_id} onChange={handleEditChange} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]">
                    <option value="">Pays (optionnel)</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>{country.flag ? `${country.flag} ` : ''}{country.name}</option>
                    ))}
                  </select>
                  <input type="text" name="commune" value={editForm.commune} onChange={handleEditChange} placeholder="Commune" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                  <input type="text" name="quartier" value={editForm.quartier} onChange={handleEditChange} placeholder="Quartier" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]" />
                </div>
              </div>

              {activeRules.showFeatures && features.length > 0 && (
                <div className="surface-panel p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">4</div>
                    <h2 className="text-lg font-semibold">Equipements</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {features.map((feature) => (
                      <label key={feature.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.feature_ids.includes(feature.id)}
                          onChange={() => toggleEditFeature(feature.id)}
                          className="rounded border-[rgb(var(--line))]"
                        />
                        {feature.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="surface-panel p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">{activeRules.showFeatures && features.length > 0 ? 5 : 4}</div>
                  <div>
                    <h2 className="text-lg font-semibold">Visuels du projet</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans et rendus 3D</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Images standards *</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="edit-image-upload"
                    />
                    <label htmlFor="edit-image-upload" className="btn-primary cursor-pointer inline-flex">
                      Ajouter des photos
                    </label>
                  </div>
                  {renderExistingMediaGrid(existingImages, setExistingImages, 'Images standards')}
                  {renderPreviewGrid(images, removeImage, 'Nouvelles images')}
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Plans de construction</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePlanUpload}
                      className="hidden"
                      id="edit-plan-image-upload"
                    />
                    <label htmlFor="edit-plan-image-upload" className="btn-primary cursor-pointer inline-flex">
                      Ajouter des plans
                    </label>
                  </div>
                  {renderExistingMediaGrid(existingPlanImages, setExistingPlanImages, 'Plans')}
                  {renderPreviewGrid(planImages, removePlanImage, 'Nouveaux plans')}
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Representations 3D</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleRender3DUpload}
                      className="hidden"
                      id="edit-render3d-image-upload"
                    />
                    <label htmlFor="edit-render3d-image-upload" className="btn-primary cursor-pointer inline-flex">
                      Ajouter des visuels 3D
                    </label>
                  </div>
                  {renderExistingMediaGrid(existingRender3DImages, setExistingRender3DImages, 'Visuels 3D')}
                  {renderPreviewGrid(render3DImages, removeRender3DImage, 'Nouveaux visuels 3D')}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setEditingProperty(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleSaveEdit} className="btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Sauvegarde...' : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPropertyManagement;
