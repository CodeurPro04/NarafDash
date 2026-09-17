import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, propertyTypeService } from '../../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Building,
  Sparkles,
  Sofa,
  ShieldCheck,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const FEATURE_CATEGORIES = [
  { value: 'confort', label: 'Confort', icon: Sofa, className: 'bg-blue-100 text-blue-700' },
  { value: 'securite', label: 'Sécurité', icon: ShieldCheck, className: 'bg-amber-100 text-amber-700' },
  { value: 'equipements', label: 'Équipements', icon: Wrench, className: 'bg-emerald-100 text-emerald-700' },
];

const categoryInfo = (value) =>
  FEATURE_CATEGORIES.find((cat) => cat.value === value) || {
    label: value || 'Autre',
    className: 'bg-slate-100 text-slate-700',
    icon: Sparkles,
  };

const AdminPropertyCatalog = () => {
  const [types, setTypes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [newType, setNewType] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');

  const [newFeature, setNewFeature] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState('equipements');
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState('all');
  const [editingFeatureId, setEditingFeatureId] = useState(null);
  const [editingFeatureName, setEditingFeatureName] = useState('');
  const [editingFeatureCategory, setEditingFeatureCategory] = useState('equipements');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadCatalog();
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3000);
  };

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

  const filteredTypes = useMemo(() => {
    const term = typeSearch.trim().toLowerCase();
    if (!term) return types;
    return types.filter((type) => (type.name || '').toLowerCase().includes(term));
  }, [types, typeSearch]);

  const filteredFeatures = useMemo(() => {
    const term = featureSearch.trim().toLowerCase();
    return features.filter((feature) => {
      const matchesCategory = featureCategoryFilter === 'all' || feature.category === featureCategoryFilter;
      const matchesSearch = !term || (feature.name || '').toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [features, featureSearch, featureCategoryFilter]);

  const featureCounts = useMemo(() => {
    const counts = { confort: 0, securite: 0, equipements: 0 };
    features.forEach((feature) => {
      if (counts[feature.category] !== undefined) counts[feature.category] += 1;
    });
    return counts;
  }, [features]);

  const handleCreateType = async () => {
    if (!newType.trim()) return;
    try {
      await adminService.createPropertyType({ name: newType.trim() });
      setNewType('');
      showNotice('Type de bien ajoute.');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la creation du type:', err);
      setError(extractErrorMessage(err, 'Impossible de creer le type.'));
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeature.trim()) return;
    try {
      await adminService.createPropertyFeature({ name: newFeature.trim(), category: newFeatureCategory });
      setNewFeature('');
      showNotice('Caracteristique ajoutee.');
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

  const cancelEditType = () => {
    setEditingTypeId(null);
    setEditingTypeName('');
  };

  const startEditFeature = (feature) => {
    setEditingFeatureId(feature.id);
    setEditingFeatureName(feature.name || '');
    setEditingFeatureCategory(feature.category || 'equipements');
  };

  const cancelEditFeature = () => {
    setEditingFeatureId(null);
    setEditingFeatureName('');
  };

  const handleUpdateType = async () => {
    if (!editingTypeId || !editingTypeName.trim()) return;
    try {
      await adminService.updatePropertyType(editingTypeId, { name: editingTypeName.trim() });
      setEditingTypeId(null);
      setEditingTypeName('');
      showNotice('Type de bien mis a jour.');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la mise a jour du type:', err);
      setError(extractErrorMessage(err, 'Impossible de mettre a jour le type.'));
    }
  };

  const handleUpdateFeature = async () => {
    if (!editingFeatureId || !editingFeatureName.trim()) return;
    try {
      await adminService.updatePropertyFeature(editingFeatureId, {
        name: editingFeatureName.trim(),
        category: editingFeatureCategory,
      });
      setEditingFeatureId(null);
      setEditingFeatureName('');
      showNotice('Caracteristique mise a jour.');
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
      showNotice('Type de bien supprime.');
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
      showNotice('Caracteristique supprimee.');
      await loadCatalog();
    } catch (err) {
      console.error('Erreur lors de la suppression de la caracteristique:', err);
      setError(extractErrorMessage(err, 'Impossible de supprimer la caracteristique.'));
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">Catalogue immobilier</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Gerez les types de biens et les caracteristiques utilises dans les annonces.
              </p>
            </div>

            {notice && (
              <div className="surface-soft px-4 py-3 text-sm font-medium text-[rgb(var(--ink))] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {notice}
              </div>
            )}
            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="surface-card p-4 sm:p-5 h-[92px] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                  { key: 'types', label: 'Types de biens', value: types.length, icon: Building },
                  { key: 'features', label: 'Caracteristiques', value: features.length, icon: Sparkles },
                  { key: 'confort', label: 'Confort', value: featureCounts.confort, icon: Sofa },
                  { key: 'securite', label: 'Securite', value: featureCounts.securite, icon: ShieldCheck },
                  { key: 'equipements', label: 'Equipements', value: featureCounts.equipements, icon: Wrench },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">{kpi.value}</p>
                      </div>
                      <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]">
                        <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Types de biens */}
                <div className="surface-panel p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Types de biens</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)] mt-0.5">Categories proposees lors de la creation d'une propriete.</p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateType(); } }}
                      placeholder="Nouveau type (ex. Villa, Studio...)"
                      className="flex-1 min-w-0 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                    <button onClick={handleCreateType} disabled={!newType.trim()} className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>

                  {types.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                      <input
                        type="text"
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        placeholder="Rechercher un type..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                      />
                    </div>
                  )}

                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {filteredTypes.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-[rgba(15,42,46,0.5)]">
                        {types.length === 0 ? 'Aucun type de bien cree.' : 'Aucun type ne correspond a cette recherche.'}
                      </div>
                    ) : (
                      filteredTypes.map((type) => (
                        <div key={type.id} className="surface-soft rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                          {editingTypeId === type.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                autoFocus
                                value={editingTypeName}
                                onChange={(e) => setEditingTypeName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateType(); } if (e.key === 'Escape') cancelEditType(); }}
                                className="flex-1 min-w-0 rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                              />
                              <button onClick={handleUpdateType} disabled={!editingTypeName.trim()} className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition shrink-0" title="Enregistrer">
                                <Save className="h-4 w-4" />
                              </button>
                              <button onClick={cancelEditType} className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition shrink-0" title="Annuler">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 shrink-0 rounded-lg bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                                  <Building className="h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                                </div>
                                <span className="text-sm font-medium text-[rgb(var(--ink))] truncate">{type.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => startEditType(type)} title="Modifier" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteType(type.id)} title="Supprimer" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Caracteristiques */}
                <div className="surface-panel p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Caracteristiques</h2>
                    <p className="text-xs text-[rgba(15,42,46,0.55)] mt-0.5">Equipements et atouts selectionnables sur une propriete.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateFeature(); } }}
                      placeholder="Nouvelle caracteristique (ex. Piscine)"
                      className="flex-1 min-w-0 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                    />
                    <select
                      value={newFeatureCategory}
                      onChange={(e) => setNewFeatureCategory(e.target.value)}
                      className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm shrink-0"
                    >
                      {FEATURE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <button onClick={handleCreateFeature} disabled={!newFeature.trim()} className="btn-primary shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                      <input
                        type="text"
                        value={featureSearch}
                        onChange={(e) => setFeatureSearch(e.target.value)}
                        placeholder="Rechercher une caracteristique..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {[{ value: 'all', label: 'Tous' }, ...FEATURE_CATEGORIES].map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFeatureCategoryFilter(cat.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition whitespace-nowrap ${
                            featureCategoryFilter === cat.value
                              ? 'bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]'
                              : 'bg-white/70 text-[rgb(var(--ink))] border-[rgb(var(--line))] hover:border-[rgba(15,42,46,0.4)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {filteredFeatures.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-[rgba(15,42,46,0.5)]">
                        {features.length === 0 ? 'Aucune caracteristique creee.' : 'Aucune caracteristique ne correspond a ces criteres.'}
                      </div>
                    ) : (
                      filteredFeatures.map((feature) => {
                        const info = categoryInfo(feature.category);
                        const Icon = info.icon;
                        return (
                          <div key={feature.id} className="surface-soft rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            {editingFeatureId === feature.id ? (
                              <div className="flex-1 flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingFeatureName}
                                  onChange={(e) => setEditingFeatureName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateFeature(); } if (e.key === 'Escape') cancelEditFeature(); }}
                                  className="flex-1 min-w-[120px] rounded-lg border border-[rgb(var(--line))] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                                />
                                <select
                                  value={editingFeatureCategory}
                                  onChange={(e) => setEditingFeatureCategory(e.target.value)}
                                  className="rounded-lg border border-[rgb(var(--line))] bg-white px-2 py-2 text-sm shrink-0"
                                >
                                  {FEATURE_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                  ))}
                                </select>
                                <button onClick={handleUpdateFeature} disabled={!editingFeatureName.trim()} className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition shrink-0" title="Enregistrer">
                                  <Save className="h-4 w-4" />
                                </button>
                                <button onClick={cancelEditFeature} className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition shrink-0" title="Annuler">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${info.className}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-[rgb(var(--ink))] truncate">{feature.name}</p>
                                    <p className="text-[11px] text-[rgba(15,42,46,0.5)]">{info.label}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={() => startEditFeature(feature)} title="Modifier" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteFeature(feature.id)} title="Supprimer" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
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
