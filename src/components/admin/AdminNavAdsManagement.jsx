import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { useToast } from '../common/Toast';
import { Save, Upload, Type, Image as ImageIcon, X, Megaphone } from 'lucide-react';

const emptySlots = ['abi', 'immobilier', 'construction', 'investissement'].map((key) => ({
  key,
  label: key,
  mode: 'text',
  text: '',
  image_url: null,
}));

const AdminNavAdsManagement = () => {
  const toast = useToast();
  const [slots, setSlots] = useState(emptySlots);
  const [loading, setLoading] = useState(true);
  // Etat d'edition local par emplacement (texte en cours, fichier image en attente,
  // apercu local, sauvegarde/succes/erreur individuels) pour que chaque carte se
  // sauvegarde independamment sans affecter les autres.
  const [editState, setEditState] = useState({});

  useEffect(() => {
    loadSlots();
  }, []);

  const buildEditState = (slotsData) => {
    const next = {};
    slotsData.forEach((slot) => {
      next[slot.key] = {
        mode: slot.mode,
        text: slot.text || '',
        imageFile: null,
        imagePreview: slot.image_url || null,
        saving: false,
      };
    });
    return next;
  };

  const loadSlots = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await adminService.getNavAds();
      const data = response?.data?.data;
      const nextSlots = Array.isArray(data) && data.length ? data : emptySlots;
      setSlots(nextSlots);
      setEditState(buildEditState(nextSlots));
    } catch (err) {
      console.error('Erreur chargement publicites navbar:', err);
      toast.error('Impossible de charger les emplacements publicitaires.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateEdit = (key, patch) => {
    setEditState((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const handleModeChange = (key, mode) => {
    updateEdit(key, { mode });
  };

  const handleTextChange = (key, value) => {
    updateEdit(key, { text: value });
  };

  const handleImageSelect = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updateEdit(key, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    });
    event.target.value = '';
  };

  const removeImage = (key) => {
    updateEdit(key, { imageFile: null, imagePreview: null });
  };

  const handleSave = async (key) => {
    const edit = editState[key];
    if (!edit) return;

    if (edit.mode === 'text' && !edit.text.trim()) {
      toast.warning('Le texte est requis pour ce mode.');
      return;
    }
    if (edit.mode === 'image' && !edit.imagePreview) {
      toast.warning('Une image est requise pour ce mode.');
      return;
    }

    try {
      updateEdit(key, { saving: true });
      const payload = new FormData();
      payload.append('key', key);
      payload.append('mode', edit.mode);
      if (edit.text) payload.append('text', edit.text);
      if (edit.imageFile) payload.append('image', edit.imageFile);
      if (edit.mode === 'text' && !edit.imagePreview) payload.append('remove_image', '1');

      const response = await adminService.updateNavAd(payload);
      const data = response?.data?.data;
      if (Array.isArray(data)) {
        setSlots(data);
        const updated = data.find((slot) => slot.key === key);
        if (updated) {
          updateEdit(key, {
            mode: updated.mode,
            text: updated.text || '',
            imageFile: null,
            imagePreview: updated.image_url || null,
          });
          toast.success('Emplacement mis a jour.');
        }
      }
    } catch (err) {
      console.error('Erreur enregistrement publicite navbar:', err);
      const apiErrors = err?.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      toast.error(err?.response?.data?.message || details || "Erreur lors de l'enregistrement.");
    } finally {
      updateEdit(key, { saving: false });
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
              <p className="chip">Administration</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">
                Publicite de la navbar
              </h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2 max-w-2xl">
                Pour chaque menu du site public (ABI, Immobilier, Construction, Investissement), choisissez si la zone situee avant les sous-menus affiche un texte de presentation ou une image.
              </p>
            </div>

            {loading ? (
              <div className="surface-panel p-8 text-center text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {slots.map((slot) => {
                  const edit = editState[slot.key] || {};
                  return (
                    <div key={slot.key} className="surface-panel p-6 space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center shrink-0">
                            <Megaphone className="h-5 w-5 text-[rgb(var(--ink))]" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold">{slot.label}</h2>
                            <p className="text-xs text-[rgba(15,42,46,0.55)]">Menu "{slot.label}" de la navbar</p>
                          </div>
                        </div>
                        <div className="inline-flex rounded-xl border border-[rgb(var(--line))] p-1 bg-white/70 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleModeChange(slot.key, 'text')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              edit.mode === 'text'
                                ? 'bg-[rgb(var(--ink))] text-white'
                                : 'text-[rgba(15,42,46,0.6)] hover:bg-[rgba(15,42,46,0.05)]'
                            }`}
                          >
                            <Type className="h-3.5 w-3.5" />
                            Texte
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange(slot.key, 'image')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              edit.mode === 'image'
                                ? 'bg-[rgb(var(--ink))] text-white'
                                : 'text-[rgba(15,42,46,0.6)] hover:bg-[rgba(15,42,46,0.05)]'
                            }`}
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Image
                          </button>
                        </div>
                      </div>

                      {edit.mode === 'text' ? (
                        <div>
                          <label className="block text-sm font-medium mb-2">Texte de presentation</label>
                          <textarea
                            rows={4}
                            value={edit.text}
                            onChange={(event) => handleTextChange(slot.key, event.target.value)}
                            placeholder="Ex. Decouvrez l'univers ABI, sa vision, ses agences..."
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium mb-2">Image affichee</label>
                          {edit.imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-[rgb(var(--line))]">
                              <img src={edit.imagePreview} alt={`Publicite ${slot.label}`} className="w-full h-40 object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(slot.key)}
                                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                title="Retirer l'image"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-[rgb(var(--line))] hover:border-[rgba(199,109,74,0.5)] transition-colors rounded-xl p-6 text-center bg-[rgba(15,42,46,0.015)]">
                              <Upload className="h-8 w-8 text-[rgba(15,42,46,0.4)] mx-auto mb-2" />
                              <p className="text-xs text-[rgba(15,42,46,0.55)] mb-3">JPG, PNG ou WEBP - remplace le texte dans la navbar</p>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => handleImageSelect(slot.key, event)}
                                className="hidden"
                                id={`nav-ad-image-${slot.key}`}
                              />
                              <label htmlFor={`nav-ad-image-${slot.key}`} className="btn-ghost cursor-pointer inline-flex text-xs">
                                Selectionner une image
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Apercu fidele a la navbar publique */}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[rgba(15,42,46,0.5)] mb-2">Apercu dans la navbar</p>
                        <div className="rounded-xl border border-[rgb(var(--line))] bg-white p-5">
                          <p className="text-[15px] font-medium text-[#111111]">{slot.label}</p>
                          {edit.mode === 'image' && edit.imagePreview ? (
                            <img src={edit.imagePreview} alt="" className="mt-3 w-full max-w-[240px] h-28 object-cover rounded-lg" />
                          ) : (
                            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-[#171717]">
                              {edit.text || 'Aucun texte renseigne pour le moment.'}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSave(slot.key)}
                        disabled={edit.saving}
                        className="btn-primary w-full justify-center"
                      >
                        <Save className="h-4 w-4" />
                        {edit.saving ? 'Enregistrement...' : 'Enregistrer cet emplacement'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminNavAdsManagement;
