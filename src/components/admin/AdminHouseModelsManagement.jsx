import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Header from "../common/Header";
import Sidebar from "../common/Sidebar";
import { adminService } from "../../services/api";

const emptyForm = {
  title: "",
  short_description: "",
  description: "",
  display_order: 0,
  is_active: true,
};

const defaultSectionForm = {
  title: "",
  description: "",
  videos: [""],
};

const AdminHouseModelsManagement = () => {
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

  const loadModels = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await adminService.getHouseModels();
      const payload = response?.data ?? {};
      const list = payload?.data || [];
      setModels(Array.isArray(list) ? list : []);
      setSectionForm({
        title: payload?.section?.title || "Modeles de maison",
        description:
          payload?.section?.description ||
          "Decouvrez nos modeles de maison, penses pour allier style, confort et fonctionnalite dans chaque projet.",
        videos:
          Array.isArray(payload?.section?.videos) && payload.section.videos.length
            ? payload.section.videos
            : [""],
      });
    } catch (err) {
      console.error("Erreur chargement modeles:", err);
      setError("Impossible de charger les modeles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

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
      }
      await loadModels();
      resetForm();
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
              <h1 className="mt-3 text-3xl font-semibold">Modeles de maison</h1>
              <p className="mt-2 text-sm text-[rgba(15,42,46,0.6)]">
                Gere la section publique des modeles et les videos affichees sous
                cette section sur la page d'accueil.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">
                {error}
              </div>
            )}

            <form onSubmit={handleSectionSubmit} className="surface-panel space-y-5 p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Contenu de la section publique
                </h2>
                <p className="mt-1 text-sm text-[rgba(15,42,46,0.6)]">
                  Ce contenu s'affiche au-dessus des modeles de maison, ainsi que
                  dans la section video situee juste en dessous.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Titre de section
                  </label>
                  <input
                    required
                    value={sectionForm.title}
                    onChange={(e) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Paragraphe de section
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={sectionForm.description}
                    onChange={(e) =>
                      setSectionForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium">
                      Liens videos
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        setSectionForm((prev) => ({
                          ...prev,
                          videos: [...prev.videos, ""],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un lien
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sectionForm.videos.map((video, index) => (
                      <div key={`section-video-${index}`} className="flex gap-3">
                        <input
                          value={video}
                          onChange={(e) =>
                            setSectionForm((prev) => ({
                              ...prev,
                              videos: prev.videos.map((item, itemIndex) =>
                                itemIndex === index ? e.target.value : item,
                              ),
                            }))
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        />
                        {sectionForm.videos.length > 1 && (
                          <button
                            type="button"
                            className="btn-ghost text-[rgb(var(--clay))]"
                            onClick={() =>
                              setSectionForm((prev) => ({
                                ...prev,
                                videos: prev.videos.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[rgba(15,42,46,0.55)]">
                    Ajoutez un ou plusieurs liens video YouTube ou Vimeo. Vous
                    pourrez les modifier a tout moment.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={sectionSaving}>
                  <Save className="h-4 w-4" />
                  {sectionSaving ? "Enregistrement..." : "Enregistrer le contenu"}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Catalogue des modeles</h2>
                <p className="text-sm text-[rgba(15,42,46,0.6)]">
                  Ajoutez image, titre, description et ordre d'affichage.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowForm((prev) => !prev)}
              >
                <Plus className="h-4 w-4" />
                {showForm ? "Fermer le formulaire" : "Ajouter un modele"}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="surface-panel space-y-5 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Titre</label>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          display_order: Number(e.target.value || 0),
                        }))
                      }
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium">
                      Description courte
                    </label>
                    <textarea
                      rows="3"
                      value={formData.short_description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          short_description: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium">
                      Description detaillee
                    </label>
                    <textarea
                      rows="6"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Photo principale
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCoverImageFile(e.target.files?.[0] || null)
                      }
                      className="w-full text-sm"
                    />
                    {editingModel?.cover_image_url && (
                      <div className="mt-2 space-y-2">
                        <img
                          src={editingModel.cover_image_url}
                          alt={editingModel.title}
                          className="h-24 w-40 rounded-xl border border-[rgb(var(--line))] object-cover"
                        />
                        <label className="inline-flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={removeCover}
                            onChange={(e) => setRemoveCover(e.target.checked)}
                          />
                          Supprimer la photo actuelle
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Photos galerie
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setGalleryFiles(Array.from(e.target.files || []))
                      }
                      className="w-full text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">
                      Actif sur le site public
                    </label>
                  </div>
                </div>

                {existingGallery.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium">Galerie existante</p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {existingGallery.map((item) => (
                        <label
                          key={item.path}
                          className="surface-soft space-y-2 rounded-xl p-2"
                        >
                          <img
                            src={item.url}
                            alt="Galerie"
                            className="h-24 w-full rounded-lg object-cover"
                          />
                          <span className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={removeGallery.includes(item.path)}
                              onChange={() => toggleGalleryRemoval(item.path)}
                            />
                            Supprimer
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  {editingModel && (
                    <button type="button" className="btn-ghost" onClick={resetForm}>
                      Annuler
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            )}

            <div className="surface-panel p-6">
              {loading ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">Chargement...</p>
              ) : sortedModels.length === 0 ? (
                <p className="text-sm text-[rgba(15,42,46,0.5)]">
                  Aucun modele cree.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {sortedModels.map((model) => (
                    <div
                      key={model.uuid}
                      className="surface-soft space-y-4 rounded-2xl p-4"
                    >
                      <div className="h-48 overflow-hidden rounded-xl bg-[rgba(15,42,46,0.08)]">
                        {model.cover_image_url ? (
                          <img
                            src={model.cover_image_url}
                            alt={model.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-[rgba(15,42,46,0.5)]">
                            Pas d'image
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold">{model.title}</h3>
                          <span
                            className={`chip ${
                              model.is_active
                                ? ""
                                : "bg-[rgba(15,42,46,0.12)] text-[rgba(15,42,46,0.65)]"
                            }`}
                          >
                            {model.is_active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm text-[rgba(15,42,46,0.65)]">
                          {model.short_description || "Aucune description courte."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[rgba(15,42,46,0.55)]">
                        <span>Ordre: {model.display_order ?? 0}</span>
                        <span>
                          {Array.isArray(model.gallery_images)
                            ? model.gallery_images.length
                            : 0}{" "}
                          photo(s) galerie
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleEdit(model)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn-ghost text-[rgb(var(--clay))]"
                          onClick={() => handleDelete(model)}
                        >
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
    </div>
  );
};

export default AdminHouseModelsManagement;
