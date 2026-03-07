import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService, publicConstructionService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Trash2, Plus, HardHat, Search } from 'lucide-react';

const ConstructionManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = viewParam === 'create';
  const isListOnlyView = viewParam === 'list';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [pendingPublications, setPendingPublications] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingPlans, setExistingPlans] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, project: null, reason: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    surface_area: '',
    location: '',
    city: '',
  });

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setShowForm(params.get('view') === 'create');
  }, [location.search]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const [publishedRes, pendingRes] = await Promise.all([
        publicConstructionService.getAll(),
        service.getPendingConstructionProjects(),
      ]);
      const publishedPayload = publishedRes?.data?.data ?? publishedRes?.data ?? [];
      const publishedList = publishedPayload.data || publishedPayload;
      setProjects(Array.isArray(publishedList) ? publishedList : []);

      const pendingPayload = pendingRes?.data?.data ?? pendingRes?.data ?? [];
      const pendingList = pendingPayload.data || pendingPayload;
      const publicationPending = Array.isArray(pendingList)
        ? pendingList.filter((item) => item.is_publication)
        : [];
      setPendingPublications(publicationPending);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setImageFiles([]);
    setPlanFiles([]);
    setExistingImages(Array.isArray(project.images_path) ? project.images_path : []);
    setExistingPlans(Array.isArray(project.plans_path) ? project.plans_path : []);
    setShowForm(true);
    setFormData({
      title: project.title || '',
      description: project.description || '',
      budget_min: project.budget_min || '',
      budget_max: project.budget_max || '',
      surface_area: project.surface_area || '',
      location: project.location || '',
      city: project.city || '',
    });
  };

  const resetForm = () => {
    setEditingProject(null);
    setExistingImages([]);
    setImageFiles([]);
    setExistingPlans([]);
    setPlanFiles([]);
    setShowForm(false);
    setFormData({
      title: '',
      description: '',
      budget_min: '',
      budget_max: '',
      surface_area: '',
      location: '',
      city: '',
    });
  };

  const handleImageFiles = (event) => {
    setImageFiles(Array.from(event.target.files || []));
  };

  const handlePlanFiles = (event) => {
    setPlanFiles(Array.from(event.target.files || []));
  };

  const handleRemoveImage = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await service.updateConstructionProject(editingProject.uuid, { remove_images: [path] });
      setExistingImages((prev) => prev.filter((item) => item !== path));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'image:", err);
      setError("Erreur lors de la suppression de l'image.");
    }
  };

  const handleRemovePlan = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce plan ?')) return;
    try {
      await service.updateConstructionProject(editingProject.uuid, { remove_plans: [path] });
      setExistingPlans((prev) => prev.filter((item) => item !== path));
    } catch (err) {
      console.error("Erreur lors de la suppression du plan:", err);
      setError("Erreur lors de la suppression du plan.");
    }
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
    };
    const hasFiles = imageFiles.length > 0 || planFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      imageFiles.forEach((file) => requestData.append('images[]', file));
      planFiles.forEach((file) => requestData.append('plans[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await service.updateConstructionProject(editingProject.uuid, requestData);
      } else {
        await service.createConstructionProject(requestData);
      }
      await loadProjects();
      resetForm();
    } catch (err) {
      console.error('Erreur enregistrement:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (!project?.uuid) return;
    if (!window.confirm('Supprimer ce projet ?')) return;
    try {
      await service.deleteConstructionProject(project.uuid);
      await loadProjects();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const getCoverImage = (project) => {
    const images = Array.isArray(project?.images_path) ? project.images_path : [];
    if (images.length === 0) return '';
    return getStorageUrl(images[0]);
  };
  const filteredProjects = useMemo(() => {
    const term = listSearchTerm.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) => (
      (project.title || '').toLowerCase().includes(term)
      || (project.city || '').toLowerCase().includes(term)
      || (project.location || '').toLowerCase().includes(term)
      || String(project.surface_area || '').toLowerCase().includes(term)
    ));
  }, [projects, listSearchTerm]);

  const handleApprovePublication = async (project) => {
    if (!project?.uuid) return;
    try {
      await service.updateConstructionProject(project.uuid, { status: 'published' });
      await loadProjects();
    } catch (err) {
      console.error('Erreur approbation:', err);
      setError('Erreur lors de l\'approbation.');
    }
  };

  const handleRejectPublication = async (project) => {
    if (!project?.uuid) return;
    setRejectModal({ open: true, project, reason: '' });
  };
  const handleViewProject = (project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const confirmReject = async () => {
    if (!rejectModal.project?.uuid) return;
    if (!rejectModal.reason.trim()) {
      alert('Motif obligatoire.');
      return;
    }
    try {
      await service.updateConstructionProject(rejectModal.project.uuid, {
        status: 'rejected',
        rejection_reason: rejectModal.reason.trim(),
      });
      setRejectModal({ open: false, project: null, reason: '' });
      await loadProjects();
    } catch (err) {
      console.error('Erreur rejet:', err);
      setError('Erreur lors du rejet.');
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
              <p className="chip">{roleLabel}</p>
              <h1 className="text-3xl font-semibold mt-3">
                {isCreateOnlyView ? 'Ajout de projet de construction' : 'Liste des projets de construction'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? 'Renseignez uniquement le formulaire d’ajout du projet de construction.'
                  : 'Consultez uniquement la liste des projets de construction.'}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {!isCreateOnlyView && !isListOnlyView && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Gestion des projets</h2>
                <p className="text-sm text-[rgba(15,42,46,0.6)]">
                  Ajoutez des projets et suivez les validations.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? 'Fermer le formulaire' : 'Ajouter un projet'}
              </button>
            </div>
            )}

            {showForm && (
              <form onSubmit={handleSubmit} className="surface-panel p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {editingProject ? 'Modifier un projet' : 'Nouveau projet'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Titre</label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Budget min</label>
                  <input
                    type="number"
                    name="budget_min"
                    value={formData.budget_min}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Budget max</label>
                  <input
                    type="number"
                    name="budget_max"
                    value={formData.budget_max}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Surface (m2)</label>
                  <input
                    type="number"
                    name="surface_area"
                    value={formData.surface_area}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ville</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Localisation</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Images (fichiers)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageFiles}
                    className="w-full text-sm"
                  />
                  {imageFiles.length > 0 && (
                    <p className="text-xs text-[rgba(15,42,46,0.5)] mt-2">
                      {imageFiles.length} image(s) selectionnee(s)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Plans de construction (fichiers)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handlePlanFiles}
                    className="w-full text-sm"
                  />
                  {planFiles.length > 0 && (
                    <p className="text-xs text-[rgba(15,42,46,0.5)] mt-2">
                      {planFiles.length} plan(s) selectionne(s)
                    </p>
                  )}
                </div>
                {existingImages.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium mb-2">Apercu images existantes</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {existingImages.map((path) => (
                        <div key={path} className="rounded-xl border border-[rgb(var(--line))] bg-white/70 p-2 space-y-2">
                          <img
                            src={getStorageUrl(path)}
                            alt="Image projet"
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          <button type="button" className="btn-ghost text-[rgb(var(--clay))] w-full" onClick={() => handleRemoveImage(path)}>
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {existingPlans.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium mb-2">Plans existants</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {existingPlans.map((path) => (
                        <div key={path} className="rounded-xl border border-[rgb(var(--line))] bg-white/70 p-2 space-y-2">
                          {path.toLowerCase().endsWith('.pdf') ? (
                            <a
                              href={getStorageUrl(path)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[rgb(var(--ink))] hover:underline break-words"
                            >
                              {path.split('/').pop()}
                            </a>
                          ) : (
                            <img
                              src={getStorageUrl(path)}
                              alt="Plan"
                              className="h-24 w-full object-cover rounded-lg"
                            />
                          )}
                          <button type="button" className="btn-ghost text-[rgb(var(--clay))] w-full" onClick={() => handleRemovePlan(path)}>
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            )}

            {!isCreateOnlyView && !isListOnlyView && (
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets en attente d'approbation</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingPublications.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
              ) : (
                <div className="space-y-3">
                  {pendingPublications.map((project) => (
                    <div key={project.uuid} className="surface-soft px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{project.title}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          {project.city || project.location || 'Localisation'} | {project.status || 'submitted'}
                        </p>
                        {project.rejection_reason && (
                          <p className="text-xs text-[rgb(var(--clay))]">Motif: {project.rejection_reason}</p>
                        )}
                      </div>
                      {['submitted', 'pending'].includes(project.status || 'submitted') && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprovePublication(project)} className="btn-primary">Approuver</button>
                          <button onClick={() => handleRejectPublication(project)} className="btn-ghost text-[rgb(var(--clay))]">Rejeter</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {!isCreateOnlyView && (
            <div className="surface-panel p-5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher un projet de construction..."
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>
            )}

            {!isCreateOnlyView && (
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets de construction</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredProjects.map((project) => (
                    <div key={project.uuid} className="surface-panel p-5">
                      <div className="flex gap-4">
                        <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {getCoverImage(project) ? (
                            <img
                              src={getCoverImage(project)}
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <HardHat className="h-8 w-8 text-[rgba(15,42,46,0.4)]" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-semibold">{project.title || 'Projet construction'}</h3>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            {project.city || project.location || 'Localisation'}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            Budget: {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                            {project.budget_max ? ` - ${Number(project.budget_max).toLocaleString()}` : ''}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            Surface: {project.surface_area ? `${project.surface_area} m2` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => handleViewProject(project)} className="btn-ghost flex-1">Details</button>
                        <button onClick={() => handleEdit(project)} className="btn-ghost flex-1">Modifier</button>
                        <button onClick={() => handleDelete(project)} className="btn-ghost text-[rgb(var(--clay))] flex-1">
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        </main>
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-xl p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Refuser le projet</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)]">Motif obligatoire.</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Motif du rejet</label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                rows="4"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectModal({ open: false, project: null, reason: '' })} className="btn-ghost">Annuler</button>
              <button onClick={confirmReject} className="btn-primary">Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">{selectedProject.title || 'Projet construction'}</h2>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  {selectedProject.city || selectedProject.location || 'Localisation'}
                </p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="btn-ghost">Fermer</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                  {getCoverImage(selectedProject) ? (
                    <img src={getCoverImage(selectedProject)} alt={selectedProject.title} className="w-full h-72 object-cover" />
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <HardHat className="h-10 w-10 text-[rgba(15,42,46,0.4)]" />
                    </div>
                  )}
                </div>
                <div className="surface-panel p-5 space-y-3">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="text-sm text-[rgba(15,42,46,0.7)]">
                    {selectedProject.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="surface-panel p-5 space-y-4">
                  <h3 className="text-sm font-semibold">Informations</h3>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Budget</p>
                      <p className="font-medium">
                        {selectedProject.budget_min ? Number(selectedProject.budget_min).toLocaleString() : 'N/A'}
                        {selectedProject.budget_max ? ` - ${Number(selectedProject.budget_max).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Surface</p>
                      <p className="font-medium">{selectedProject.surface_area ? `${selectedProject.surface_area} m2` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Statut</p>
                      <p className="font-medium">{selectedProject.status || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                {Array.isArray(selectedProject.plans_path) && selectedProject.plans_path.length > 0 && (
                  <div className="surface-panel p-5 space-y-3">
                    <h3 className="text-sm font-semibold">Plans</h3>
                    <div className="space-y-2">
                      {selectedProject.plans_path.map((path) => (
                        <a
                          key={path}
                          href={getStorageUrl(path)}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-[rgb(var(--ink))] hover:underline"
                        >
                          {path.split('/').pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionManagement;
