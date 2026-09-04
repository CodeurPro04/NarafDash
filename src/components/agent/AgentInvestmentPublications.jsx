import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { Save, Plus, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';

const AgentInvestmentPublications = () => {
  const defaultImage =
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    project_type: 'immobilier',
    location: '',
    city: '',
    total_investment: '',
    min_investment: '',
    expected_return: '',
    duration_months: '',
    status: 'open',
    start_date: '',
    end_date: '',
    description: '',
  });

  const apiBase = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getInvestmentPublications();
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

  const handleDocumentFiles = (event) => {
    setDocumentFiles(Array.from(event.target.files || []));
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
    setDocumentFiles([]);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
    setFormData({
      title: project.title || '',
      project_type: project.project_type || 'immobilier',
      location: project.location || '',
      city: project.city || '',
      total_investment: project.total_investment || '',
      min_investment: project.min_investment || '',
      expected_return: project.expected_return || '',
      duration_months: project.duration_months || '',
      status: project.status || 'open',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      description: project.description || '',
    });
  };

  const resetForm = () => {
    setEditingProject(null);
    setDocumentFiles([]);
    setImageFiles([]);
    setPlanFiles([]);
    setRender3DFiles([]);
    setFormData({
      title: '',
      project_type: 'immobilier',
      location: '',
      city: '',
      total_investment: '',
      min_investment: '',
      expected_return: '',
      duration_months: '',
      status: 'open',
      start_date: '',
      end_date: '',
      description: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      ...formData,
      total_investment: formData.total_investment ? Number(formData.total_investment) : null,
      min_investment: formData.min_investment ? Number(formData.min_investment) : null,
      expected_return: formData.expected_return ? Number(formData.expected_return) : null,
      duration_months: formData.duration_months ? Number(formData.duration_months) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    const hasFiles = documentFiles.length > 0 || imageFiles.length > 0 || planFiles.length > 0 || render3DFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      documentFiles.forEach((file) => requestData.append('documents[]', file));
      imageFiles.forEach((file) => requestData.append('images[]', file));
      planFiles.forEach((file) => requestData.append('plans[]', file));
      render3DFiles.forEach((file) => requestData.append('render_3d[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await agentService.updateInvestmentPublication(editingProject.uuid, requestData);
      } else {
        await agentService.createInvestmentPublication(requestData);
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

  const approvalChip = (status) => {
    if (status === 'approved') {
      return { label: 'Approuve', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'rejected') {
      return { label: 'Rejete', icon: <XCircle className="h-3 w-3" />, className: 'bg-rose-100 text-rose-700' };
    }
    return { label: 'En attente', icon: <Clock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' };
  };

  const pendingProjects = projects.filter((project) => (project.approval_status || 'pending') === 'pending');
  const otherProjects = projects.filter((project) => (project.approval_status || 'pending') !== 'pending');

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent investisseur</p>
              <h1 className="text-3xl font-semibold mt-3">Publications investissement</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Vos projets seront valides par l'administration.
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
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    name="project_type"
                    value={formData.project_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  >
                    <option value="immobilier">Immobilier</option>
                    <option value="construction">Construction</option>
                    <option value="renovation">Renovation</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium mb-2">Localisation</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Investissement total</label>
                  <input
                    type="number"
                    name="total_investment"
                    value={formData.total_investment}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ticket minimum</label>
                  <input
                    type="number"
                    name="min_investment"
                    value={formData.min_investment}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rendement attendu (%)</label>
                  <input
                    type="number"
                    name="expected_return"
                    value={formData.expected_return}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duree (mois)</label>
                  <input
                    type="number"
                    name="duration_months"
                    value={formData.duration_months}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de debut</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de fin</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Statut</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  >
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="closed">Ferme</option>
                    <option value="completed">Termine</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Documents</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleDocumentFiles}
                    className="w-full text-sm"
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
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
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
              <h2 className="text-lg font-semibold">En attente d'approbation</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingProjects.map((project) => (
                    <div key={project.uuid} className="surface-soft p-4 flex flex-col lg:flex-row gap-4">
                      <div className="lg:w-56 w-full">
                        <img
                          src={
                            Array.isArray(project.images_path) && project.images_path.length
                              ? getStorageUrl(project.images_path[0])
                              : defaultImage
                          }
                          alt={project.title}
                          className="h-40 w-full rounded-2xl object-cover border border-[rgb(var(--line))]"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-base font-semibold">{project.title || 'Projet investissement'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} · Ticket {project.min_investment ? Number(project.min_investment).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-[rgba(15,42,46,0.6)]">
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Reference</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.reference_code || project.uuid?.slice(0, 10) || 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Surface</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.surface_area ? `${project.surface_area} m2` : 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Rendement</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.expected_return ? `${project.expected_return}%` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 lg:w-44">
                        <span className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                          <Clock className="h-3 w-3" />
                          En attente
                        </span>
                        <button onClick={() => handleEdit(project)} className="btn-ghost">
                          Modifier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Historique des projets</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : otherProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="space-y-3">
                  {otherProjects.map((project) => {
                    const chip = approvalChip(project.approval_status);
                    return (
                      <div key={project.uuid} className="surface-soft px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.title || 'Projet investissement'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {project.city || project.location || 'Localisation'} | Ticket {project.min_investment ? Number(project.min_investment).toLocaleString() : 'N/A'}
                          </p>
                          {project.approval_status === 'rejected' && project.rejection_reason && (
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

export default AgentInvestmentPublications;
