import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, managerService, publicConstructionService, countryService } from '../../services/api';
import { formatFcfaRange } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';
import { useAddressLocation } from '../../hooks/useAddressLocation';
import {
  Save,
  Trash2,
  Plus,
  HardHat,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  MapPin,
  Banknote,
  PlayCircle,
  Link2,
  Upload,
  Image,
  FileWarning,
  Building,
  LocateFixed,
  Map as MapIcon,
} from 'lucide-react';

const getYoutubeThumbnail = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
};

const PER_PAGE = 12;

const ConstructionManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const viewParam = new URLSearchParams(location.search).get('view');
  const isCreateOnlyView = viewParam === 'create';
  const isListOnlyView = viewParam === 'list';
  const isVideoOnlyView = viewParam === 'video';
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
  const [existingRender3D, setExistingRender3D] = useState([]);
  const [render3DFiles, setRender3DFiles] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, project: null, reason: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [brokenCovers, setBrokenCovers] = useState({});
  const [brokenThumbs, setBrokenThumbs] = useState({});
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, rejected: 0 });
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [spotlightForm, setSpotlightForm] = useState({
    section_title: 'Ne ratez pas cette offre exceptionnelle',
    section_description:
      'Deux offres speciales en video pour vous aider a lancer votre projet au meilleur moment.',
    videos: [
      { url: '', title: '', description: '' },
      { url: '', title: '', description: '' },
    ],
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget_min: '',
    budget_max: '',
    surface_area: '',
    location: '',
    city: '',
    country_id: '',
  });
  const [countries, setCountries] = useState([]);
  const locationPicker = useAddressLocation({
    onResolved: ({ address, city }) => {
      setFormData((prev) => ({
        ...prev,
        location: address,
        city: prev.city || city,
      }));
    },
  });

  const service = useMemo(() => (
    user?.role === 'admin' ? adminService : managerService
  ), [user?.role]);

  const roleLabel = user?.role === 'admin' ? 'Administration' : 'Gestionnaire';
  const basePath = user?.role === 'admin' ? '/admin/construction-projects' : '/manager/construction-projects';
  const apiBase = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  useEffect(() => {
    loadSpotlight();
    loadPendingPublications();
    countryService.getAll()
      .then((res) => {
        const payload = res?.data?.data ?? res?.data ?? [];
        setCountries(Array.isArray(payload) ? payload : payload.data || []);
      })
      .catch((err) => console.error('Erreur chargement pays:', err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'create') {
      // Navigation explicite vers "Ajout de projet" : on repart toujours
      // d'un formulaire vierge, meme si une edition etait en cours.
      setEditingProject(null);
      setExistingImages([]);
      setImageFiles([]);
      setExistingPlans([]);
      setPlanFiles([]);
      setExistingRender3D([]);
      setRender3DFiles([]);
      setFormData({
        title: '',
        description: '',
        budget_min: '',
        budget_max: '',
        surface_area: '',
        location: '',
        city: '',
        country_id: '',
      });
      locationPicker.reset();
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Recherche debouncee (350ms) : on evite une requete par frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Revenir a la page 1 des qu'un filtre change.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, filterStatus]);

  const loadSpotlight = async () => {
    try {
      const publishedRes = await publicConstructionService.getAll({ per_page: 1 });
      const spotlight = publishedRes?.data?.spotlight;
      if (spotlight) {
        const normalizedVideos = Array.isArray(spotlight.videos) ? spotlight.videos.slice(0, 2) : [];
        while (normalizedVideos.length < 2) {
          normalizedVideos.push({ url: '', title: '', description: '' });
        }
        setSpotlightForm({
          section_title: spotlight.title || 'Ne ratez pas cette offre exceptionnelle',
          section_description:
            spotlight.description ||
            'Deux offres speciales en video pour vous aider a lancer votre projet au meilleur moment.',
          videos: normalizedVideos.map((video) => ({
            url: video?.url || '',
            title: video?.title || '',
            description: video?.description || '',
          })),
        });
      }
    } catch (err) {
      console.error('Erreur chargement spotlight construction:', err);
    }
  };

  const loadPendingPublications = async () => {
    try {
      const pendingRes = await service.getPendingConstructionProjects();
      const pendingPayload = pendingRes?.data?.data ?? pendingRes?.data ?? [];
      const pendingList = pendingPayload.data || pendingPayload;
      const publicationPending = Array.isArray(pendingList)
        ? pendingList.filter((item) => item.is_publication)
        : [];
      setPendingPublications(publicationPending);
    } catch (err) {
      console.error('Erreur chargement publications en attente:', err);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await service.getAllConstructionProjects({
        page,
        per_page: PER_PAGE,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      const payload = response?.data?.data ?? response?.data ?? [];
      const list = payload.data || payload;
      setProjects(Array.isArray(list) ? list : []);
      setLastPage(payload.last_page || 1);
      setTotalProjects(payload.total ?? (Array.isArray(list) ? list.length : 0));
      const responseStats = response?.data?.stats;
      if (responseStats) {
        setStats({
          total: responseStats.total || 0,
          published: responseStats.published || 0,
          pending: responseStats.pending || 0,
          rejected: responseStats.rejected || 0,
        });
      }
    } catch (err) {
      console.error('Erreur chargement projets:', err);
      setError('Impossible de charger les projets.');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([loadProjects(), loadPendingPublications()]);
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
    setExistingRender3D(Array.isArray(project.render_3d_path) ? project.render_3d_path : []);
    setShowForm(true);
    setFormData({
      title: project.title || '',
      description: project.description || '',
      budget_min: project.budget_min || '',
      budget_max: project.budget_max || '',
      surface_area: project.surface_area || '',
      location: project.location || '',
      city: project.city || '',
      country_id: project.country_id || project.country?.id || '',
    });
    locationPicker.reset();
  };

  const resetForm = () => {
    setEditingProject(null);
    setExistingImages([]);
    setImageFiles([]);
    setExistingPlans([]);
    setPlanFiles([]);
    setExistingRender3D([]);
    setRender3DFiles([]);
    setShowForm(false);
    setFormData({
      title: '',
      description: '',
      budget_min: '',
      budget_max: '',
      surface_area: '',
      location: '',
      city: '',
      country_id: '',
    });
    locationPicker.reset();
  };

  const handleCloseForm = () => {
    resetForm();
    if (isCreateOnlyView) {
      navigate(`${basePath}?view=list`);
    }
  };

  const handleImageFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handlePlanFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setPlanFiles((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleRender3DFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setRender3DFiles((prev) => [...prev, ...files]);
    event.target.value = '';
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

  const handleRemoveRender3D = async (path) => {
    if (!editingProject?.uuid || !path) return;
    if (!window.confirm('Supprimer ce visuel 3D ?')) return;
    try {
      await service.updateConstructionProject(editingProject.uuid, { remove_render_3d: [path] });
      setExistingRender3D((prev) => prev.filter((item) => item !== path));
    } catch (err) {
      console.error('Erreur lors de la suppression du visuel 3D:', err);
      setError('Erreur lors de la suppression du visuel 3D.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        budget_min: formData.budget_min ? Number(formData.budget_min) : null,
        budget_max: formData.budget_max ? Number(formData.budget_max) : null,
        surface_area: formData.surface_area ? Number(formData.surface_area) : null,
        country_id: formData.country_id || null,
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

      if (editingProject?.uuid) {
        await service.updateConstructionProject(editingProject.uuid, requestData);
      } else {
        await service.createConstructionProject(requestData);
      }
      await refreshData();
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
      await refreshData();
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const handleSpotlightChange = (field, value) => {
    setSpotlightForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpotlightVideoChange = (index, field, value) => {
    setSpotlightForm((prev) => ({
      ...prev,
      videos: prev.videos.map((video, videoIndex) =>
        videoIndex === index ? { ...video, [field]: value } : video,
      ),
    }));
  };

  const handleSpotlightSubmit = async (event) => {
    event.preventDefault();
    if (user?.role !== 'admin') return;
    setSpotlightSaving(true);
    setError('');

    try {
      const payload = {
        section_title: spotlightForm.section_title,
        section_description: spotlightForm.section_description,
        videos: spotlightForm.videos.filter(
          (video) => video.url.trim() && video.title.trim() && video.description.trim(),
        ),
      };

      if (payload.videos.length !== 2) {
        setError('Veuillez renseigner exactement deux videos avec lien, titre et description.');
        setSpotlightSaving(false);
        return;
      }

      const response = await adminService.updateConstructionSpotlight(payload);
      const spotlight = response?.data?.spotlight;
      if (spotlight) {
        setSpotlightForm({
          section_title: spotlight.title || '',
          section_description: spotlight.description || '',
          videos: (spotlight.videos || []).slice(0, 2).map((video) => ({
            url: video?.url || '',
            title: video?.title || '',
            description: video?.description || '',
          })),
        });
      }
    } catch (err) {
      console.error('Erreur enregistrement spotlight construction:', err);
      setError(err.response?.data?.message || 'Erreur lors de l’enregistrement du contenu video.');
    } finally {
      setSpotlightSaving(false);
    }
  };

  const getCoverImage = (project) => {
    const images = Array.isArray(project?.images_path) ? project.images_path : [];
    if (images.length === 0) return '';
    return getStorageUrl(images[0]);
  };

  const projectChecklist = useMemo(() => [
    { label: 'Titre du projet', done: formData.title.trim().length > 0 },
    { label: 'Description', done: formData.description.trim().length > 0 },
  ], [formData]);
  const projectCompletedCount = projectChecklist.filter((item) => item.done).length;
  const projectCompletionPercent = Math.round((projectCompletedCount / projectChecklist.length) * 100);

  const renderNewFilePreview = (files, onRemove, label) => (
    files.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-3">{label} ({files.length})</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative">
              <img src={URL.createObjectURL(file)} alt={`${label} ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
              <button type="button" onClick={() => onRemove(index)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
            </div>
          ))}
        </div>
      </div>
    )
  );

  const spotlightChecklist = useMemo(() => {
    const items = [
      { label: 'Titre de section', done: spotlightForm.section_title.trim().length > 0 },
      { label: 'Description de section', done: spotlightForm.section_description.trim().length > 0 },
    ];
    spotlightForm.videos.forEach((video, index) => {
      items.push({
        label: `Video ${index + 1} complete`,
        done: Boolean(video.url.trim() && video.title.trim() && video.description.trim()),
      });
    });
    return items;
  }, [spotlightForm]);
  const spotlightCompletedCount = spotlightChecklist.filter((item) => item.done).length;
  const spotlightCompletionPercent = Math.round((spotlightCompletedCount / spotlightChecklist.length) * 100);

  const statusBadge = (status) => {
    if (['published', 'approved', 'completed'].includes(status)) {
      return { label: status === 'completed' ? 'Termine' : status === 'approved' ? 'Approuve' : 'Publie', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (status === 'submitted') return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
    if (status === 'rejected') return { label: 'Rejete', className: 'bg-rose-100 text-rose-700' };
    if (['in_study', 'quoted', 'in_progress'].includes(status)) {
      return { label: status === 'in_study' ? 'En etude' : status === 'quoted' ? 'Devis envoye' : 'En cours', className: 'bg-amber-100 text-amber-700' };
    }
    return { label: status || 'Inconnu', className: 'bg-slate-100 text-slate-700' };
  };

  const handleApprovePublication = async (project) => {
    if (!project?.uuid) return;
    try {
      await service.updateConstructionProject(project.uuid, { status: 'published' });
      await refreshData();
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
      await refreshData();
    } catch (err) {
      console.error('Erreur rejet:', err);
      setError('Erreur lors du rejet.');
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
              <p className="chip">{roleLabel}</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">
                {isCreateOnlyView
                  ? 'Ajout de projet de construction'
                  : isVideoOnlyView
                    ? 'Section video publique'
                    : 'Liste des projets de construction'}
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                {isCreateOnlyView
                  ? 'Renseignez uniquement le formulaire d’ajout du projet de construction.'
                  : isVideoOnlyView
                    ? 'Configurez le titre, la description et les deux videos mises en avant sur la page publique Construction.'
                    : 'Consultez, recherchez et validez les projets de construction du catalogue.'}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {isVideoOnlyView && user?.role !== 'admin' && (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Cette section est reservee aux administrateurs.
              </div>
            )}

            {isVideoOnlyView && user?.role === 'admin' && (
              <form onSubmit={handleSpotlightSubmit} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-[rgba(15,42,46,0.6)]">
                    <span className="whitespace-nowrap">{spotlightCompletedCount}/{spotlightChecklist.length} champs completes</span>
                    <div className="h-1.5 w-20 sm:w-28 rounded-full bg-[rgba(15,42,46,0.08)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${spotlightCompletionPercent === 100 ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`}
                        style={{ width: `${spotlightCompletionPercent}%` }}
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
                          <h2 className="text-lg font-semibold">Contenu de la section</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre et description affiches au-dessus des videos sur la page publique</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Titre de section *</label>
                        <input
                          value={spotlightForm.section_title}
                          onChange={(e) => handleSpotlightChange('section_title', e.target.value)}
                          placeholder="Ex. Ne ratez pas cette offre exceptionnelle"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description de section *</label>
                        <textarea
                          rows="3"
                          value={spotlightForm.section_description}
                          onChange={(e) => handleSpotlightChange('section_description', e.target.value)}
                          placeholder="Un texte court qui donne envie de regarder les videos"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                    </div>

                    {spotlightForm.videos.map((video, index) => {
                      const thumbKey = `video-${index}`;
                      const thumbnail = getYoutubeThumbnail(video.url);
                      const showThumbnail = thumbnail && !brokenThumbs[thumbKey];
                      return (
                        <div key={`spotlight-video-${index}`} className="surface-panel p-6 space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">{index + 2}</div>
                            <div>
                              <h2 className="text-lg font-semibold">Video {index + 1}</h2>
                              <p className="text-xs text-[rgba(15,42,46,0.55)]">Lien Youtube, titre et description</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-4">
                            <div className="rounded-xl overflow-hidden bg-[rgba(15,42,46,0.08)] aspect-video flex items-center justify-center sm:h-auto">
                              {showThumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={`Miniature video ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={() => setBrokenThumbs((prev) => ({ ...prev, [thumbKey]: true }))}
                                />
                              ) : (
                                <PlayCircle className="h-8 w-8 text-[rgba(15,42,46,0.3)]" />
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Lien video *</label>
                              <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.4)]" />
                                <input
                                  value={video.url}
                                  onChange={(e) => handleSpotlightVideoChange(index, 'url', e.target.value)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Titre video *</label>
                            <input
                              value={video.title}
                              onChange={(e) => handleSpotlightVideoChange(index, 'title', e.target.value)}
                              placeholder="Ex. Offre speciale 1"
                              className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Description video *</label>
                            <textarea
                              rows="3"
                              value={video.description}
                              onChange={(e) => handleSpotlightVideoChange(index, 'description', e.target.value)}
                              placeholder="Un resume de ce que le visiteur va decouvrir dans la video"
                              className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                              required
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6">
                    <div className="surface-panel p-5 space-y-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Apercu public</p>
                      <div>
                        <p className="text-sm font-semibold text-[rgb(var(--ink))]">{spotlightForm.section_title || 'Titre de section'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.6)] mt-1 line-clamp-3">
                          {spotlightForm.section_description || 'Description de section'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {spotlightForm.videos.map((video, index) => {
                          const thumbKey = `preview-${index}`;
                          const thumbnail = getYoutubeThumbnail(video.url);
                          const showThumbnail = thumbnail && !brokenThumbs[thumbKey];
                          return (
                            <div key={thumbKey} className="space-y-1.5 min-w-0">
                              <div className="rounded-lg overflow-hidden bg-[rgba(15,42,46,0.08)] aspect-video flex items-center justify-center">
                                {showThumbnail ? (
                                  <img
                                    src={thumbnail}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={() => setBrokenThumbs((prev) => ({ ...prev, [thumbKey]: true }))}
                                  />
                                ) : (
                                  <PlayCircle className="h-5 w-5 text-[rgba(15,42,46,0.3)]" />
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-[rgb(var(--ink))] truncate">{video.title || `Video ${index + 1}`}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Champs requis ({spotlightCompletedCount}/{spotlightChecklist.length})</p>
                      <ul className="space-y-2">
                        {spotlightChecklist.map((item) => (
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

                    <div className="surface-panel p-5">
                      <button type="submit" className="btn-primary w-full justify-center" disabled={spotlightSaving}>
                        <Save className="h-4 w-4" />
                        {spotlightSaving ? 'Enregistrement...' : 'Enregistrer la section video'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {!isCreateOnlyView && !isListOnlyView && !isVideoOnlyView && (
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
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre et description du projet de construction</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Titre *</label>
                        <input
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Ex. Residence familiale - Abidjan"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description *</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows="4"
                          placeholder="Decrivez le projet : type de construction, atouts, environnement..."
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                        <div>
                          <h2 className="text-lg font-semibold">Budget et caracteristiques</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Fourchette de prix, surface et emplacement</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Budget min</label>
                          <input
                            type="number"
                            step="0.01"
                            name="budget_min"
                            value={formData.budget_min}
                            onChange={handleChange}
                            min="0"
                            placeholder="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Budget max</label>
                          <input
                            type="number"
                            step="0.01"
                            name="budget_max"
                            value={formData.budget_max}
                            onChange={handleChange}
                            min="0"
                            placeholder="0"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
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
                          <label className="block text-sm font-medium mb-2">Pays</label>
                          <select
                            name="country_id"
                            value={formData.country_id}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          >
                            <option value="">Pays (optionnel)</option>
                            {countries.map((country) => (
                              <option key={country.id} value={country.id}>{country.flag ? `${country.flag} ` : ''}{country.name}</option>
                            ))}
                          </select>
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
                                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[rgba(15,42,46,0.4)]" />
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
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">3</div>
                        <div>
                          <h2 className="text-lg font-semibold">Visuels du projet</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Photos, plans et rendus 3D</p>
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
                          <input type="file" multiple accept="image/*" onChange={handleImageFiles} className="hidden" id="construction-image-upload" />
                          <label htmlFor="construction-image-upload" className="btn-primary cursor-pointer inline-flex">
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
                                  <img src={getStorageUrl(path)} alt="Image projet" className="w-full h-20 object-cover rounded-lg" />
                                  <button type="button" onClick={() => handleRemoveImage(path)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs">x</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm font-medium">Plans de construction <span className="text-[rgba(15,42,46,0.45)] font-normal">({planFiles.length + existingPlans.length})</span></p>
                        <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-8 text-center bg-[rgba(15,42,46,0.015)]">
                          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <FileWarning className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Plans techniques</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Images ou PDF - optionnel</p>
                          <input type="file" multiple accept="image/*,.pdf" onChange={handlePlanFiles} className="hidden" id="construction-plan-upload" />
                          <label htmlFor="construction-plan-upload" className="btn-ghost cursor-pointer inline-flex">
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
                                        {path.split('/').pop()}
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
                            <Building className="h-5 w-5 text-[rgba(15,42,46,0.5)]" />
                          </div>
                          <p className="text-sm font-medium mb-1">Rendus 3D et visuels de projection</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] mb-4">Optionnel</p>
                          <input type="file" multiple accept="image/*,.pdf" onChange={handleRender3DFiles} className="hidden" id="construction-render3d-upload" />
                          <label htmlFor="construction-render3d-upload" className="btn-ghost cursor-pointer inline-flex">
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
                                        {path.split('/').pop()}
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
                            <HardHat className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[rgb(var(--ink))] truncate">{formData.title || 'Titre du projet'}</p>
                          <p className="text-xs text-[rgba(15,42,46,0.55)] truncate">{formData.city || formData.location || 'Localisation non definie'}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-semibold text-[rgb(var(--ink))]">
                        {formatFcfaRange(formData.budget_min, formData.budget_max)}
                      </p>
                      {formData.surface_area && (
                        <p className="text-xs text-[rgba(15,42,46,0.6)]">Surface : {formData.surface_area} m2</p>
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

            {!isCreateOnlyView && !isListOnlyView && !isVideoOnlyView && !showForm && (
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

            {!isCreateOnlyView && !isVideoOnlyView && !showForm && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { key: 'total', label: 'Projets', value: stats.total, icon: HardHat },
                  { key: 'published', label: 'Publies', value: stats.published, icon: CheckCircle },
                  { key: 'pending', label: 'En attente', value: stats.pending, icon: Search, highlight: stats.pending > 0 },
                  { key: 'rejected', label: 'Rejetes', value: stats.rejected, icon: XCircle },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {loading && stats.total === 0 ? '...' : Number(kpi.value || 0).toLocaleString()}
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

            {!isCreateOnlyView && !isVideoOnlyView && !showForm && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou localisation..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0">
                  <option value="all">Tous statuts</option>
                  <option value="published">Publies</option>
                  <option value="submitted">En attente</option>
                  <option value="rejected">Rejetes</option>
                </select>
                {(searchInput || filterStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(''); setFilterStatus('all'); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
              </div>
            )}

            {!isCreateOnlyView && !isVideoOnlyView && !showForm && (
              <>
                {/* Liste - cartes empilees sur mobile (pas de scroll horizontal) */}
                <div className="surface-panel overflow-hidden md:hidden">
                  <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4">
                          <div className="h-24 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                        </div>
                      ))
                    ) : projects.length === 0 ? (
                      <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                        Aucun projet ne correspond a ces criteres.
                      </div>
                    ) : (
                      projects.map((project) => (
                        <div key={project.uuid} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                              {getCoverImage(project) && !brokenCovers[project.uuid] ? (
                                <img
                                  src={getCoverImage(project)}
                                  alt={project.title}
                                  className="w-full h-full object-cover"
                                  onError={() => setBrokenCovers((prev) => ({ ...prev, [project.uuid]: true }))}
                                />
                              ) : (
                                <HardHat className="h-6 w-6 text-[rgba(15,42,46,0.4)]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-[rgb(var(--ink))] truncate">{project.title || 'Projet construction'}</p>
                                <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${statusBadge(project.status).className}`}>
                                  {statusBadge(project.status).label}
                                </span>
                              </div>
                              <p className="text-xs text-[rgba(15,42,46,0.6)] mt-1">
                                {project.surface_area ? `${project.surface_area} m2` : 'Surface non definie'}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-[rgba(15,42,46,0.6)] space-y-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{project.location || project.city || 'Localisation inconnue'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Banknote className="h-3.5 w-3.5 shrink-0" />
                              {formatFcfaRange(project.budget_min, project.budget_max)}
                            </div>
                            <p className="truncate">Agent : {project.agent ? `${project.agent.first_name} ${project.agent.last_name}` : 'Non assigne'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {project.status === 'submitted' && (
                              <>
                                <button onClick={() => handleApprovePublication(project)} className="btn-primary flex-1 text-xs">Approuver</button>
                                <button onClick={() => handleRejectPublication(project)} className="btn-ghost flex-1 text-xs">Rejeter</button>
                              </>
                            )}
                            <button onClick={() => handleViewProject(project)} className="btn-ghost px-3"><Eye className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleEdit(project)} className="btn-ghost px-3">Modifier</button>
                            <button onClick={() => handleDelete(project)} className="btn-ghost px-3 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!loading && totalProjects > 0 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {page} sur {lastPage}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                          disabled={page >= lastPage}
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
                        <tr className="border-b border-[rgba(15,42,46,0.08)] text-left text-xs uppercase tracking-wide text-[rgba(15,42,46,0.5)]">
                          <th className="px-5 py-3.5 font-medium">Projet</th>
                          <th className="px-5 py-3.5 font-medium">Agent</th>
                          <th className="px-5 py-3.5 font-medium">Localisation</th>
                          <th className="px-5 py-3.5 font-medium">Budget</th>
                          <th className="px-5 py-3.5 font-medium">Statut</th>
                          <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(15,42,46,0.06)]">
                        {loading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                              <td colSpan={6} className="px-5 py-4">
                                <div className="h-10 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : projects.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                              Aucun projet ne correspond a ces criteres.
                            </td>
                          </tr>
                        ) : (
                          projects.map((project) => (
                            <tr key={project.uuid} className="hover:bg-[rgba(15,42,46,0.02)] transition">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                                    {getCoverImage(project) && !brokenCovers[project.uuid] ? (
                                      <img
                                        src={getCoverImage(project)}
                                        alt={project.title}
                                        className="w-full h-full object-cover"
                                        onError={() => setBrokenCovers((prev) => ({ ...prev, [project.uuid]: true }))}
                                      />
                                    ) : (
                                      <HardHat className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-[rgb(var(--ink))] truncate">{project.title || 'Projet construction'}</p>
                                    <p className="text-xs text-[rgba(15,42,46,0.55)]">
                                      {project.surface_area ? `${project.surface_area} m2` : 'Surface non definie'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)]">
                                {project.agent ? `${project.agent.first_name} ${project.agent.last_name}` : 'Non assigne'}
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)] max-w-[220px] truncate">
                                {project.location || project.city || 'Inconnue'}
                              </td>
                              <td className="px-5 py-4 text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                                {formatFcfaRange(project.budget_min, project.budget_max)}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(project.status).className}`}>
                                  {statusBadge(project.status).label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  {project.status === 'submitted' && (
                                    <>
                                      <button onClick={() => handleApprovePublication(project)} title="Approuver" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition">
                                        <CheckCircle className="h-4 w-4" />
                                      </button>
                                      <button onClick={() => handleRejectPublication(project)} title="Rejeter" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-rose-600 hover:bg-rose-50 transition">
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => handleViewProject(project)} title="Details" className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white transition">
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

                  {!loading && totalProjects > 0 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">
                        {totalProjects} projet{totalProjects > 1 ? 's' : ''} - page {page} sur {lastPage}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                          disabled={page >= lastPage}
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
                        {formatFcfaRange(selectedProject.budget_min, selectedProject.budget_max)}
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
