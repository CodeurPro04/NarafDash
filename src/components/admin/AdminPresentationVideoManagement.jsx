import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { useToast } from '../common/Toast';
import { Save, Plus, X, PlayCircle, Link2, Video } from 'lucide-react';

const getYoutubeThumbnail = (url) => {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
};

const defaultForm = {
  title: 'Videos de présentation',
  description:
    "Consulte les contenus video ajoutes depuis l'espace administrateur pour decouvrir l'univers ABI et ses modèles.",
  videos: [''],
};

const AdminPresentationVideoManagement = () => {
  const toast = useToast();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState({});

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await adminService.getPresentationVideo();
      const data = response?.data?.data ?? {};
      setForm({
        title: data.title || defaultForm.title,
        description: data.description || defaultForm.description,
        videos: Array.isArray(data.videos) && data.videos.length ? data.videos : [''],
      });
    } catch (err) {
      console.error('Erreur chargement section videos de presentation:', err);
      toast.error('Impossible de charger le contenu actuel.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoChange = (index, value) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.map((video, videoIndex) => (videoIndex === index ? value : video)),
    }));
  };

  const addVideo = () => {
    setForm((prev) => ({ ...prev, videos: [...prev.videos, ''] }));
  };

  const removeVideo = (index) => {
    setForm((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, videoIndex) => videoIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        video_urls: form.videos.map((video) => video.trim()).filter(Boolean),
      };
      const response = await adminService.updatePresentationVideo(payload);
      const data = response?.data?.data ?? {};
      setForm({
        title: data.title || defaultForm.title,
        description: data.description || defaultForm.description,
        videos: Array.isArray(data.videos) && data.videos.length ? data.videos : [''],
      });
      toast.success('Section mise a jour avec succes.');
    } catch (err) {
      console.error('Erreur enregistrement section videos de presentation:', err);
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const checklist = [
    { label: 'Titre de la section', done: form.title.trim().length > 0 },
    { label: 'Sous-titre de la section', done: form.description.trim().length > 0 },
    { label: 'Au moins un lien video', done: form.videos.some((video) => video.trim().length > 0) },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">
                Videos de presentation
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Configurez le titre, le sous-titre et les videos affiches dans la section "Videos de presentation" de la page d'accueil.
              </p>
            </div>

            {loading ? (
              <div className="surface-panel p-8 text-center text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-[rgba(15,42,46,0.6)]">
                    <span className="whitespace-nowrap">{completedCount}/{checklist.length} champs completes</span>
                    <div className="h-1.5 w-20 sm:w-28 rounded-full bg-[rgba(15,42,46,0.08)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completionPercent === 100 ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`}
                        style={{ width: `${completionPercent}%` }}
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
                          <p className="text-xs text-[rgba(15,42,46,0.55)]">Titre et sous-titre affiches au-dessus des videos sur la page d'accueil</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Titre de la section *</label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Ex. Videos de présentation"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Sous-titre de la section *</label>
                        <textarea
                          rows="3"
                          value={form.description}
                          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Un texte court qui donne envie de regarder les videos"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="surface-panel p-6 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center text-sm font-semibold shrink-0">2</div>
                          <div>
                            <h2 className="text-lg font-semibold">Videos</h2>
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">Un ou plusieurs liens Youtube affiches dans la section</p>
                          </div>
                        </div>
                        <button type="button" onClick={addVideo} className="btn-ghost text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter une video
                        </button>
                      </div>

                      {form.videos.map((video, index) => {
                        const thumbKey = `video-${index}`;
                        const thumbnail = getYoutubeThumbnail(video);
                        const showThumbnail = thumbnail && !brokenThumbs[thumbKey];
                        return (
                          <div key={`presentation-video-${index}`} className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)_auto] gap-3 items-center">
                            <div className="rounded-xl overflow-hidden bg-[rgba(15,42,46,0.08)] aspect-video flex items-center justify-center">
                              {showThumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={`Miniature video ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={() => setBrokenThumbs((prev) => ({ ...prev, [thumbKey]: true }))}
                                />
                              ) : (
                                <PlayCircle className="h-6 w-6 text-[rgba(15,42,46,0.3)]" />
                              )}
                            </div>
                            <div className="relative">
                              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.4)]" />
                              <input
                                value={video}
                                onChange={(e) => handleVideoChange(index, e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                              />
                            </div>
                            {form.videos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVideo(index)}
                                className="h-9 w-9 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition shrink-0"
                                title="Supprimer cette video"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 lg:sticky lg:top-6">
                    <div className="surface-panel p-5 space-y-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Apercu public</p>
                      <div className="flex items-center gap-2 text-[rgba(15,42,46,0.5)]">
                        <Video className="h-4 w-4" />
                        <span className="text-xs">Section page d'accueil</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[rgb(var(--ink))]">{form.title || 'Titre de section'}</p>
                        <p className="text-xs text-[rgba(15,42,46,0.6)] mt-1 line-clamp-3">
                          {form.description || 'Sous-titre de section'}
                        </p>
                      </div>
                    </div>

                    <div className="surface-panel p-5 space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)]">Champs requis ({completedCount}/{checklist.length})</p>
                      <ul className="space-y-2">
                        {checklist.map((item) => (
                          <li key={item.label} className="flex items-center gap-2 text-sm">
                            <span className={`h-4 w-4 rounded-full border-2 shrink-0 ${item.done ? 'border-emerald-500 bg-emerald-500' : 'border-[rgba(15,42,46,0.2)]'}`} />
                            <span className={item.done ? 'text-[rgb(var(--ink))]' : 'text-[rgba(15,42,46,0.5)]'}>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="surface-panel p-5">
                      <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPresentationVideoManagement;
