import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { Save, Plus, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

const AgentConstructionPublications = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    surface_area: '',
    location: '',
    city: '',
  });

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getConstructionPublications();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError('Impossible de charger vos projets.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageFiles = (event) => {
    setImageFiles(Array.from(event.target.files || []));
  };

  const handlePlanFiles = (event) => {
    setPlanFiles(Array.from(event.target.files || []));
  };

  const handleRender3DFiles = (event) => {
    setRender3DFiles(Array.from(event.target.files || []));
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
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
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
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
    const hasFiles = imageFiles.length > 0 || planFiles.length > 0 || render3DFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      imageFiles.forEach((file) => requestData.append('images[]', file));
      planFiles.forEach((file) => requestData.append('plans[]', file));
      render3DFiles.forEach((file) => requestData.append('render_3d[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await agentService.updateConstructionPublication(editingProject.uuid, requestData);
      } else {
        await agentService.createConstructionPublication(requestData);
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

  const statusChip = (status) => {
    if (status === 'published') {
      return { label: 'Publie', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'rejected') {
      return { label: 'Rejete', icon: <XCircle className="h-3 w-3" />, className: 'bg-rose-100 text-rose-700' };
    }
    return { label: 'En attente', icon: <ImageIcon className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' };
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent constructeur</p>
              <h1 className="text-3xl font-semibold mt-3">Publications construction</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Creez vos projets, ils seront valides par l'administration.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Images standards</label>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Plans de construction</label>
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Representations 3D</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleRender3DFiles}
                    className="w-full text-sm"
                  />
                  {render3DFiles.length > 0 && (
                    <p className="text-xs text-[rgba(15,42,46,0.5)] mt-2">
                      {render3DFiles.length} visuel(s) 3D selectionne(s)
                    </p>
                  )}
                </div>
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

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Mes projets</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const chip = statusChip(project.status);
                    return (
                      <div key={project.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.title || 'Projet construction'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} | Budget {project.budget_min ? Number(project.budget_min).toLocaleString() : 'N/A'}
                          </p>
                          {project.status === 'rejected' && project.rejection_reason && (
                            <p className="text-xs text-[rgb(var(--clay))]">Motif: {project.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${chip.className}`}>
                            {chip.icon}
                            {chip.label}
                          </span>
                          <button onClick={() => handleEdit(project)} className="btn-ghost">
                            Modifier
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentConstructionPublications;
