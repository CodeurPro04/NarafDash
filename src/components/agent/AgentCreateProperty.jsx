import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService, propertyTypeService, countryService } from '../../services/api';
import { Upload, MapPin, ArrowLeft, Save, LocateFixed, Map as MapIcon } from 'lucide-react';
import { getTypeRules, resetHiddenFields } from '../../utils/propertyTypeRules';
import { useAddressLocation } from '../../hooks/useAddressLocation';

const AgentCreateProperty = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uuid } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [countries, setCountries] = useState([]);
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
      console.error('Erreur lors du chargement des types:', err);
    }
  };

  const activeRules = useMemo(
    () => getTypeRules(types, formData.property_type_id),
    [types, formData.property_type_id]
  );

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
    const files = Array.from(event.target.files);
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlanUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setPlanImages((prev) => [...prev, ...files]);
  };

  const removePlanImage = (index) => {
    setPlanImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRender3DUpload = (event) => {
    const files = Array.from(event.target.files || []);
    setRender3DImages((prev) => [...prev, ...files]);
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
    setError('');

    if (!uuid) {
      setLoading(false);
      setError('Demande introuvable.');
      return;
    }

    if (images.length === 0) {
      setLoading(false);
      setError('Veuillez ajouter au moins une image.');
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
      navigate('/agent/properties');
    } catch (err) {
      console.error('Erreur lors de la creation:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la creation de la propriete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/agent/properties')} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div>
                <p className="chip">Agent</p>
                <h1 className="text-3xl font-semibold mt-2">Creer une propriete</h1>
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

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
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
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      placeholder="Appartement moderne 3 pieces"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Type de bien *</label>
                    <select
                      name="property_type_id"
                      value={formData.property_type_id}
                      onChange={handleInputChange}
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
                      value={formData.transaction_type}
                      onChange={handleInputChange}
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
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[rgba(15,42,46,0.6)] mt-2">
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
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    placeholder="Decrivez la propriete..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Commentaire *</label>
                  <textarea
                    name="agent_comment"
                    value={formData.agent_comment}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    placeholder="Commentaire interne sur la demande..."
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
                    ℹ️ {activeRules.hint}
                  </p>
                )}

                {activeRules.fields.length === 0 ? (
                  <p className="text-sm text-[rgba(15,42,46,0.4)] italic">
                    Aucune caractéristique spécifique pour ce type de bien.
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
                          value={formData[field.key]}
                          onChange={handleInputChange}
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
                          checked={formData.feature_ids.includes(feature.id)}
                          onChange={() => toggleFeature(feature.id)}
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
                <p className="text-sm text-[rgba(15,42,46,0.6)]">
                  Ajoutez les visuels dans cet ordre : <span className="font-medium text-[rgb(var(--ink))]">Images standards *</span>, <span className="font-medium text-[rgb(var(--ink))]">Plans de construction</span> et <span className="font-medium text-[rgb(var(--ink))]">Representations 3D</span>.
                </p>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Images standards *</p>
                    <p className="text-sm text-[rgba(15,42,46,0.6)] mb-4">
                      Ajoutez les photos principales de la propriete.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="btn-primary cursor-pointer inline-flex">
                      Selectionner des photos
                    </label>
                  </div>
                  {renderPreviewGrid(images, removeImage, 'Images standards selectionnees')}
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Plans de construction</p>
                    <p className="text-sm text-[rgba(15,42,46,0.6)] mb-4">
                      Ajoutez des plans ou visuels techniques du projet.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePlanUpload}
                      className="hidden"
                      id="plan-image-upload"
                    />
                    <label htmlFor="plan-image-upload" className="btn-primary cursor-pointer inline-flex">
                      Ajouter des plans
                    </label>
                  </div>
                  {renderPreviewGrid(planImages, removePlanImage, 'Plans selectionnes')}
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                    <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">Representations 3D</p>
                    <p className="text-sm text-[rgba(15,42,46,0.6)] mb-4">
                      Ajoutez les rendus 3D et visuels de projection.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleRender3DUpload}
                      className="hidden"
                      id="render3d-image-upload"
                    />
                    <label htmlFor="render3d-image-upload" className="btn-primary cursor-pointer inline-flex">
                      Ajouter des visuels 3D
                    </label>
                  </div>
                  {renderPreviewGrid(render3DImages, removeRender3DImage, 'Visuels 3D selectionnes')}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => navigate('/agent/properties')} className="btn-ghost">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Creation...' : (
                    <>
                      <Save className="h-4 w-4" />
                      Creer la propriete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentCreateProperty;
