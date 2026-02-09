import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ownerService, propertyTypeService } from '../../services/api';
import { Building, Upload, MapPin, Euro, FileText, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddProperty = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    loadLookupData();
  }, []);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

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
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleFeature = (featureId) => {
    setFormData((prev) => ({
      ...prev,
      feature_ids: prev.feature_ids.includes(featureId)
        ? prev.feature_ids.filter((id) => id !== featureId)
        : [...prev.feature_ids, featureId]
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        if (key == 'negotiable') {
          payload.append(key, value ? '1' : '0');
          return;
        }
        payload.append(key, value);
      });

      images.forEach((image) => {
        payload.append('images[]', image);
      });

      await ownerService.createProperty(payload);
      navigate('/owner/properties');
    } catch (error) {
      console.error('Erreur lors de la creation:', error);
      const apiErrors = error.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(error.response?.data?.message || details || 'Erreur lors de la creation de la propriete.');
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
              <button
                onClick={() => navigate('/owner/properties')}
                className="btn-ghost"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div>
                <p className="chip">Espace propriétaire</p>
                <h1 className="text-3xl font-semibold mt-2">Créer une annonce</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Renseignez les informations clés pour publier votre bien.
                </p>
              </div>
            </div>
            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="surface-panel p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informations générales
                </h2>

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
                      placeholder="Appartement moderne 3 pièces"
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
                      <option value="">Sélectionner</option>
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
                      Prix négociable
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
                    placeholder="Décrivez votre propriété..."
                  />
                </div>
              </div>

              <div className="surface-panel p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Caractéristiques
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Surface (m²)', name: 'surface_area' },
                    { label: 'Terrain (m²)', name: 'land_area' },
                    { label: 'Chambres', name: 'bedrooms' },
                    { label: 'Salles de bain', name: 'bathrooms' },
                    { label: 'Parking', name: 'parking_spaces' },
                    { label: 'Étage', name: 'floor_number' },
                    { label: 'Étages total', name: 'total_floors' },
                    { label: 'Année', name: 'year_built' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="block text-xs text-[rgba(15,42,46,0.6)] mb-1">{field.label}</label>
                      <input
                        type="number"
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-panel p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Localisation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Adresse *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Ville *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Commune</label>
                    <input
                      type="text"
                      name="commune"
                      value={formData.commune}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quartier</label>
                    <input
                      type="text"
                      name="quartier"
                      value={formData.quartier}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="surface-panel p-6 space-y-6">
                <h2 className="text-lg font-semibold">Équipements</h2>
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

              <div className="surface-panel p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Photos de la propriété
                </h2>
                <div className="border-2 border-dashed border-[rgb(var(--line))] rounded-xl p-8 text-center">
                  <Upload className="h-10 w-10 text-[rgba(15,42,46,0.4)] mx-auto mb-3" />
                  <p className="text-sm text-[rgba(15,42,46,0.6)] mb-4">
                    Glissez-déposez vos photos ici ou cliquez pour sélectionner
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
                    Sélectionner des photos
                  </label>
                </div>

                {images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Photos sélectionnées ({images.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((image, index) => (
                        <div key={`${image.name}-${index}`} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => navigate('/owner/properties')} className="btn-ghost">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Création...' : (
                    <>
                      <Save className="h-4 w-4" />
                      Créer la propriété
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

export default AddProperty;
