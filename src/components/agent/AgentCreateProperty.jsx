import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService, propertyTypeService, countryService, partnershipLookupService } from '../../services/api';
import { Upload, MapPin, ArrowLeft, Save, LocateFixed, Map as MapIcon, Building, Image, FileWarning, CheckCircle } from 'lucide-react';
import { getTypeRules, resetHiddenFields } from '../../utils/propertyTypeRules';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import { useToast } from '../common/Toast';

const DECIMAL_CHAR_KEYS = ['surface_area', 'land_area'];

const AgentCreateProperty = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uuid } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [countries, setCountries] = useState([]);
  const [partners, setPartners] = useState([]);
  const [images, setImages] = useState([]);
  const [planImages, setPlanImages] = useState([]);
  const [render3DImages, setRender3DImages] = useState([]);
  const [requestInfo] = useState(location.state?.request || null);
  const [formData, setFormData] = useState({
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
    partner_id: '',
    feature_ids: [],
  });

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

  useEffect(() => {
    loadLookupData();
  }, []);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  const loadLookupData = async () => {
    try {
      const [typesRes, featuresRes, countriesRes, partnersRes] = await Promise.all([
        propertyTypeService.getAll(),
        propertyTypeService.getFeatures(),
        countryService.getAll(),
        partnershipLookupService.getApproved('immobilier'),
      ]);
      const typesPayload = extractPayload(typesRes);
      const featuresPayload = extractPayload(featuresRes);
      const countriesPayload = extractPayload(countriesRes);
      const partnersPayload = extractPayload(partnersRes);
      setTypes(Array.isArray(typesPayload) ? typesPayload : typesPayload.data || []);
      setFeatures(Array.isArray(featuresPayload) ? featuresPayload : featuresPayload.data || []);
      setCountries(Array.isArray(countriesPayload) ? countriesPayload : countriesPayload.data || []);
      setPartners(Array.isArray(partnersPayload) ? partnersPayload : partnersPayload.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des donnees de reference:', err);
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
      { label: 'Photos du bien', done: images.length > 0 },
    ];
    activeRules.fields
      .filter((field) => field.required)
      .forEach((field) => {
        items.push({ label: field.label, done: formData[field.key] !== '' && formData[field.key] !== null && formData[field.key] !== undefined });
      });
    return items;
  }, [formData, activeRules, images.length]);

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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
    event.target.value = '';
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlanUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setPlanImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removePlanImage = (index) => {
    setPlanImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRender3DUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setRender3DImages((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeRender3DImage = (index) => {
    setRender3DImages((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (!uuid) {
      setLoading(false);
      toast.error('Demande introuvable.');
      return;
    }

    if (images.length === 0) {
      setLoading(false);
      toast.warning('Veuillez ajouter au moins une image.');
      return;
    }

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'feature_ids') {
          value.forEach((featureId) => payload.append('features[]', featureId));
          return;
        }
        if (value === '' || value === null) {
          return;
        }
        if (key === 'negotiable') {
          payload.append(key, value ? '1' : '0');
          return;
        }
        payload.append(key, value);
      });

      images.forEach((image) => {
        payload.append('images[]', image);
      });
      planImages.forEach((image) => {
        payload.append('plan_images[]', image);
      });
      render3DImages.forEach((image) => {
        payload.append('render_3d_images[]', image);
      });

      await agentService.createPropertyFromRequest(uuid, payload);
      toast.success('Propriete creee avec succes.');
      navigate('/agent/properties');
    } catch (err) {
      console.error('Erreur lors de la creation:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      toast.error(err.response?.data?.message || details || 'Erreur lors de la creation de la propriete.');
    } finally {
      setLoading(false);
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
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/agent/properties')} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div>
                <p className="chip">Agent</p>
                <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-[rgb(var(--ink))]">Creer une propriete</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Remplissez les informations avant validation par l'administration.
                </p>
              </div>
            </div>

            {requestInfo && (
              <div className="surface-panel p-4 text-sm text-[rgba(15,42,46,0.7)]">
                <p className="font-semibold mb-2">Demande du proprietaire</p>
                <p className="whitespace-pre-line">{requestInfo.description}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-wrap items-center justify-end gap-3">
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
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                          placeholder="Ex. Villa moderne avec piscine a Cocody"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Type de bien *</label>
                        <select
                          name="property_type_id"
                          value={formData.property_type_id}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        >
                          <option value="">Selectionner</option>
                          {types.map((type) => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
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
                          <input
                            type="number"
                            step="0.01"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                            min="0"
                            placeholder="0"
                            className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                          <input
                            type="text"
                            name="currency"
                            value={formData.currency}
                            onChange={handleInputChange}
                            className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-[rgba(15,42,46,0.6)] mt-2">
                          <input
                            type="checkbox"
                            name="negotiable"
                            checked={formData.negotiable}
                            onChange={handleInputChange}
                            className="rounded border-[rgb(var(--line))]"
                          />
                          Prix negociable
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Description *</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          placeholder="Decrivez le bien : atouts, environnement, particularites..."
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Commentaire *</label>
                        <textarea
                          name="agent_comment"
                          value={formData.agent_comment}
                          onChange={handleInputChange}
                          required
                          rows={3}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          placeholder="Commentaire interne sur la demande..."
                        />
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
                            <label className="block text-xs text-[rgba(15,42,46,0.6)] mb-1">{field.label}{field.required ? ' *' : ''}</label>
                            <input
                              type="number"
                              step={DECIMAL_CHAR_KEYS.includes(field.key) ? '0.01' : '1'}
                              name={field.key}
                              required={field.required}
                              value={formData[field.key]}
                              onChange={handleInputChange}
                              min="0"
                              className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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
                      <select name="partner_id" value={formData.partner_id} onChange={handleInputChange} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]">
                        <option value="">Partenaire (optionnel)</option>
                        {partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>{partner.company_name}</option>
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
                      <p className="text-sm font-medium">Images standards * <span className="text-[rgba(15,42,46,0.45)] font-normal">({images.length})</span></p>
                      <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                          <Image className="h-5 w-5 text-[rgb(var(--clay))]" />
                        </div>
                        <p className="text-sm font-medium mb-1">Photos principales de la propriete</p>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">JPG, PNG ou WEBP</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="agent-property-image-upload"
                        />
                        <label htmlFor="agent-property-image-upload" className="btn-primary cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Selectionner des photos
                        </label>
                      </div>
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
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePlanUpload}
                          className="hidden"
                          id="agent-plan-image-upload"
                        />
                        <label htmlFor="agent-plan-image-upload" className="btn-ghost cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Ajouter des plans
                        </label>
                      </div>
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
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleRender3DUpload}
                          className="hidden"
                          id="agent-render3d-image-upload"
                        />
                        <label htmlFor="agent-render3d-image-upload" className="btn-ghost cursor-pointer inline-flex">
                          <Upload className="h-4 w-4" />
                          Ajouter des visuels 3D
                        </label>
                      </div>
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

                  <div className="surface-panel p-5 space-y-2.5">
                    <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                      <Save className="h-4 w-4" />
                      {loading ? 'Creation...' : 'Creer la propriete'}
                    </button>
                    <button type="button" onClick={() => navigate('/agent/properties')} className="btn-ghost w-full justify-center">
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentCreateProperty;
