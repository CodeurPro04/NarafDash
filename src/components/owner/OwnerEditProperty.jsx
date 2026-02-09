import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ownerService, propertyTypeService } from '../../services/api';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { Building, Upload, MapPin, Euro, FileText, ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const OwnerEditProperty = () => {
  const navigate = useNavigate();
  const { uuid } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
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

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesRes, featuresRes, propertyRes] = await Promise.all([
        propertyTypeService.getAll(),
        propertyTypeService.getFeatures(),
        ownerService.getProperty(uuid),
      ]);

      const typesPayload = extractPayload(typesRes);
      const featuresPayload = extractPayload(featuresRes);
      const property = extractPayload(propertyRes);

      setTypes(Array.isArray(typesPayload) ? typesPayload : typesPayload.data || []);
      setFeatures(Array.isArray(featuresPayload) ? featuresPayload : featuresPayload.data || []);

      setFormData({
        title: property.title || '',
        description: property.description || '',
        property_type_id: property.property_type_id || '',
        transaction_type: property.transaction_type || 'vente',
        price: property.price || '',
        currency: property.currency || 'XOF',
        negotiable: Boolean(property.negotiable),
        surface_area: property.surface_area || '',
        land_area: property.land_area || '',
        bedrooms: property.bedrooms || '',
        bathrooms: property.bathrooms || '',
        parking_spaces: property.parking_spaces || '',
        floor_number: property.floor_number || '',
        total_floors: property.total_floors || '',
        year_built: property.year_built || '',
        address: property.address || '',
        city: property.city || '',
        commune: property.commune || '',
        quartier: property.quartier || '',
        latitude: property.latitude || '',
        longitude: property.longitude || '',
        feature_ids: (property.features || []).map((feature) => feature.id),
      });

      setExistingMedia(property.media || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
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

  const deleteMedia = async (mediaId) => {
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await ownerService.deletePropertyMedia(mediaId);
      setExistingMedia((prev) => prev.filter((media) => media.id !== mediaId));
    } catch (error) {
      console.error('Erreur lors de la suppression du média:', error);
      alert('Erreur lors de la suppression du média');
    }
  };

  const buildPayload = () => {
    const payload = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'feature_ids') return;
      if (value === '' || value === null || value === undefined) return;
      payload[key] = value;
    });
    if (formData.feature_ids.length > 0) {
      payload.features = formData.feature_ids;
    }
    payload.negotiable = Boolean(formData.negotiable);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ownerService.updateProperty(uuid, buildPayload());
      if (images.length > 0) {
        const mediaPayload = new FormData();
        images.forEach((image) => mediaPayload.append('images[]', image));
        await ownerService.addPropertyImages(uuid, mediaPayload);
      }
      navigate('/owner/properties');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-6 py-8">
            <div className="max-w-7xl mx-auto surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
              Chargement...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/owner/properties')} className="btn-ghost">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div>
                <p className="chip">Espace propriétaire</p>
                <h1 className="text-3xl font-semibold mt-2">Modifier l'annonce</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Mettez à jour les informations de votre bien.
                </p>
              </div>
            </div>

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
                  Photos existantes
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingMedia.map((media) => (
                    <div key={media.id} className="relative">
                      <SecureImage
                        src={resolveMediaUrl(media.public_url || media.secure_url || media.url || media.file_path)}
                        alt={media.file_name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => deleteMedia(media.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs"
                      >
                        <Trash2 className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  ))}
                </div>

                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Ajouter des photos
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
                    id="image-upload-edit"
                  />
                  <label htmlFor="image-upload-edit" className="btn-primary cursor-pointer inline-flex">
                    Sélectionner des photos
                  </label>
                </div>

                {images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-3">Nouvelles photos ({images.length})</p>
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
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Mise à jour...' : (
                    <>
                      <Save className="h-4 w-4" />
                      Enregistrer
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

export default OwnerEditProperty;
