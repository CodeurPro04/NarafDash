import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Save,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Building,
  ShieldCheck,
  EyeOff,
  Image as ImageIcon,
  Upload,
  CheckCircle,
} from "lucide-react";
import Header from "../common/Header";
import Sidebar from "../common/Sidebar";
import { adminService } from "../../services/api";

const PER_PAGE = 12;

const emptyForm = {
  title: "",
  short_description: "",
  description: "",
  display_order: 0,
  is_active: true,
};

const createEmptyShowcaseItem = () => ({
  title: "",
  excerpt: "",
  image_url: "",
  link: "",
});

const mapSectionItems = (items) => {
  if (!Array.isArray(items) || !items.length) {
    return [createEmptyShowcaseItem()];
  }

  return items.map((item) => ({
    title: item?.title || "",
    excerpt: item?.excerpt || "",
    image_url: item?.image_url || "",
    link: item?.link || "",
  }));
};

const defaultSectionForm = {
  title: "",
  description: "",
  videos: [""],
  showcaseSections: [
    {
      title: "Besoin d'un bien",
      button_label: "Voir tous les articles",
      button_link: "/properties",
      items: Array.from({ length: 4 }, () => createEmptyShowcaseItem()),
    },
    {
      title: "Besoin d'un projet de construction",
      button_label: "Voir tous les projets",
      button_link: "/construction",
      items: Array.from({ length: 4 }, () => createEmptyShowcaseItem()),
    },
    {
      title: "J'investis dans un projet",
      button_label: "Voir les opportunites",
      button_link: "/investment",
      items: Array.from({ length: 4 }, () => createEmptyShowcaseItem()),
    },
  ],
};

const AdminHouseModelsManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const viewParam = new URLSearchParams(location.search).get("view");

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);
  const [removeGallery, setRemoveGallery] = useState([]);
  const [removeCover, setRemoveCover] = useState(false);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalModels, setTotalModels] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const isCreateOnlyView = showForm;
  const isListOnlyView = viewParam === "list" && !showForm;

  const sortedModels = useMemo(
    () =>
      [...models].sort((a, b) => {
        const orderA = Number(a.display_order || 0);
        const orderB = Number(b.display_order || 0);
        if (orderA !== orderB) return orderA - orderB;
        return String(a.title || "").localeCompare(String(b.title || ""));
      }),
    [models],
  );

  useEffect(() => {
    const nextView = new URLSearchParams(location.search).get("view");
    if (nextView === "create") {
      // Navigation explicite vers "Ajouter un modele" : on repart toujours
      // d'un formulaire vierge, meme si une edition etait en cours.
      setEditingModel(null);
      setFormData(emptyForm);
      setCoverImageFile(null);
      setGalleryFiles([]);
      setExistingGallery([]);
      setRemoveGallery([]);
      setRemoveCover(false);
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Recherche debouncee (350ms)
  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, statusFilter]);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminService.getHouseModels({
        page,
        per_page: PER_PAGE,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      const payload = response?.data ?? {};
      const paginator = payload?.data ?? {};
      const list = paginator?.data || paginator;
      setModels(Array.isArray(list) ? list : []);
      setLastPage(paginator?.last_page || 1);
      setTotalModels(paginator?.total ?? (Array.isArray(list) ? list.length : 0));
      if (payload?.stats) {
        setStats({
          total: payload.stats.total || 0,
          active: payload.stats.active || 0,
          inactive: payload.stats.inactive || 0,
        });
      }
      setSectionForm({
        title: payload?.section?.title || "Modeles de maison",
        description:
          payload?.section?.description ||
          "Decouvrez nos modeles de maison, penses pour allier style, confort et fonctionnalite dans chaque projet.",
        videos:
          Array.isArray(payload?.section?.videos) && payload.section.videos.length
            ? payload.section.videos
            : [""],
        showcaseSections:
          Array.isArray(payload?.section?.showcase_sections) &&
          payload.section.showcase_sections.length
            ? defaultSectionForm.showcaseSections.map((fallbackSection, sectionIndex) => {
                const section = payload.section.showcase_sections?.[sectionIndex] || {};
                return ({
                title: section?.title || fallbackSection.title,
                button_label: section?.button_label || fallbackSection.button_label,
                button_link: section?.button_link || fallbackSection.button_link,
                items: mapSectionItems(section?.items),
                });
              })
            : defaultSectionForm.showcaseSections,
      });
    } catch (err) {
      console.error("Erreur chargement modeles:", err);
      setError("Impossible de charger les modeles.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingModel(null);
    setFormData(emptyForm);
    setCoverImageFile(null);
    setGalleryFiles([]);
    setExistingGallery([]);
    setRemoveGallery([]);
    setRemoveCover(false);
    setShowForm(false);
  };

  const handleEdit = (model) => {
    setEditingModel(model);
    setFormData({
      title: model.title || "",
      short_description: model.short_description || "",
      description: model.description || "",
      display_order: Number(model.display_order || 0),
      is_active: Boolean(model.is_active),
    });
    setCoverImageFile(null);
    setGalleryFiles([]);
    setExistingGallery(
      Array.isArray(model.gallery_images)
        ? model.gallery_images.map((path, index) => ({
            path,
            url: model.gallery_image_urls?.[index] || "",
          }))
        : [],
    );
    setRemoveGallery([]);
    setRemoveCover(false);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    resetForm();
    if (viewParam === "create") {
      navigate("/admin/house-models?view=list");
    }
  };

  const handleStartCreate = () => {
    setEditingModel(null);
    setFormData(emptyForm);
    setCoverImageFile(null);
    setGalleryFiles([]);
    setExistingGallery([]);
    setRemoveGallery([]);
    setRemoveCover(false);
    setShowForm(true);
  };

  const handleCoverFileChange = (event) => {
    setCoverImageFile(event.target.files?.[0] || null);
    setRemoveCover(false);
  };

  const clearSelectedCover = () => setCoverImageFile(null);

  const handleGalleryFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setGalleryFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const removeNewGalleryFile = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const coverPreviewUrl = useMemo(
    () => (coverImageFile ? URL.createObjectURL(coverImageFile) : null),
    [coverImageFile],
  );

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  const remainingExistingGalleryCount = existingGallery.filter(
    (item) => !removeGallery.includes(item.path),
  ).length;

  const requiredChecklist = useMemo(() => {
    const hasCover = Boolean(coverImageFile) || (Boolean(editingModel?.cover_image_url) && !removeCover);
    const hasGallery = galleryFiles.length > 0 || remainingExistingGalleryCount > 0;
    return [
      { label: "Titre du modele", done: formData.title.trim().length > 0 },
      { label: "Description courte", done: formData.short_description.trim().length > 0 },
      { label: "Photo principale", done: hasCover },
      { label: "Photos galerie", done: hasGallery },
    ];
  }, [formData, coverImageFile, editingModel, removeCover, galleryFiles, remainingExistingGalleryCount]);

  const completedRequiredCount = requiredChecklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedRequiredCount / requiredChecklist.length) * 100);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const requestData = new FormData();
    requestData.append("title", formData.title);
    requestData.append("short_description", formData.short_description || "");
    requestData.append("description", formData.description || "");
    requestData.append("display_order", String(formData.display_order || 0));
    requestData.append("is_active", formData.is_active ? "true" : "false");

    if (coverImageFile) {
      requestData.append("cover_image", coverImageFile);
    }

    if (removeCover) {
      requestData.append("remove_cover_image", "true");
    }

    removeGallery.forEach((path) => {
      requestData.append("remove_gallery_images[]", path);
    });

    galleryFiles.forEach((file) => {
      requestData.append("gallery_images[]", file);
    });

    try {
      if (editingModel?.uuid) {
        await adminService.updateHouseModel(editingModel.uuid, requestData);
      } else {
        await adminService.createHouseModel(requestData);
        setPage(1);
      }
      resetForm();
      await loadModels();
    } catch (err) {
      console.error("Erreur enregistrement modele:", err);
      setError(
        err?.response?.data?.message || "Erreur lors de l'enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (model) => {
    if (!model?.uuid) return;
    if (!window.confirm("Supprimer ce modele ?")) return;

    try {
      await adminService.deleteHouseModel(model.uuid);
      await loadModels();
    } catch (err) {
      console.error("Erreur suppression modele:", err);
      setError("Erreur lors de la suppression.");
    }
  };

  const toggleGalleryRemoval = (path) => {
    setRemoveGallery((prev) =>
      prev.includes(path)
        ? prev.filter((item) => item !== path)
        : [...prev, path],
    );
  };

  const addShowcaseCard = (sectionIndex) => {
    setSectionForm((prev) => ({
      ...prev,
      showcaseSections: prev.showcaseSections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              items: [...section.items, createEmptyShowcaseItem()],
            }
          : section,
      ),
    }));
  };

  const removeShowcaseCard = (sectionIndex, itemIndex) => {
    setSectionForm((prev) => ({
      ...prev,
      showcaseSections: prev.showcaseSections.map((section, index) => {
        if (index !== sectionIndex) return section;
        if ((section.items || []).length <= 1) return section;
        return {
          ...section,
          items: section.items.filter((_, currentIndex) => currentIndex !== itemIndex),
        };
      }),
    }));
  };

  const handleSectionSubmit = async (event) => {
    event.preventDefault();
    setSectionSaving(true);
    setError("");

    try {
      const response = await adminService.updateHouseModelsSection({
        section_title: sectionForm.title,
        section_description: sectionForm.description,
        video_urls: sectionForm.videos.filter((video) =>
          String(video || "").trim(),
        ),
        showcase_sections: sectionForm.showcaseSections.map((section) => ({
          title: section.title,
          button_label: section.button_label,
          button_link: section.button_link,
          items: section.items.map((item) => ({
            title: item.title,
            excerpt: item.excerpt,
            image_url: item.image_url,
            link: item.link,
          })),
        })),
      });
      const section = response?.data?.section;
      if (section) {
        setSectionForm({
          title: section.title || "",
          description: section.description || "",
          videos:
            Array.isArray(section.videos) && section.videos.length
              ? section.videos
              : [""],
          showcaseSections:
            Array.isArray(section.showcase_sections) &&
            section.showcase_sections.length
              ? defaultSectionForm.showcaseSections.map((fallbackSection, sectionIndex) => {
                  const currentSection = section.showcase_sections?.[sectionIndex] || {};
                  return ({
                  title: currentSection?.title || fallbackSection.title,
                  button_label: currentSection?.button_label || fallbackSection.button_label,
                  button_link: currentSection?.button_link || fallbackSection.button_link,
                  items: mapSectionItems(currentSection?.items),
                  });
                })
              : defaultSectionForm.showcaseSections,
        });
      }
    } catch (err) {
      console.error("Erreur enregistrement section modeles:", err);
      setError(
        err?.response?.data?.message ||
          "Erreur lors de l'enregistrement de la section.",
      );
    } finally {
      setSectionSaving(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-[rgb(var(--ink))]">
                {isCreateOnlyView ? (editingModel ? "Modifier le modele" : "Ajouter un modele") : "Modeles de maison"}
              </h1>
              <p className="mt-2 text-sm text-[rgba(15,42,46,0.6)]">
                {isCreateOnlyView
                  ? "Renseignez image, titre, description et ordre d'affichage du modele."
                  : "Consultez et gerez le catalogue des modeles de maison affiches sur le site public."}
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">
                {error}
              </div>
            )}

            {!isCreateOnlyView && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { key: "total", label: "Modeles", value: stats.total, icon: Building },
                  { key: "active", label: "Actifs", value: stats.active, icon: ShieldCheck },
                  { key: "inactive", label: "Inactifs", value: stats.inactive, icon: EyeOff },
                ].map((kpi) => (
                  <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                        <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                          {loading && stats.total === 0 ? "..." : Number(kpi.value || 0).toLocaleString()}
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

            {!isCreateOnlyView && (
              <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou description..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
                >
                  <option value="all">Tous statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
                {(searchInput || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setStatusFilter("all"); }}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reinitialiser
                  </button>
                )}
                {!isListOnlyView && (
                  <button type="button" className="btn-primary w-full md:w-auto shrink-0" onClick={handleStartCreate}>
                    <Plus className="h-4 w-4" />
                    Ajouter un modele
                  </button>
                )}
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
                    <span className="whitespace-nowrap">{completedRequiredCount}/{requiredChecklist.length} elements recommandes</span>
                    <div className="h-1.5 w-20 sm:w-28 rounded-full bg-[rgba(15,42,46,0.08)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completionPercent === 100 ? "bg-emerald-500" : "bg-[rgb(var(--clay))]"}`}
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                  <div className="space-y-6 min-w-0">
                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">1</div>
                        <div>
                          <h2 className="text-lg font-semibold">Informations generales</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre, ordre d'affichage et descriptions</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Titre *</label>
                          <input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="Ex. Villa moderne T4"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Ordre d'affichage</label>
                          <input
                            type="number"
                            min="0"
                            value={formData.display_order}
                            onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value || 0) }))}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                          <p className="mt-1.5 text-xs text-[rgba(15,42,46,0.5)]">Les modeles avec un ordre plus petit apparaissent en premier.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Visibilite</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[{ value: true, label: "Actif" }, { value: false, label: "Inactif" }].map((option) => (
                              <button
                                key={String(option.value)}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, is_active: option.value }))}
                                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                                  formData.is_active === option.value
                                    ? "bg-[rgb(var(--ink))] text-white border-[rgb(var(--ink))]"
                                    : "bg-white/70 border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-[rgba(15,42,46,0.4)]"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Description courte</label>
                          <textarea
                            rows="3"
                            value={formData.short_description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                            placeholder="Une phrase d'accroche affichee dans la liste et les apercus"
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Description detaillee</label>
                          <textarea
                            rows="6"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Presentez le modele : style, agencement, points forts..."
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                        <div>
                          <h2 className="text-lg font-semibold">Visuels</h2>
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Photo principale et galerie du modele</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Photo principale</label>
                        {coverPreviewUrl ? (
                          <div className="relative inline-block">
                            <img src={coverPreviewUrl} alt="Nouvelle photo principale" className="h-32 w-52 rounded-xl border border-[rgb(var(--line))] object-cover" />
                            <button
                              type="button"
                              onClick={clearSelectedCover}
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs flex items-center justify-center"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : editingModel?.cover_image_url && !removeCover ? (
                          <div className="space-y-2">
                            <div className="relative inline-block">
                              <img src={editingModel.cover_image_url} alt={editingModel.title} className="h-32 w-52 rounded-xl border border-[rgb(var(--line))] object-cover" />
                              <button
                                type="button"
                                onClick={() => setRemoveCover(true)}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs flex items-center justify-center"
                                title="Supprimer la photo actuelle"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">Cliquez sur la croix pour remplacer la photo actuelle.</p>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-2 h-32 w-52 rounded-xl border-2 border-dashed border-[rgb(var(--line))] text-[rgba(15,42,46,0.45)] cursor-pointer hover:border-[rgba(15,42,46,0.4)] hover:text-[rgba(15,42,46,0.6)] transition">
                            <ImageIcon className="h-6 w-6" />
                            <span className="text-xs">Choisir une image</span>
                            <input type="file" accept="image/*" onChange={handleCoverFileChange} className="hidden" />
                          </label>
                        )}
                        {removeCover && !coverPreviewUrl && (
                          <p className="mt-2 text-xs text-[rgb(var(--clay))]">La photo actuelle sera supprimee a l'enregistrement.</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">Photos galerie</label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--clay))] cursor-pointer hover:underline">
                            <Upload className="h-3.5 w-3.5" />
                            Ajouter des photos
                            <input type="file" accept="image/*" multiple onChange={handleGalleryFilesChange} className="hidden" />
                          </label>
                        </div>

                        {existingGallery.length === 0 && galleryFiles.length === 0 ? (
                          <p className="text-sm text-[rgba(15,42,46,0.4)] italic">Aucune photo de galerie pour le moment.</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {existingGallery.map((item, index) => {
                              const marked = removeGallery.includes(item.path);
                              return (
                                <div key={`${item.path}-${index}`} className="relative">
                                  <img
                                    src={item.url}
                                    alt="Galerie"
                                    className={`h-24 w-full rounded-lg object-cover ${marked ? "opacity-40" : ""}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleGalleryRemoval(item.path)}
                                    title={marked ? "Annuler la suppression" : "Supprimer"}
                                    className={`absolute -top-2 -right-2 h-6 w-6 rounded-full text-white text-xs flex items-center justify-center ${
                                      marked ? "bg-[rgba(15,42,46,0.5)]" : "bg-[rgb(var(--clay))]"
                                    }`}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                  {marked && (
                                    <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/60 text-white text-[10px] text-center py-0.5">
                                      A supprimer
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {galleryFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`} className="relative">
                                <img src={URL.createObjectURL(file)} alt={`Nouvelle photo ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeNewGalleryFile(index)}
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[rgb(var(--clay))] text-white text-xs flex items-center justify-center"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-emerald-600/80 text-white text-[10px] text-center py-0.5">
                                  Nouvelle
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6">
                    <div className="surface-panel p-5 space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(15,42,46,0.45)]">Apercu</p>
                      <div className="h-32 rounded-xl overflow-hidden bg-[rgba(15,42,46,0.06)] flex items-center justify-center">
                        {coverPreviewUrl || (editingModel?.cover_image_url && !removeCover) ? (
                          <img src={coverPreviewUrl || editingModel.cover_image_url} alt="Apercu" className="h-full w-full object-cover" />
                        ) : (
                          <Building className="h-8 w-8 text-[rgba(15,42,46,0.3)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[rgb(var(--ink))] truncate">{formData.title || "Titre du modele"}</p>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              formData.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {formData.is_active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-xs text-[rgba(15,42,46,0.55)] line-clamp-2 mt-1">
                          {formData.short_description || "La description courte apparaitra ici."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[rgba(15,42,46,0.5)] pt-2 border-t border-[rgba(15,42,46,0.08)]">
                        <span>Ordre : {formData.display_order}</span>
                        <span>{galleryFiles.length + remainingExistingGalleryCount} photo(s)</span>
                      </div>
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(15,42,46,0.45)]">A completer</p>
                      {requiredChecklist.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm">
                          <CheckCircle className={`h-4 w-4 shrink-0 ${item.done ? "text-emerald-500" : "text-[rgba(15,42,46,0.2)]"}`} />
                          <span className={item.done ? "text-[rgb(var(--ink))]" : "text-[rgba(15,42,46,0.5)]"}>{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? "Enregistrement..." : editingModel ? "Enregistrer les modifications" : "Creer le modele"}
                      </button>
                      <button type="button" className="btn-ghost w-full justify-center" onClick={handleCloseForm}>
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {!isCreateOnlyView && (
            <>
            {/* Liste - cartes empilees sur mobile */}
            <div className="surface-panel overflow-hidden md:hidden">
              <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="h-24 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                    </div>
                  ))
                ) : sortedModels.length === 0 ? (
                  <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                    Aucun modele ne correspond a ces criteres.
                  </div>
                ) : (
                  sortedModels.map((model) => (
                    <div key={model.uuid} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {model.cover_image_url ? (
                            <img src={model.cover_image_url} alt={model.title} className="w-full h-full object-cover" />
                          ) : (
                            <Building className="h-6 w-6 text-[rgba(15,42,46,0.4)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-[rgb(var(--ink))] truncate">{model.title || "Titre non defini"}</p>
                            <span
                              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                                model.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {model.is_active ? "Actif" : "Inactif"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[rgba(15,42,46,0.6)] line-clamp-2">
                            {model.short_description || "Aucune description courte."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[rgba(15,42,46,0.55)]">
                        <span>Ordre : {model.display_order ?? 0}</span>
                        <span>{Array.isArray(model.gallery_images) ? model.gallery_images.length : 0} photo(s) galerie</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleEdit(model)} className="btn-ghost flex-1 text-xs">Modifier</button>
                        <button onClick={() => handleDelete(model)} className="btn-ghost px-3 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {!loading && totalModels > 0 && (
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

            {/* Liste - tableau a partir de md */}
            <div className="surface-panel overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="border-b border-[rgba(15,42,46,0.08)] text-left">
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Modele</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Ordre</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Galerie</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Statut</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[rgba(15,42,46,0.06)]">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="h-12 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : sortedModels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                          Aucun modele ne correspond a ces criteres.
                        </td>
                      </tr>
                    ) : (
                      sortedModels.map((model) => (
                        <tr key={model.uuid} className="border-b border-[rgba(15,42,46,0.06)] last:border-0 hover:bg-[rgba(15,42,46,0.02)] transition">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 shrink-0 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                                {model.cover_image_url ? (
                                  <img src={model.cover_image_url} alt={model.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Building className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-[rgb(var(--ink))] truncate max-w-[240px]">{model.title || "Titre non defini"}</p>
                                <p className="text-xs text-[rgba(15,42,46,0.5)] truncate max-w-[240px]">
                                  {model.short_description || "Aucune description courte."}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[rgba(15,42,46,0.7)]">{model.display_order ?? 0}</td>
                          <td className="px-5 py-3.5 text-sm text-[rgba(15,42,46,0.7)]">
                            {Array.isArray(model.gallery_images) ? model.gallery_images.length : 0} photo(s)
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                                model.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {model.is_active ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEdit(model)}
                                title="Modifier"
                                className="h-8 px-2.5 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-xs text-[rgba(15,42,46,0.7)] hover:bg-white transition"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDelete(model)}
                                title="Supprimer"
                                className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                              >
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

              {!loading && totalModels > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">
                    {totalModels} modele{totalModels > 1 ? "s" : ""} - page {page} sur {lastPage}
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
    </div>
  );
};

export default AdminHouseModelsManagement;
