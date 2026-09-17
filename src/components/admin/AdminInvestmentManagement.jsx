import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService } from '../../services/api';
import ClientRequestDomainSections from './ClientRequestDomainSections';
import { useAuth } from '../../contexts/AuthContext';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import {
  Save, Trash2, Plus, Search, Clock, UserCheck, CheckCircle, Users, X, ChevronLeft, ChevronRight,
  FileText, Handshake, XCircle, TrendingUp, Eye, ShieldCheck, LocateFixed, Map as MapIcon, Image, Upload,
} from 'lucide-react';

const PAGE_SIZE = 8;
const LIST_PAGE_SIZE = 12;

const AdminInvestmentManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = viewParam === 'create';
  const isListOnlyView = viewParam === 'list';
  const isRequestsOnlyView = viewParam === 'requests';
  const isHistoryOnlyView = viewParam === 'history';
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
  const [requestAgentFilter, setRequestAgentFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [requestPage, setRequestPage] = useState(1);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyDecisionFilter, setHistoryDecisionFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [listSearchInput, setListSearchInput] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState('all');
  const [listProjects, setListProjects] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [listLastPage, setListLastPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listStats, setListStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
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
  const apiBase = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const getFileName = (path) => (path ? path.split('/').pop() : '');

  const renderNewFilePreview = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              {file.type?.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={`${label} ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
              ) : (
                <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                  <span className="text-[11px] text-[rgba(15,42,46,0.6)] text-center break-words">{file.name}</span>
                </div>
              )}
              <button type="button" onClick={() => onRemove(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';
  const basePath = user?.role === 'admin' ? '/admin/investments' : '/manager/investments';

  const locationPicker = useAddressLocation({
    onResolved: ({ address, city }) => {
      setFormData((prev) => ({
        ...prev,
        location: address,
        city: prev.city || city,
      }));
    },
  });

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
    setDocumentFiles((prev) => [...prev, ...Array.from(event.target.files || [])]);
    event.target.value = '';
  };

  const handleImageFiles = (event) => {
    setImageFiles((prev) => [...prev, ...Array.from(event.target.files || [])]);
    event.target.value = '';
  };

  const handlePlanFiles = (event) => {
    setPlanFiles((prev) => [...prev, ...Array.from(event.target.files || [])]);
    event.target.value = '';
  };

  const handleRender3DFiles = (event) => {
    setRender3DFiles((prev) => [...prev, ...Array.from(event.target.files || [])]);
    event.target.value = '';
  };

  const removeNewDocument = (index) => {
    setDocumentFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewPlan = (index) => {
    setPlanFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeNewRender3D = (index) => {
    setRender3DFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
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
    if (params.get('view') === 'create') {
      // Navigation explicite vers "Ajout de projet" : on repart toujours
      // d'un formulaire vierge, meme si une edition etait en cours.
      setEditingProject(null);
      setDocumentFiles([]);
      setImageFiles([]);
      setExistingDocuments([]);
      setExistingImages([]);
      setExistingPlans([]);
      setExistingRender3D([]);
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
      locationPicker.reset();
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    setRequestPage(1);
  }, [requestSearchTerm, requestStatusFilter, requestDecisionFilter, requestAgentFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchTerm, historyStatusFilter, historyDecisionFilter]);

  // Recherche debouncee (350ms) pour la liste des projets d'investissement.
  useEffect(() => {
    const timeout = setTimeout(() => setListSearchTerm(listSearchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [listSearchInput]);

  useEffect(() => {
    setListPage(1);
  }, [listSearchTerm, listStatusFilter]);

  useEffect(() => {
    loadInvestmentList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPage, listSearchTerm, listStatusFilter]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const [projectsResponse, agentsResponse, pendingClientResponse, clientHistoryResponse] = await Promise.all([
        service.getInvestments({ per_page: 100 }),
        service.getAvailableAgents(),
        service.getPendingClientRequests({ per_page: 100 }),
        service.getClientRequestHistory({ per_page: 100 }),
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

  const loadInvestmentList = async () => {
    try {
      setListLoading(true);
      const response = await service.getInvestments({
        page: listPage,
        per_page: LIST_PAGE_SIZE,
        search: listSearchTerm || undefined,
        status: listStatusFilter !== 'all' ? listStatusFilter : undefined,
      });
      const payload = response?.data?.data ?? response?.data ?? [];
      const list = payload.data || payload;
      setListProjects(Array.isArray(list) ? list : []);
      setListLastPage(payload.last_page || 1);
      setListTotal(payload.total ?? (Array.isArray(list) ? list.length : 0));
      const responseStats = response?.data?.stats;
      if (responseStats) {
        setListStats({
          total: responseStats.total || 0,
          approved: responseStats.approved || 0,
          pending: responseStats.pending || 0,
          rejected: responseStats.rejected || 0,
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la liste des projets:', err);
      setListProjects([]);
    } finally {
      setListLoading(false);
    }
  };

  const refreshInvestmentData = async () => {
    await Promise.all([loadProjects(), loadInvestmentList()]);
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
    locationPicker.reset();
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
    locationPicker.reset();
  };

  const handleCloseForm = () => {
    resetForm();
    if (isCreateOnlyView) {
      navigate(`${basePath}?view=list`);
    }
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
      await refreshInvestmentData();
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
      await refreshInvestmentData();
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
      await refreshInvestmentData();
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
      await refreshInvestmentData();
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
  const investmentClientRequests = useMemo(
    () => clientRequests.filter((item) => item.request_type === 'investissement'),
    [clientRequests]
  );
  const investmentClientHistory = useMemo(
    () => clientHistory.filter((item) => item.request_type === 'investissement'),
    [clientHistory]
  );
  const investmentUnassignedCount = useMemo(
    () => investmentClientRequests.filter((item) => !item.agent).length,
    [investmentClientRequests]
  );
  const investmentApprovedCount = useMemo(
    () => investmentClientRequests.filter((item) => ['approved', 'agent_rejected'].includes(item.status)).length,
    [investmentClientRequests]
  );
  const investmentAgents = useMemo(
    () => agents.filter((agent) => agent.agent_type === 'investissement'),
    [agents]
  );
  const investmentHistoryStats = useMemo(() => {
    let concluded = 0;
    let rejected = 0;
    investmentClientHistory.forEach((item) => {
      const isConcluded = item.deal_status === 'deal_concluded' || item.status === 'deal_concluded';
      if (isConcluded) concluded += 1;
      else if (['rejected', 'agent_rejected'].includes(item.status)) rejected += 1;
    });
    return {
      total: investmentClientHistory.length,
      concluded,
      rejected,
      ongoing: investmentClientHistory.length - concluded - rejected,
    };
  }, [investmentClientHistory]);

  const projectChecklist = useMemo(() => [
    { label: 'Titre du projet', done: formData.title.trim().length > 0 },
    { label: 'Type de projet', done: Boolean(formData.project_type) },
  ], [formData]);
  const projectCompletedCount = projectChecklist.filter((item) => item.done).length;
  const projectCompletionPercent = Math.round((projectCompletedCount / projectChecklist.length) * 100);

  const filteredInvestmentClientRequests = useMemo(
    () => investmentClientRequests
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
      .filter((item) => requestDecisionFilter === 'all' || decisionLabel(item.status) === requestDecisionFilter)
      .filter((item) => requestAgentFilter === 'all' || (requestAgentFilter === 'assigne' ? Boolean(item.agent) : !item.agent)),
    [investmentClientRequests, requestSearchTerm, requestStatusFilter, requestDecisionFilter, requestAgentFilter]
  );
  const requestLastPage = Math.max(1, Math.ceil(filteredInvestmentClientRequests.length / PAGE_SIZE));
  const paginatedInvestmentClientRequests = useMemo(
    () => filteredInvestmentClientRequests.slice((requestPage - 1) * PAGE_SIZE, requestPage * PAGE_SIZE),
    [filteredInvestmentClientRequests, requestPage]
  );

  const filteredInvestmentClientHistory = useMemo(
    () => investmentClientHistory
      .filter((item) => {
        const term = historySearchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          (item.name || '').toLowerCase().includes(term)
          || (item.email || '').toLowerCase().includes(term)
          || (item.phone || '').toLowerCase().includes(term)
          || (item.message || '').toLowerCase().includes(term)
        );
      })
      .filter((item) => historyStatusFilter === 'all' || (item.status || 'pending') === historyStatusFilter)
      .filter((item) => historyDecisionFilter === 'all' || decisionLabel(item.status) === historyDecisionFilter),
    [investmentClientHistory, historySearchTerm, historyStatusFilter, historyDecisionFilter]
  );
  const historyLastPage = Math.max(1, Math.ceil(filteredInvestmentClientHistory.length / PAGE_SIZE));
  const paginatedInvestmentClientHistory = useMemo(
    () => filteredInvestmentClientHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE),
    [filteredInvestmentClientHistory, historyPage]
  );

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">{roleLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">
                {isCreateOnlyView
                  ? "Ajout de projet d'investissement"
                  : isListOnlyView
                    ? "Liste des projets d'investissement"
                    : isRequestsOnlyView
                      ? "Demandes d'investissement"
                      : isHistoryOnlyView
                        ? "Historique des demandes d'investissement"
                        : 'Investissements'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? "Renseignez uniquement le formulaire d'ajout d'un projet d'investissement."
                  : isListOnlyView
                    ? "Consultez uniquement la liste des projets d'investissement."
                    : isRequestsOnlyView
                      ? "Traitez les demandes d'investissement, acceptez/refusez puis assignez un agent."
                      : isHistoryOnlyView
                        ? "Consultez l'historique des demandes d'investissement et leur conclusion."
                        : "Creez, publiez et gerez les projets d'investissement."}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {isRequestsOnlyView && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'pending', label: 'En attente', value: investmentClientRequests.length, icon: Clock, highlight: investmentClientRequests.length > 0 },
                  { key: 'unassigned', label: 'Non assignees', value: investmentUnassignedCount, icon: UserCheck, highlight: investmentUnassignedCount > 0 },
                  { key: 'approved', label: 'Pretes a assigner', value: investmentApprovedCount, icon: CheckCircle },
                  { key: 'agents', label: 'Agents disponibles', value: investmentAgents.length, icon: Users },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {loading ? '...' : Number(kpi.value || 0).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                          kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                        }`}
                      >
                        <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isRequestsOnlyView && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher une demande d'investissement..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuve</option>
                  <option value="rejected">Rejete</option>
                </select>
                <select
                  value={requestDecisionFilter}
                  onChange={(e) => setRequestDecisionFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Toutes decisions</option>
                  <option value="Accepte">Accepte</option>
                  <option value="Refuse">Refuse</option>
                  <option value="En attente">En attente</option>
                </select>
                <select
                  value={requestAgentFilter}
                  onChange={(e) => setRequestAgentFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Tous agents</option>
                  <option value="assigne">Assigne</option>
                  <option value="non-assigne">Non assigne</option>
                </select>
                {(requestSearchTerm || requestStatusFilter !== 'all' || requestDecisionFilter !== 'all' || requestAgentFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setRequestSearchTerm(''); setRequestStatusFilter('all'); setRequestDecisionFilter('all'); setRequestAgentFilter('all'); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
              </div>
            )}

            {isHistoryOnlyView && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'total', label: 'Dossiers', value: investmentHistoryStats.total, icon: FileText },
                  { key: 'concluded', label: 'Deals conclus', value: investmentHistoryStats.concluded, icon: Handshake },
                  { key: 'ongoing', label: 'En cours', value: investmentHistoryStats.ongoing, icon: Clock },
                  { key: 'rejected', label: 'Refuses', value: investmentHistoryStats.rejected, icon: XCircle },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {loading ? '...' : Number(kpi.value || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]">
                        <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isHistoryOnlyView && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher un client, un agent, une cible..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Tous statuts</option>
                  <option value="approved">Approuve</option>
                  <option value="rejected">Rejete</option>
                  <option value="deal_concluded">Deal conclu</option>
                </select>
                <select
                  value={historyDecisionFilter}
                  onChange={(e) => setHistoryDecisionFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Toutes decisions</option>
                  <option value="Accepte">Accepte</option>
                  <option value="Refuse">Refuse</option>
                </select>
                {(historySearchTerm || historyStatusFilter !== 'all' || historyDecisionFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setHistorySearchTerm(''); setHistoryStatusFilter('all'); setHistoryDecisionFilter('all'); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
              </div>
            )}

            {!isCreateOnlyView && !isListOnlyView && !isRequestsOnlyView && !isHistoryOnlyView && (
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={handleCloseForm} className="btn-ghost text-xs">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Retour a la liste
                  </button>
                  <div className="flex items-center gap-2.5 text-xs text-[rgba(15,42,46,0.6)]">
                    <span className="whitespace-nowrap">{projectCompletedCount}/{projectChecklist.length} champs requis</span>
                    <div className="h-1.5 w-20 sm:w-28 rounded-full bg-[rgba(15,42,46,0.08)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${projectCompletionPercent === 100 ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`}
                        style={{ width: `${projectCompletionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                  <div className="space-y-6 min-w-0">
                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                        <div>
                          <h2 className="text-lg font-semibold">{editingProject ? 'Modifier le projet' : 'Informations generales'}</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre, type et description du projet d'investissement</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Titre *</label>
                          <input
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ex. Residence premium - Abidjan"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Type *</label>
                          <select
                            name="project_type"
                            value={formData.project_type}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          >
                            {projectTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Decrivez le projet : atouts, environnement, particularites..."
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                        <div>
                          <h2 className="text-lg font-semibold">Localisation</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Ville, adresse et reperes geographiques</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Ville</label>
                          <input
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Code postal</label>
                          <input
                            name="postal_code"
                            value={formData.postal_code}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            placeholder="77140"
                          />
                        </div>
                        <div className="md:col-span-2 relative">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <label className="block text-sm font-medium">Localisation</label>
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
                              name="location"
                              value={formData.location}
                              onChange={(event) => { handleChange(event); locationPicker.handleInputChange(event.target.value); }}
                              onFocus={() => formData.location.trim().length >= 3 && locationPicker.fetchSuggestions(formData.location.trim())}
                              onBlur={() => setTimeout(() => locationPicker.clearSuggestions(), 150)}
                              placeholder="Ex. Boulevard de la Marina, Cotonou"
                              autoComplete="off"
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
                                    <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[rgba(15,42,46,0.4)] rotate-90" />
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
                        <div>
                          <label className="block text-sm font-medium mb-2">Reference</label>
                          <input
                            name="reference_code"
                            value={formData.reference_code}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            placeholder="REF-001"
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
                            min="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                        <div>
                          <h2 className="text-lg font-semibold">Financement</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Prix, ticket minimum et rendement</p>
                        </div>
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
                            min="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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
                            min="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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
                            min="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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
                            min="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">4</div>
                        <div>
                          <h2 className="text-lg font-semibold">Calendrier & statut</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Periode et visibilite de l'offre</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Date de debut</label>
                          <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Date de fin</label>
                          <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Statut</label>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">5</div>
                        <div>
                          <h2 className="text-lg font-semibold">Visuels & documents</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans, rendus 3D et documents</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Documents (liens, un par ligne)</label>
                          <textarea
                            name="documents_path"
                            value={formData.documents_path}
                            onChange={handleChange}
                            rows="3"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            placeholder="https://exemple.com/document.pdf"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Images (liens, un par ligne)</label>
                          <textarea
                            name="images_path"
                            value={formData.images_path}
                            onChange={handleChange}
                            rows="3"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                            placeholder="https://exemple.com/image.jpg"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Images <span className="text-[rgba(15,42,46,0.45)] font-normal">({imageFiles.length + existingImages.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <Image className="h-5 w-5 text-[rgb(var(--clay))]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Photos du projet</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">JPG, PNG ou WEBP</p>
                          <input type="file" multiple accept="image/*" onChange={handleImageFiles} className="hidden" id="investment-image-upload" />
                          <label htmlFor="investment-image-upload" className="btn-primary cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Selectionner des photos
                          </label>
                        </div>
                        {renderNewFilePreview(imageFiles, removeNewImage, 'Nouvelles images')}
                        {existingImages.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-3">Images existantes ({existingImages.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {existingImages.map((path) => (
                                <div key={path} className="relative">
                                  <img src={getStorageUrl(path)} alt={getFileName(path)} className="w-full h-20 object-cover rounded-lg" />
                                  <button type="button" onClick={() => handleRemoveImage(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Documents <span className="text-[rgba(15,42,46,0.45)] font-normal">({documentFiles.length + existingDocuments.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <FileText className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Documents du dossier</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">PDF, Word, Excel ou PowerPoint</p>
                          <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleDocumentFiles} className="hidden" id="investment-document-upload" />
                          <label htmlFor="investment-document-upload" className="btn-ghost cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Ajouter des documents
                          </label>
                        </div>
                        {renderNewFilePreview(documentFiles, removeNewDocument, 'Nouveaux documents')}
                        {existingDocuments.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-3">Documents existants ({existingDocuments.length})</p>
                            <div className="space-y-2">
                              {existingDocuments.map((path) => (
                                <div key={path} className="flex items-center justify-between rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2">
                                  <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="text-sm text-[rgb(var(--ink))] hover:underline truncate">
                                    {getFileName(path)}
                                  </a>
                                  <button type="button" className="btn-ghost text-[rgb(var(--clay))] shrink-0" onClick={() => handleRemoveDocument(path)}>
                                    Supprimer
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Plans <span className="text-[rgba(15,42,46,0.45)] font-normal">({planFiles.length + existingPlans.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <FileText className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Plans techniques</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Images ou PDF - optionnel</p>
                          <input type="file" multiple accept="image/*,.pdf" onChange={handlePlanFiles} className="hidden" id="investment-plan-upload" />
                          <label htmlFor="investment-plan-upload" className="btn-ghost cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Ajouter des plans
                          </label>
                        </div>
                        {renderNewFilePreview(planFiles, removeNewPlan, 'Nouveaux plans')}
                        {existingPlans.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-3">Plans existants ({existingPlans.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {existingPlans.map((path) => (
                                <div key={path} className="relative">
                                  {path.toLowerCase().endsWith('.pdf') ? (
                                    <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                                      <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="text-xs text-[rgb(var(--ink))] hover:underline break-words text-center">
                                        {getFileName(path)}
                                      </a>
                                    </div>
                                  ) : (
                                    <img src={getStorageUrl(path)} alt="Plan" className="w-full h-20 object-cover rounded-lg" />
                                  )}
                                  <button type="button" onClick={() => handleRemovePlan(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Rendus 3D <span className="text-[rgba(15,42,46,0.45)] font-normal">({render3DFiles.length + existingRender3D.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <TrendingUp className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Rendus 3D et visuels de projection</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                          <input type="file" multiple accept="image/*,.pdf" onChange={handleRender3DFiles} className="hidden" id="investment-render3d-upload" />
                          <label htmlFor="investment-render3d-upload" className="btn-ghost cursor-pointer inline-flex">
                            <Upload className="h-4 w-4" />
                            Ajouter des visuels 3D
                          </label>
                        </div>
                        {renderNewFilePreview(render3DFiles, removeNewRender3D, 'Nouveaux visuels 3D')}
                        {existingRender3D.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-3">Visuels 3D existants ({existingRender3D.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {existingRender3D.map((path) => (
                                <div key={path} className="relative">
                                  {path.toLowerCase().endsWith('.pdf') ? (
                                    <div className="h-20 w-full rounded-lg border border-[rgb(var(--line))] bg-white/70 flex items-center justify-center p-2">
                                      <a href={getStorageUrl(path)} target="_blank" rel="noreferrer" className="text-xs text-[rgb(var(--ink))] hover:underline break-words text-center">
                                        {getFileName(path)}
                                      </a>
                                    </div>
                                  ) : (
                                    <img src={getStorageUrl(path)} alt="Visuel 3D" className="w-full h-20 object-cover rounded-lg" />
                                  )}
                                  <button type="button" onClick={() => handleRemoveRender3D(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6">
                    <div className="surface-panel p-5 space-y-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Apercu du projet</p>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {imageFiles[0] ? (
                            <img src={URL.createObjectURL(imageFiles[0])} alt="" className="h-full w-full object-cover" />
                          ) : existingImages[0] ? (
                            <img src={getStorageUrl(existingImages[0])} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">{formData.title || 'Titre du projet'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">{formData.city || formData.location || 'Localisation non definie'}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-semibold text-[rgb(var(--ink))]">
                        {formData.total_investment ? formatPrice(formData.total_investment) : 'N/A'}
                      </p>
                      {formData.min_investment && (
                        <p className="text-xs text-[rgba(15,42,46,0.6)]">Ticket min : {formatPrice(formData.min_investment)}</p>
                      )}
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Champs requis ({projectCompletedCount}/{projectChecklist.length})</p>
                      <ul className="space-y-2">
                        {projectChecklist.map((item) => (
                          <li key={item.label} className="flex items-center gap-2 text-sm">
                            {item.done ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border-2 border-[rgba(15,42,46,0.2)] shrink-0" />
                            )}
                            <span className={item.done ? 'text-[rgb(var(--ink))]' : 'text-[rgba(15,42,46,0.5)]'}>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="surface-panel p-5 space-y-2.5">
                      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                        <Save className="h-4 w-4" />
                        {saving ? 'Enregistrement...' : editingProject ? 'Enregistrer les modifications' : 'Creer le projet'}
                      </button>
                      <button type="button" onClick={handleCloseForm} className="btn-ghost w-full justify-center">
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {!isCreateOnlyView && !isListOnlyView && !isRequestsOnlyView && !isHistoryOnlyView && (
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
              <>
                <ClientRequestDomainSections
                  requestType="investissement"
                  requests={paginatedInvestmentClientRequests}
                  history={[]}
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
                  emptyPendingLabel="Aucune demande ne correspond a ces criteres."
                />
                {!loading && filteredInvestmentClientRequests.length > 0 && (
                  <div className="surface-panel flex items-center justify-between gap-3 px-6 py-4">
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">
                      {filteredInvestmentClientRequests.length} demande{filteredInvestmentClientRequests.length > 1 ? 's' : ''} - page {requestPage} sur {requestLastPage}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                        disabled={requestPage <= 1}
                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRequestPage((p) => Math.min(requestLastPage, p + 1))}
                        disabled={requestPage >= requestLastPage}
                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {isHistoryOnlyView && (
              <>
                <ClientRequestDomainSections
                  requestType="investissement"
                  requests={[]}
                  history={paginatedInvestmentClientHistory}
                  agents={agents}
                  assignments={assignments}
                  setAssignments={setAssignments}
                  loading={loading}
                  onApprove={handleApproveClientRequest}
                  onOpenReject={openRejectClientRequestModal}
                  onAssign={handleAssignClientRequest}
                  onOpenHistoryReason={(item) => setHistoryModal({ open: true, project: item })}
                  historyTitle="Historique des demandes d'investissement"
                  emptyHistoryLabel="Aucun historique ne correspond a ces criteres."
                />
                {!loading && filteredInvestmentClientHistory.length > 0 && (
                  <div className="surface-panel flex items-center justify-between gap-3 px-6 py-4">
                    <p className="text-xs text-[rgba(15,42,46,0.55)]">
                      {filteredInvestmentClientHistory.length} dossier{filteredInvestmentClientHistory.length > 1 ? 's' : ''} - page {historyPage} sur {historyLastPage}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage <= 1}
                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setHistoryPage((p) => Math.min(historyLastPage, p + 1))}
                        disabled={historyPage >= historyLastPage}
                        className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!isCreateOnlyView && !isRequestsOnlyView && !isHistoryOnlyView && !showForm && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'total', label: 'Projets', value: listStats.total, icon: TrendingUp },
                  { key: 'approved', label: 'Approuves', value: listStats.approved, icon: ShieldCheck },
                  { key: 'pending', label: 'En attente', value: listStats.pending, icon: Clock, highlight: listStats.pending > 0 },
                  { key: 'rejected', label: 'Rejetes', value: listStats.rejected, icon: XCircle },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {listLoading && listStats.total === 0 ? '...' : Number(kpi.value || 0).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                          kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                        }`}
                      >
                        <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isCreateOnlyView && !isRequestsOnlyView && !isHistoryOnlyView && !showForm && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre, ville ou reference..."
                    value={listSearchInput}
                    onChange={(e) => setListSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select
                  value={listStatusFilter}
                  onChange={(e) => setListStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Tous statuts</option>
                  <option value="approved">Approuves</option>
                  <option value="pending">En attente</option>
                  <option value="rejected">Rejetes</option>
                </select>
                {(listSearchInput || listStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setListSearchInput(''); setListStatusFilter('all'); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
              </div>
            )}

            {!isCreateOnlyView && !isRequestsOnlyView && !isHistoryOnlyView && !showForm && (
              <>
                {/* Liste - cartes empilees sur mobile (pas de scroll horizontal) */}
                <div className="surface-panel overflow-hidden md:hidden">
                  <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                    {listLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4">
                          <div className="h-24 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                        </div>
                      ))
                    ) : listProjects.length === 0 ? (
                      <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                        Aucun projet ne correspond a ces criteres.
                      </div>
                    ) : (
                      listProjects.map((project) => (
                        <div key={project.uuid} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                              {Array.isArray(project.images_path) && project.images_path.length ? (
                                <img src={getStorageUrl(project.images_path[0])} alt={project.title} className="w-full h-full object-cover" />
                              ) : (
                                <TrendingUp className="h-6 w-6 text-[rgba(15,42,46,0.4)]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-[rgb(var(--ink))] truncate">{project.title || "Projet d'investissement"}</p>
                                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${approvalBadge(project.approval_status).className}`}>
                                  {approvalBadge(project.approval_status).label}
                                </span>
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.6)] mt-1">{getTypeLabel(project.project_type) || 'Type'}</p>
                            </div>
                          </div>
                          <div className="text-xs text-[rgba(15,42,46,0.6)] space-y-1">
                            <p className="truncate">{project.city || project.location || 'Localisation inconnue'}</p>
                            <p>Prix : {formatPrice(project.total_investment)} · Ticket min : {formatPrice(project.min_investment)}</p>
                            <p className="truncate">Ref : {project.reference_code || 'N/A'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setDetailsModal({ open: true, project })} className="btn-ghost px-3"><Eye className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleEdit(project)} className="btn-ghost flex-1 text-xs">Modifier</button>
                            <button onClick={() => handleDelete(project)} className="btn-ghost px-3 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!listLoading && listTotal > 0 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {listPage} sur {listLastPage}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setListPage((p) => Math.max(1, p - 1))}
                          disabled={listPage <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setListPage((p) => Math.min(listLastPage, p + 1))}
                          disabled={listPage >= listLastPage}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Liste - tableau sur desktop */}
                <div className="surface-panel overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[860px]">
                      <thead>
                        <tr className="border-b border-[rgba(15,42,46,0.08)] text-left text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">
                          <th className="px-5 py-3.5 font-medium">Projet</th>
                          <th className="px-5 py-3.5 font-medium">Localisation</th>
                          <th className="px-5 py-3.5 font-medium">Prix / Ticket min</th>
                          <th className="px-5 py-3.5 font-medium">Reference</th>
                          <th className="px-5 py-3.5 font-medium">Statut</th>
                          <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(15,42,46,0.06)]">
                        {listLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                              <td colSpan={6} className="px-5 py-4">
                                <div className="h-10 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : listProjects.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                              Aucun projet ne correspond a ces criteres.
                            </td>
                          </tr>
                        ) : (
                          listProjects.map((project) => (
                            <tr key={project.uuid} className="hover:bg-[rgba(15,42,46,0.02)] transition">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                                    {Array.isArray(project.images_path) && project.images_path.length ? (
                                      <img src={getStorageUrl(project.images_path[0])} alt={project.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <TrendingUp className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[rgb(var(--ink))] truncate">{project.title || "Projet d'investissement"}</p>
                                    <p className="text-xs text-[rgba(15,42,46,0.55)]">{getTypeLabel(project.project_type) || 'Type'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)] max-w-[200px] truncate">
                                {project.city || project.location || 'Inconnue'}
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                                {formatPrice(project.total_investment)} / {formatPrice(project.min_investment)}
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)]">
                                {project.reference_code || 'N/A'}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${approvalBadge(project.approval_status).className}`}>
                                  {approvalBadge(project.approval_status).label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => setDetailsModal({ open: true, project })} title="Details" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleEdit(project)} title="Modifier" className="h-8 px-2.5 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-xs text-[rgba(15,42,46,0.7)] hover:bg-white transition">
                                    Modifier
                                  </button>
                                  <button onClick={() => handleDelete(project)} title="Supprimer" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-red-600 hover:bg-red-50 transition">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!listLoading && listTotal > 0 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">
                        {listTotal} projet{listTotal > 1 ? 's' : ''} - page {listPage} sur {listLastPage}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setListPage((p) => Math.max(1, p - 1))}
                          disabled={listPage <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setListPage((p) => Math.min(listLastPage, p + 1))}
                          disabled={listPage >= listLastPage}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
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
