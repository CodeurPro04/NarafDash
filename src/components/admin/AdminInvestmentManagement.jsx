import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Trash2, Plus } from 'lucide-react';

const AdminInvestmentManagement = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, project: null, reason: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, project: null });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    project_type: 'immobilier',
    location: '',
    city: '',
    reference_code: '',
    postal_code: '',
    surface_area: '',
    total_investment: '',
    min_investment: '',
    expected_return: '',
    duration_months: '',
    status: 'open',
    start_date: '',
    end_date: '',
    featured: false,
    documents_path: '',
    images_path: '',
    description: '',
  });

  const projectTypeOptions = [
    { value: 'immobilier', label: 'Immobilier' },
    { value: 'construction', label: 'Construction' },
    { value: 'renovation', label: 'Renovation' },
  ];

  const statusOptions = [
    { value: 'open', label: 'Ouvert' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'closed', label: 'Ferme' },
    { value: 'completed', label: 'Termine' },
  ];
  const defaultImage =
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const getFileName = (path) => (path ? path.split('/').pop() : '');

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';


  const getStatusLabel = (value) => statusOptions.find((item) => item.value == value)?.label || value;
  const getTypeLabel = (value) => projectTypeOptions.find((item) => item.value == value)?.label || value;
  const formatPrice = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'N/A';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const parseList = (value) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const handleDocumentFiles = (event) => {
    setDocumentFiles(Array.from(event.target.files || []));
  };

  const handleImageFiles = (event) => {
    setImageFiles(Array.from(event.target.files || []));
  };
  const handleRemoveDocument = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await service.updateInvestment(editingProject.uuid, { remove_documents: [path] });
      setExistingDocuments((prev) => prev.filter((item) => item != path));
    } catch (err) {
      console.error('Erreur lors de la suppression du document:', err);
      setError('Erreur lors de la suppression du document.');
    }
  };

  const handleRemoveImage = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer cette image ?')) return;
    try {
      await service.updateInvestment(editingProject.uuid, { remove_images: [path] });
      setExistingImages((prev) => prev.filter((item) => item != path));
    } catch (err) {
      console.error("Erreur lors de la suppression de l'image:", err);
      setError("Erreur lors de la suppression de l'image.");
    }
  };



  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await service.getInvestments();
      const payload = response?.data?.data ?? response?.data ?? [];
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur lors du chargement des projets:', err);
      setError('Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setDocumentFiles([]);
    setImageFiles([]);
    setExistingDocuments(Array.isArray(project.documents_path) ? project.documents_path : []);
    setExistingImages(Array.isArray(project.images_path) ? project.images_path : []);
    setShowForm(true);
    setFormData({
      title: project.title || '',
      project_type: project.project_type || 'immobilier',
      location: project.location || '',
      city: project.city || '',
      reference_code: project.reference_code || '',
      postal_code: project.postal_code || '',
      surface_area: project.surface_area ?? '',
      total_investment: project.total_investment || '',
      min_investment: project.min_investment || '',
      expected_return: project.expected_return || '',
      duration_months: project.duration_months || '',
      status: project.status || 'open',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      featured: Boolean(project.featured),
      documents_path: Array.isArray(project.documents_path) ? project.documents_path.join('\n') : '',
      images_path: Array.isArray(project.images_path) ? project.images_path.join('\n') : '',
      description: project.description || '',
    });
  };

  const resetForm = () => {
    setEditingProject(null);
    setDocumentFiles([]);
    setImageFiles([]);
    setExistingDocuments([]);
    setExistingImages([]);
    setShowForm(false);
    setFormData({
      title: '',
      project_type: 'immobilier',
      location: '',
      city: '',
      reference_code: '',
      postal_code: '',
      surface_area: '',
      total_investment: '',
      min_investment: '',
      expected_return: '',
      duration_months: '',
      status: 'open',
      start_date: '',
      end_date: '',
      featured: false,
      documents_path: '',
      images_path: '',
      description: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...formData,
      surface_area: formData.surface_area ? Number(formData.surface_area) : null,
      total_investment: formData.total_investment ? Number(formData.total_investment) : null,
      min_investment: formData.min_investment ? Number(formData.min_investment) : null,
      expected_return: formData.expected_return ? Number(formData.expected_return) : null,
      duration_months: formData.duration_months ? Number(formData.duration_months) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      featured: Boolean(formData.featured),
      documents_path: parseList(formData.documents_path),
      images_path: parseList(formData.images_path),
    };

    const hasFiles = documentFiles.length > 0 || imageFiles.length > 0;
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => requestData.append(`${key}[]`, item));
        } else if (value !== null && value !== undefined) {
          requestData.append(key, value);
        }
      });
      documentFiles.forEach((file) => requestData.append('documents[]', file));
      imageFiles.forEach((file) => requestData.append('images[]', file));
    }

    try {
      if (editingProject?.uuid) {
        await service.updateInvestment(editingProject.uuid, requestData);
      } else {
        await service.createInvestment(requestData);
      }
      await loadProjects();
      resetForm();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    if (!project?.uuid) return;
    if (!window.confirm('Supprimer ce projet ?')) return;
    try {
      await service.deleteInvestment(project.uuid);
      await loadProjects();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const handleApproval = async (project, decision) => {
    if (!project?.uuid) return;
    try {
      if (decision === 'approve') {
        await service.approveInvestment(project.uuid);
      } else {
        setRejectModal({ open: true, project, reason: '' });
        return;
      }
      await loadProjects();
    } catch (err) {
      console.error('Erreur approbation:', err);
      setError('Erreur lors de la mise a jour du statut.');
    }
  };

  const confirmReject = async () => {
    if (!rejectModal.project?.uuid) return;
    if (!rejectModal.reason.trim()) {
      alert('Motif obligatoire.');
      return;
    }
    try {
      await service.rejectInvestment(rejectModal.project.uuid, { rejection_reason: rejectModal.reason.trim() });
      await loadProjects();
      setRejectModal({ open: false, project: null, reason: '' });
    } catch (err) {
      console.error('Erreur approbation:', err);
      setError('Erreur lors de la mise a jour du statut.');
    }
  };

  const approvalBadge = (status) => {
    if (status === 'approved') return { label: 'Approuve', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'rejected') return { label: 'Rejete', className: 'bg-rose-100 text-rose-700' };
    return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
  };

  const pendingProjects = projects.filter((project) => (project.approval_status || 'pending') !== 'approved');
  const publishedProjects = projects.filter((project) => (project.approval_status || 'pending') === 'approved');

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">{roleLabel}</p>
              <h1 className="text-3xl font-semibold mt-3">Investissements</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Creez, publiez et gerez les projets d'investissement.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

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

            {showForm && (
            <form onSubmit={handleSubmit} className="surface-panel p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {editingProject ? 'Modifier un projet' : 'Nouveau projet'}
                </h2>
              </div>
              <div className="grid gap-6">
                <div className="surface-soft p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.6)]">Informations principales</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                        {projectTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
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
                      <label className="block text-sm font-medium mb-2">Reference</label>
                      <input
                        name="reference_code"
                        value={formData.reference_code}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        placeholder="REF-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Code postal</label>
                      <input
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        placeholder="77140"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Surface (m2)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="surface_area"
                        value={formData.surface_area}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
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
                </div>

                <div className="surface-soft p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.6)]">Financement</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prix de vente</label>
                      <input
                        type="number"
                        step="0.01"
                        name="total_investment"
                        value={formData.total_investment}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Investissement minimum</label>
                      <input
                        type="number"
                        step="0.01"
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
                        step="0.01"
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
                        step="1"
                        name="duration_months"
                        value={formData.duration_months}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="surface-soft p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.6)]">Calendrier & statut</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="featured"
                        type="checkbox"
                        name="featured"
                        checked={formData.featured}
                        onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                        className="h-4 w-4 rounded border border-[rgb(var(--line))]"
                      />
                      <label htmlFor="featured" className="text-sm font-medium">Mettre en avant</label>
                    </div>
                  </div>
                </div>

                <div className="surface-soft p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgba(15,42,46,0.6)]">Visuels & documents</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Documents (liens, un par ligne)</label>
                      <textarea
                        name="documents_path"
                        value={formData.documents_path}
                        onChange={handleChange}
                        rows="3"
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        placeholder="https://exemple.com/document.pdf"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Images (liens, un par ligne)</label>
                      <textarea
                        name="images_path"
                        value={formData.images_path}
                        onChange={handleChange}
                        rows="3"
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        placeholder="https://exemple.com/image.jpg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Documents (fichiers)</label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={handleDocumentFiles}
                        className="w-full text-sm"
                      />
                      {documentFiles.length > 0 && (
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-2">
                          {documentFiles.length} document(s) selectionne(s)
                        </p>
                      )}
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
                  </div>
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Apercu images existantes</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingImages.map((path) => (
                          <div key={path} className="rounded-xl border border-[rgb(var(--line))] bg-white/70 p-2 space-y-2">
                            <img
                              src={getStorageUrl(path)}
                              alt={getFileName(path)}
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

                  {existingDocuments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Documents existants</p>
                      <div className="space-y-2">
                        {existingDocuments.map((path) => (
                          <div key={path} className="flex items-center justify-between rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2">
                            <a
                              href={getStorageUrl(path)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-[rgb(var(--ink))] hover:underline"
                            >
                              {getFileName(path)}
                            </a>
                            <button type="button" className="btn-ghost text-[rgb(var(--clay))]" onClick={() => handleRemoveDocument(path)}>
                              Supprimer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
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
            )}

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets en attente d'approbation</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : pendingProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingProjects.map((project) => (
                    <div key={project.uuid} className="surface-soft p-4 flex flex-col xl:flex-row gap-4">
                      <div className="xl:w-56 w-full">
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
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-base font-semibold">{project.title}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {getTypeLabel(project.project_type) || 'Type'} · {project.city || project.location || 'Localisation'} · {getStatusLabel(project.status || 'open')}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs text-[rgba(15,42,46,0.6)]">
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
                            <p className="uppercase tracking-wide text-[10px]">Code postal</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.postal_code || 'N/A'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Prix</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {formatPrice(project.total_investment)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Invest. min</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {formatPrice(project.min_investment)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2">
                            <p className="uppercase tracking-wide text-[10px]">Rendement</p>
                            <p className="font-semibold text-[rgb(var(--ink))]">
                              {project.expected_return ? `${project.expected_return}%` : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {project.approval_status === 'rejected' && project.rejection_reason && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() => setHistoryModal({ open: true, project })}
                          >
                            Voir le motif
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 xl:w-60">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${approvalBadge(project.approval_status).className}`}>
                          {approvalBadge(project.approval_status).label}
                        </span>
                        {(project.approval_status || 'pending') === 'pending' && (
                          <>
                            <button onClick={() => handleApproval(project, 'approve')} className="btn-primary">
                              Approuver
                            </button>
                            <button onClick={() => handleApproval(project, 'reject')} className="btn-ghost text-[rgb(var(--clay))]">
                              Rejeter
                            </button>
                          </>
                        )}
                        <button onClick={() => handleEdit(project)} className="btn-ghost">Modifier</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets publies</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : publishedProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {publishedProjects.map((project) => (
                    <div key={project.uuid} className="surface-panel p-5">
                      <div className="flex gap-4">
                        <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {Array.isArray(project.images_path) && project.images_path.length ? (
                            <img
                              src={getStorageUrl(project.images_path[0])}
                              alt={project.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs text-[rgba(15,42,46,0.5)]">N/A</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-semibold">{project.title || "Projet d'investissement"}</h3>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            {project.city || project.location || 'Localisation'}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            Prix: {formatPrice(project.total_investment)} · Ticket min: {formatPrice(project.min_investment)}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.6)]">
                            Surface: {project.surface_area ? `${project.surface_area} m2` : 'N/A'} · Ref: {project.reference_code || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
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
          </div>
        </main>
      </div>
      {rejectModal.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Motif du rejet</h3>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              Precisez le motif obligatoire pour rejeter ce projet.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              rows="4"
              className="mt-4 w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
              placeholder="Motif du rejet..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setRejectModal({ open: false, project: null, reason: '' })}
              >
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={confirmReject}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
      {historyModal.open && historyModal.project && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Motif du rejet</h3>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
              {historyModal.project.title || 'Projet investissement'}
            </p>
            <div className="mt-4 surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.7)]">
              {historyModal.project.rejection_reason}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setHistoryModal({ open: false, project: null })}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvestmentManagement;
