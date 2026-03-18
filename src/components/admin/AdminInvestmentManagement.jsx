import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService } from '../../services/api';
import ClientRequestDomainSections from './ClientRequestDomainSections';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Trash2, Plus, Search } from 'lucide-react';

const AdminInvestmentManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = viewParam === 'create';
  const isListOnlyView = viewParam === 'list';
  const isRequestsOnlyView = viewParam === 'requests';
  const [projects, setProjects] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientHistory, setClientHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [existingPlans, setExistingPlans] = useState([]);
  const [existingRender3D, setExistingRender3D] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, project: null, reason: '' });
  const [historyModal, setHistoryModal] = useState({ open: false, project: null });
  const [showForm, setShowForm] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, project: null });
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestDecisionFilter, setRequestDecisionFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [listSearchTerm, setListSearchTerm] = useState('');
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
    plans_path: '',
    render_3d_path: '',
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

  const handlePlanFiles = (event) => {
    setPlanFiles(Array.from(event.target.files || []));
  };

  const handleRender3DFiles = (event) => {
    setRender3DFiles(Array.from(event.target.files || []));
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

  const handleRemovePlan = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce plan ?')) return;
    try {
      await service.updateInvestment(editingProject.uuid, { remove_plans: [path] });
      setExistingPlans((prev) => prev.filter((item) => item != path));
    } catch (err) {
      console.error('Erreur lors de la suppression du plan:', err);
      setError('Erreur lors de la suppression du plan.');
    }
  };

  const handleRemoveRender3D = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce visuel 3D ?')) return;
    try {
      await service.updateInvestment(editingProject.uuid, { remove_render_3d: [path] });
      setExistingRender3D((prev) => prev.filter((item) => item != path));
    } catch (err) {
      console.error('Erreur lors de la suppression du visuel 3D:', err);
      setError('Erreur lors de la suppression du visuel 3D.');
    }
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
      const [projectsResponse, agentsResponse, pendingClientResponse, clientHistoryResponse] = await Promise.all([
        service.getInvestments(),
        service.getAvailableAgents(),
        service.getPendingClientRequests(),
        service.getClientRequestHistory(),
      ]);
      const payload = projectsResponse?.data?.data ?? projectsResponse?.data ?? [];
      const list = payload.data || payload;
      const agentsPayload = agentsResponse?.data?.data ?? agentsResponse?.data ?? [];
      const pendingClientPayload = pendingClientResponse?.data?.data ?? pendingClientResponse?.data ?? [];
      const clientHistoryPayload = clientHistoryResponse?.data?.data ?? clientHistoryResponse?.data ?? [];
      setProjects(Array.isArray(list) ? list : []);
      setAgents(Array.isArray(agentsPayload) ? agentsPayload : []);
      setClientRequests(Array.isArray(pendingClientPayload.data || pendingClientPayload) ? (pendingClientPayload.data || pendingClientPayload) : []);
      setClientHistory(Array.isArray(clientHistoryPayload.data || clientHistoryPayload) ? (clientHistoryPayload.data || clientHistoryPayload) : []);
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
    setExistingPlans(Array.isArray(project.plans_path) ? project.plans_path : []);
    setExistingRender3D(Array.isArray(project.render_3d_path) ? project.render_3d_path : []);
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
    setExistingPlans([]);
    setExistingRender3D([]);
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
    plans_path: '',
    render_3d_path: '',
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
      plans_path: parseList(formData.plans_path),
      render_3d_path: parseList(formData.render_3d_path),
    };

    const hasFiles = documentFiles.length > 0 || imageFiles.length > 0 || planFiles.length > 0 || render3DFiles.length > 0;
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
      planFiles.forEach((file) => requestData.append('plans[]', file));
      render3DFiles.forEach((file) => requestData.append('render_3d[]', file));
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

  const handleApproveClientRequest = async (uuid) => {
    try {
      await service.approveClientRequest(uuid);
      await loadProjects();
    } catch (err) {
      console.error('Erreur approbation demande client:', err);
      setError('Erreur lors de la mise a jour du statut.');
    }
  };

  const handleAssignClientRequest = async (uuid) => {
    const agentId = assignments[uuid];
    if (!agentId) {
      alert('Veuillez selectionner un agent');
      return;
    }
    try {
      await service.assignClientRequest(uuid, { agent_id: agentId });
      await loadProjects();
    } catch (err) {
      console.error('Erreur assignation demande client:', err);
      setError(err.response?.data?.message || 'Erreur lors de l assignation.');
    }
  };

  const openRejectClientRequestModal = (item) => {
    setRejectModal({ open: true, project: item, reason: '' });
  };

  const confirmReject = async () => {
    if (!rejectModal.project?.uuid) return;
    if (!rejectModal.reason.trim()) {
      alert('Motif obligatoire.');
      return;
    }
    try {
      if (isRequestsOnlyView) {
        await service.rejectClientRequest(rejectModal.project.uuid, { rejection_reason: rejectModal.reason.trim() });
      } else {
        await service.rejectInvestment(rejectModal.project.uuid, { rejection_reason: rejectModal.reason.trim() });
      }
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
  const decisionLabel = (status) => {
    if (status === 'approved') return 'Accepte';
    if (status === 'rejected') return 'Refuse';
    return 'En attente';
  };
  const matchesRequestFilters = (project) => {
    const term = requestSearchTerm.trim().toLowerCase();
    const status = project.approval_status || 'pending';
    const decision = decisionLabel(status);
    const type = project.project_type || 'immobilier';
    const matchesSearch = !term
      || (project.title || '').toLowerCase().includes(term)
      || (project.city || '').toLowerCase().includes(term)
      || (project.location || '').toLowerCase().includes(term)
      || (getTypeLabel(project.project_type) || '').toLowerCase().includes(term)
      || approvalBadge(project.approval_status).label.toLowerCase().includes(term);
    const matchesStatus = requestStatusFilter === 'all' || status === requestStatusFilter;
    const matchesDecision = requestDecisionFilter === 'all' || decision === requestDecisionFilter;
    const matchesType = requestTypeFilter === 'all' || type === requestTypeFilter;
    return matchesSearch && matchesStatus && matchesDecision && matchesType;
  };

  const pendingProjects = projects.filter((project) => (project.approval_status || 'pending') !== 'approved');
  const publishedProjects = projects.filter((project) => (project.approval_status || 'pending') === 'approved');
  const investmentHistory = projects
    .filter((project) => (project.approval_status || 'pending') !== 'pending')
    .sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  const filteredPendingProjects = useMemo(
    () => pendingProjects.filter(matchesRequestFilters),
    [pendingProjects, requestSearchTerm, requestStatusFilter, requestDecisionFilter, requestTypeFilter]
  );
  const filteredInvestmentHistory = useMemo(
    () => investmentHistory.filter(matchesRequestFilters),
    [investmentHistory, requestSearchTerm, requestStatusFilter, requestDecisionFilter, requestTypeFilter]
  );
  const filteredInvestmentClientRequests = useMemo(
    () => clientRequests
      .filter((item) => item.request_type === 'investissement')
      .filter((item) => {
        const term = requestSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
        );
      })
      .filter((item) => requestStatusFilter === 'all' || (item.status || 'pending') === requestStatusFilter)
      .filter((item) => requestDecisionFilter === 'all' || decisionLabel(item.status) === requestDecisionFilter),
    [clientRequests, requestSearchTerm, requestStatusFilter, requestDecisionFilter]
  );
  const filteredInvestmentClientHistory = useMemo(
    () => clientHistory
      .filter((item) => item.request_type === 'investissement')
      .filter((item) => {
        const term = requestSearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
        );
      })
      .filter((item) => requestStatusFilter === 'all' || (item.status || 'pending') === requestStatusFilter)
      .filter((item) => requestDecisionFilter === 'all' || decisionLabel(item.status) === requestDecisionFilter),
    [clientHistory, requestSearchTerm, requestStatusFilter, requestDecisionFilter]
  );
  const filteredPublishedProjects = useMemo(() => {
    const term = listSearchTerm.trim().toLowerCase();
    if (!term) return publishedProjects;
    return publishedProjects.filter((project) => (
      (project.title || '').toLowerCase().includes(term)
      || (project.city || '').toLowerCase().includes(term)
      || (project.location || '').toLowerCase().includes(term)
      || (getTypeLabel(project.project_type) || '').toLowerCase().includes(term)
      || (project.reference_code || '').toLowerCase().includes(term)
    ));
  }, [publishedProjects, listSearchTerm]);

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
                {isCreateOnlyView
                  ? "Ajout de projet d'investissement"
                  : isListOnlyView
                    ? "Liste des projets d'investissement"
                    : isRequestsOnlyView
                      ? "Demandes d'investissement"
                      : 'Investissements'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? "Renseignez uniquement le formulaire d'ajout d'un projet d'investissement."
                  : isListOnlyView
                    ? "Consultez uniquement la liste des projets d'investissement."
                    : isRequestsOnlyView
                      ? "Consultez uniquement les demandes d'investissement et leur historique."
                      : "Creez, publiez et gerez les projets d'investissement."}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {isRequestsOnlyView && (
              <div className="surface-panel p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="pending">En attente</option>
                    <option value="approved">Approuve</option>
                    <option value="rejected">Rejete</option>
                  </select>
                  <select
                    value={requestDecisionFilter}
                    onChange={(e) => setRequestDecisionFilter(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm"
                  >
                    <option value="all">Toutes decisions</option>
                    <option value="Accepte">Accepte</option>
                    <option value="Refuse">Refuse</option>
                    <option value="En attente">En attente</option>
                  </select>
                </div>
              </div>
            )}

            {isRequestsOnlyView && (
              <div className="surface-panel p-5">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher une demande d'investissement..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>
            )}

            {!isCreateOnlyView && !isListOnlyView && !isRequestsOnlyView && (
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

            {!isCreateOnlyView && !isListOnlyView && !isRequestsOnlyView && (
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets en attente d'approbation</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredPendingProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet en attente.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPendingProjects.map((project) => (
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
            )}

            {isRequestsOnlyView && (
              <ClientRequestDomainSections
                requestType="investissement"
                requests={filteredInvestmentClientRequests}
                history={filteredInvestmentClientHistory}
                agents={agents}
                assignments={assignments}
                setAssignments={setAssignments}
                loading={loading}
                onApprove={handleApproveClientRequest}
                onOpenReject={openRejectClientRequestModal}
                onAssign={handleAssignClientRequest}
                onOpenHistoryReason={(item) => setHistoryModal({ open: true, project: item })}
                pendingTitle="Demandes d'investissement"
                pendingDescription="Traitez d'abord les demandes d'investissement envoyees par les clients, puis consultez leur historique."
                historyTitle="Historique des demandes d'investissement"
                emptyPendingLabel="Aucune demande."
                emptyHistoryLabel="Aucun historique."
              />
            )}

            {!isCreateOnlyView && !isRequestsOnlyView && (
            <div className="surface-panel p-5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher un projet d'investissement..."
                  value={listSearchTerm}
                  onChange={(e) => setListSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>
            )}

            {!isCreateOnlyView && !isRequestsOnlyView && (
            <div className="surface-panel p-6 space-y-4">
              <h2 className="text-lg font-semibold">Projets d'investissement</h2>
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : filteredPublishedProjects.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Aucun projet.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredPublishedProjects.map((project) => (
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
                        <button onClick={() => setDetailsModal({ open: true, project })} className="btn-ghost flex-1">Details</button>
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
      {detailsModal.open && detailsModal.project && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-semibold">{detailsModal.project.title || "Projet d'investissement"}</h3>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  {detailsModal.project.city || detailsModal.project.location || 'Localisation'}
                </p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setDetailsModal({ open: false, project: null })}>
                Fermer
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                  {Array.isArray(detailsModal.project.images_path) && detailsModal.project.images_path.length ? (
                    <img
                      src={getStorageUrl(detailsModal.project.images_path[0])}
                      alt={detailsModal.project.title}
                      className="w-full h-72 object-cover"
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center text-sm text-[rgba(15,42,46,0.5)]">Aucun visuel</div>
                  )}
                </div>
                <div className="surface-soft px-5 py-4">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <p className="mt-3 text-sm text-[rgba(15,42,46,0.7)]">
                    {detailsModal.project.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="surface-soft px-5 py-4 space-y-3">
                  <h4 className="text-sm font-semibold">Informations</h4>
                  <div>
                    <p className="text-xs text-[rgba(15,42,46,0.45)]">Type</p>
                    <p className="font-medium">{getTypeLabel(detailsModal.project.project_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgba(15,42,46,0.45)]">Prix total</p>
                    <p className="font-medium">{formatPrice(detailsModal.project.total_investment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgba(15,42,46,0.45)]">Investissement minimum</p>
                    <p className="font-medium">{formatPrice(detailsModal.project.min_investment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgba(15,42,46,0.45)]">Rendement attendu</p>
                    <p className="font-medium">{detailsModal.project.expected_return ? `${detailsModal.project.expected_return}%` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[rgba(15,42,46,0.45)]">Statut</p>
                    <p className="font-medium">{getStatusLabel(detailsModal.project.status)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvestmentManagement;
