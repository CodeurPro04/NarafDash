import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, propertyTypeService } from '../../services/api';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';

const AdminPropertyCatalog = () => {
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newType, setNewType] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState(null);
  const [editingFeatureName, setEditingFeatureName] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setError('');
      const [typesRes, featuresRes] = await Promise.all([
        propertyTypeService.getAll(),
        propertyTypeService.getFeatures(),
      ]);
      const typesPayload = extractPayload(typesRes);
      const featuresPayload = extractPayload(featuresRes);
      setTypes(Array.isArray(typesPayload) ? typesPayload : typesPayload.data || []);
      setFeatures(Array.isArray(featuresPayload) ? featuresPayload : featuresPayload.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement du catalogue:', err);
      setError(err.response?.data?.message || 'Impossible de charger le catalogue.');
    } finally {
      setLoading(false);
    }
  };

  const extractErrorMessage = (err, fallback) => {
    const apiErrors = err.response?.data?.errors;
    if (apiErrors?.name?.length) {
      const raw = apiErrors.name.join(' ');
      if (raw.includes('has already been taken')) {
        return 'Ce nom existe deja.';
      }
      return raw;
    }
    const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
    if (details.includes('has already been taken')) {
      return 'Ce nom existe deja.';
    }
    return err.response?.data?.message || details || fallback;
  };

  const handleCreateType = async () => {
    if (!newType.trim()) return;
    try {
      await adminService.createPropertyType({ name: newType.trim() });
      setNewType('');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la creation du type:', err);
      setError(extractErrorMessage(err, 'Impossible de creer le type.'));
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeature.trim()) return;
    try {
      await adminService.createPropertyFeature({ name: newFeature.trim() });
      setNewFeature('');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la creation de la caracteristique:', err);
      setError(extractErrorMessage(err, 'Impossible de creer la caracteristique.'));
    }
  };

  const startEditType = (type) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name || '');
  };

  const startEditFeature = (feature) => {
    setEditingFeatureId(feature.id);
    setEditingFeatureName(feature.name || '');
  };

  const handleUpdateType = async () => {
    if (!editingTypeId) return;
    try {
      await adminService.updatePropertyType(editingTypeId, { name: editingTypeName.trim() });
      setEditingTypeId(null);
      setEditingTypeName('');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la mise a jour du type:', err);
      setError(extractErrorMessage(err, 'Impossible de mettre a jour le type.'));
    }
  };

  const handleUpdateFeature = async () => {
    if (!editingFeatureId) return;
    try {
      await adminService.updatePropertyFeature(editingFeatureId, { name: editingFeatureName.trim() });
      setEditingFeatureId(null);
      setEditingFeatureName('');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la mise a jour de la caracteristique:', err);
      setError(extractErrorMessage(err, 'Impossible de mettre a jour la caracteristique.'));
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm('Supprimer ce type ?')) return;
    try {
      await adminService.deletePropertyType(id);
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la suppression du type:', err);
      setError(extractErrorMessage(err, 'Impossible de supprimer le type.'));
    }
  };

  const handleDeleteFeature = async (id) => {
    if (!window.confirm('Supprimer cette caracteristique ?')) return;
    try {
      await adminService.deletePropertyFeature(id);
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la suppression de la caracteristique:', err);
      setError(extractErrorMessage(err, 'Impossible de supprimer la caracteristique.'));
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-3xl font-semibold mt-3">Catalogue immobilier</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Gere les types de biens et les caracteristiques.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface-panel p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Types de biens</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      placeholder="Ajouter un type"
                      className="flex-1 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <button onClick={handleCreateType} className="btn-primary">
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>

                  <div className="space-y-3">
                    {types.map((type) => (
                      <div key={type.id} className="surface-soft px-4 py-3 flex items-center justify-between">
                        {editingTypeId === type.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingTypeName}
                              onChange={(e) => setEditingTypeName(e.target.value)}
                              className="flex-1 rounded-lg border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm"
                            />
                            <button onClick={handleUpdateType} className="btn-ghost">
                              <Save className="h-4 w-4" />
                              Sauver
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium">{type.name}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEditType(type)} className="btn-ghost">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteType(type.id)} className="btn-ghost">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Caracteristiques</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Ajouter une caracteristique"
                      className="flex-1 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2 text-sm"
                    />
                    <button onClick={handleCreateFeature} className="btn-primary">
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>

                  <div className="space-y-3">
                    {features.map((feature) => (
                      <div key={feature.id} className="surface-soft px-4 py-3 flex items-center justify-between">
                        {editingFeatureId === feature.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingFeatureName}
                              onChange={(e) => setEditingFeatureName(e.target.value)}
                              className="flex-1 rounded-lg border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm"
                            />
                            <button onClick={handleUpdateFeature} className="btn-ghost">
                              <Save className="h-4 w-4" />
                              Sauver
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium">{feature.name}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEditFeature(feature)} className="btn-ghost">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteFeature(feature.id)} className="btn-ghost">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPropertyCatalog;
