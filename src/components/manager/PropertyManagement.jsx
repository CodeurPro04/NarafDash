import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { managerService, propertyTypeService } from '../../services/api';
import { Building, Search, Eye, MapPin, Banknote, User, Calendar, Image, Plus, Upload, Save } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';

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
};

const PropertyManagement = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = showCreateForm;
  const isListOnlyView = viewParam === 'list' && !showCreateForm;

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProperties();
    loadLookupData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('q') || '');
    setShowCreateForm(params.get('view') === 'create');
  }, [location.search]);

  const loadLookupData = async () => {
    try {
      const [typesRes, featuresRes] = await Promise.all([
        propertyTypeService.getAll(),
        propertyTypeService.getFeatures(),
      ]);
      const typesPayload = extractPayload(typesRes);
      const featuresPayload = extractPayload(featuresRes);
      setTypes(Array.isArray(typesPayload) ? typesPayload : typesPayload.data || []);
      setFeatures(Array.isArray(featuresPayload) ? featuresPayload : featuresPayload.data || []);
    } catch (lookupError) {
      console.error('Erreur chargement referentiels:', lookupError);
    }
  };

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await managerService.getAllProperties();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProperties(Array.isArray(list) ? list : []);
    } catch (loadError) {
      console.error('Erreur chargement proprietes:', loadError);
      setError(loadError.response?.data?.message || 'Impossible de charger les proprietes.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return properties.filter((property) => {
      const normalizedStatus = property.status === 'rejected' ? 'draft' : property.status;
      return (
        ((property.title || '').toLowerCase().includes(searchLower)
          || (property.address || '').toLowerCase().includes(searchLower)
          || (property.city || '').toLowerCase().includes(searchLower))
        && (filterStatus === 'all' || normalizedStatus === filterStatus)
        && (filterType === 'all' || property.transaction_type === filterType)
      );
    });
  }, [properties, searchTerm, filterStatus, filterType]);

  const statusBadge = (status) => {
    const normalized = status === 'rejected' ? 'draft' : status;
    if (normalized === 'approved') return { label: 'Approuvee', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700' };
    if (normalized === 'pending') return { label: 'En attente', className: 'border-amber-500/30 bg-amber-500/15 text-amber-700' };
    if (normalized === 'draft') return { label: 'Brouillon', className: 'border-slate-500/30 bg-slate-500/15 text-slate-700' };
    return { label: normalized || 'Inconnu', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-700' };
  };

  const getMediaCandidate = (media) => media?.url || media?.file_path || media?.public_url || media?.secure_url || '';
  const getPropertyImage = (property) => getMediaCandidate(property?.primary_image || property?.primaryImage) || getMediaCandidate(property?.media?.[0]);

  const resetForm = () => {
    setFormData(initialFormData);
    setImages([]);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
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
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleCreateProperty = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    if (images.length === 0) {
      setSaving(false);
      setError('Veuillez ajouter au moins une image pour creer la propriete.');
      return;
    }

    try {
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
      await managerService.createProperty(payload);
      resetForm();
      setShowCreateForm(false);
      await loadProperties();
    } catch (creationError) {
      console.error('Erreur creation propriete:', creationError);
      const apiErrors = creationError.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(creationError.response?.data?.message || details || 'Impossible de creer la propriete.');
    } finally {
      setSaving(false);
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
      await managerService.updatePropertyStatus(uuid, payload);
      setProperties((prev) => prev.map((property) => (
        property.uuid === uuid ? { ...property, status, rejection_reason: rejectionReason } : property
      )));
    } catch (updateError) {
      console.error('Erreur mise a jour statut:', updateError);
      alert(updateError.response?.data?.message || 'Erreur lors de la mise a jour du statut');
    }
  };

  const renderFeatureSection = () => (
    <div className="surface-panel p-6 space-y-6">
      <h2 className="text-lg font-semibold">Equipements</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((feature) => (
          <label key={feature.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.feature_ids.includes(feature.id)}
              onChange={() => toggleFeature(feature.id)}
              className="rounded border-[rgb(var(--line))]"
            />
            {feature.name}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Gestionnaire</p>
              <h1 className="text-3xl font-semibold mt-3">
                {isCreateOnlyView ? 'Ajouter une propriete' : 'Liste des proprietes'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? "Renseignez les informations necessaires pour creer directement une propriete."
                  : 'Consultez uniquement la liste des proprietes avec les filtres de recherche.'}
              </p>
            </div>

            {error && <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>}

            {!isCreateOnlyView && (
              <div className="surface-panel p-5 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou localisation..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                  />
                </div>
                <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm">
                  <option value="all">Tous types</option>
                  <option value="vente">Vente</option>
                  <option value="location">Location</option>
                </select>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm">
                  <option value="all">Tous statuts</option>
                  <option value="approved">Approuvees</option>
                  <option value="pending">En attente</option>
                  <option value="draft">Brouillons</option>
                </select>
                {!isListOnlyView && (
                  <button type="button" className="btn-primary w-full md:w-auto" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4" />
                    Ajouter une propriete
                  </button>
                )}
              </div>
            )}

            {showCreateForm && (
              <form onSubmit={handleCreateProperty} className="space-y-6">
                <div className="surface-panel p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-5 w-5" />Ajouter une propriete</h2>
                    <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Creez directement une propriete depuis l'espace gestionnaire.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Titre *</label>
                      <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de bien *</label>
                      <select name="property_type_id" value={formData.property_type_id} onChange={handleInputChange} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm">
                        <option value="">Selectionner</option>
                        {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Transaction *</label>
                      <select name="transaction_type" value={formData.transaction_type} onChange={handleInputChange} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm">
                        <option value="vente">Vente</option>
                        <option value="location">Location</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Prix *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" name="price" value={formData.price} onChange={handleInputChange} required className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                        <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.6)] mt-2">
                        <input type="checkbox" name="negotiable" checked={formData.negotiable} onChange={handleInputChange} className="rounded border-[rgb(var(--line))]" />
                        Prix negociable
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} required rows={4} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                  </div>
                </div>

                <div className="surface-panel p-6 space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Building className="h-5 w-5" />Caracteristiques</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['surface_area', 'Surface (m2)'],
                      ['land_area', 'Terrain (m2)'],
                      ['bedrooms', 'Chambres'],
                      ['bathrooms', 'Salles de bain'],
                      ['parking_spaces', 'Parking'],
                      ['floor_number', 'Etage'],
                      ['total_floors', 'Etages total'],
                      ['year_built', 'Annee'],
                    ].map(([name, label]) => (
                      <div key={name}>
                        <label className="block text-xs text-[rgba(15,42,46,0.6)] mb-1">{label}</label>
                        <input type="number" name={name} value={formData[name]} onChange={handleInputChange} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" />Localisation</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} required placeholder="Adresse" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="Ville" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                    <input type="text" name="commune" value={formData.commune} onChange={handleInputChange} placeholder="Commune" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                    <input type="text" name="quartier" value={formData.quartier} onChange={handleInputChange} placeholder="Quartier" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm" />
                  </div>
                </div>

                {renderFeatureSection()}

                <div className="surface-panel p-6 space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="h-5 w-5" />Photos de la propriete</h2>
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm text-[rgba(15,42,46,0.6)] mb-4">Selectionnez au moins une image pour la propriete.</p>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="manager-property-image-upload" />
                    <label htmlFor="manager-property-image-upload" className="btn-primary cursor-pointer inline-flex">Selectionner des photos</label>
                  </div>
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((image, index) => (
                        <div key={`${image.name}-${index}`} className="relative">
                          <img src={URL.createObjectURL(image)} alt={`Photo ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => { resetForm(); setShowCreateForm(false); }} className="btn-ghost">Annuler</button>
                  <button type="submit" disabled={saving} className="btn-primary"><Save className="h-4 w-4" />{saving ? 'Creation...' : 'Creer la propriete'}</button>
                </div>
              </form>
            )}

            {!isCreateOnlyView && (
              <>
                {loading ? (
                  <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredProperties.map((property) => (
                      <div key={property.uuid || property.id} className="surface-panel p-5">
                        <div className="flex gap-4">
                          <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                            {getPropertyImage(property) ? (
                              <SecureImage src={resolveMediaUrl(getPropertyImage(property))} alt={property.title} className="w-full h-full object-cover" />
                            ) : (
                              <Building className="h-8 w-8 text-[rgba(15,42,46,0.4)]" />
                            )}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold">{property.title || 'Titre non defini'}</h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(property.status).className}`}>{statusBadge(property.status).label}</span>
                                {property.transaction_type && <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">{property.transaction_type}</span>}
                                {property.property_type?.name && <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">{property.property_type.name}</span>}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[rgba(15,42,46,0.6)]">
                              <div><span className="text-[rgba(15,42,46,0.4)]">Proprietaire: </span>{property.user?.first_name} {property.user?.last_name}</div>
                              <div><span className="text-[rgba(15,42,46,0.4)]">Agent: </span>{property.agent ? `${property.agent.first_name} ${property.agent.last_name}` : 'Non assigne'}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{property.address || 'Adresse inconnue'}, {property.city || 'Ville'}</div>
                              <div className="flex items-center gap-2"><Banknote className="h-4 w-4" />{property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'FCFA'}` : 'Prix non defini'}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {['pending', 'draft'].includes(property.status) && (
                            <>
                              <button onClick={() => handleStatusUpdate(property.uuid, 'approved')} className="btn-primary flex-1">Approuver</button>
                              <button onClick={() => handleStatusUpdate(property.uuid, 'rejected')} className="btn-ghost flex-1">Rejeter</button>
                            </>
                          )}
                          <button onClick={() => { setSelectedProperty(property); setShowDetailsModal(true); }} className="btn-ghost flex-1"><Eye className="h-4 w-4" />Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredProperties.length === 0 && (
                  <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Aucune propriete trouvee.</div>
                )}
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
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(selectedProperty.status).className}`}>{statusBadge(selectedProperty.status).label}</span>
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
