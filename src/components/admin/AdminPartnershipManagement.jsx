import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { useToast } from '../common/Toast';
import { adminService } from '../../services/api';
import { CheckCircle, XCircle, Building2, Mail, Phone, MapPin } from 'lucide-react';

const AdminPartnershipManagement = () => {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [contentForm, setContentForm] = useState({
    profile_title: '',
    profile_description: '',
    service_offers: '',
    product_showcase: '',
  });

  const apiBase = import.meta.env.VITE_API_URL || 'https://api.africabuildinvest.com';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getStorageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const extractList = (response) => {
    const payload = response?.data?.data ?? response?.data ?? [];
    const list = payload.data || payload;
    return Array.isArray(list) ? list : [];
  };

  const statusInfo = (status) => {
    if (status === 'approved') return { label: 'Approuve', className: 'bg-emerald-100 text-emerald-700' };
    if (status === 'rejected') return { label: 'Rejete', className: 'bg-rose-100 text-rose-700' };
    if (status === 'pending') return { label: 'En attente', className: 'bg-amber-100 text-amber-700' };
    if (status === 'suspended') return { label: 'Suspendu', className: 'bg-slate-100 text-slate-700' };
    return { label: status || 'Inconnu', className: 'bg-slate-100 text-slate-700' };
  };

  const loadApplications = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await adminService.getAllPartnerships({
        status: filter !== 'all' ? filter : undefined,
        per_page: 100,
      });
      const list = extractList(response);
      setApplications(list);
      setSelected((prev) => {
        const stillExists = prev && list.find((item) => item.uuid === prev.uuid);
        if (stillExists) return stillExists;
        return list.length > 0 ? list[0] : null;
      });
    } catch (err) {
      console.error('Erreur chargement partenariats:', err);
      toast.error('Impossible de charger les demandes.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const selectedServices = useMemo(() => selected?.services || [], [selected]);
  const selectedCertifications = useMemo(() => selected?.certifications || [], [selected]);
  const selectedOfferServices = useMemo(() => selected?.service_offers || [], [selected]);
  const selectedProducts = useMemo(() => selected?.product_showcase || [], [selected]);

  useEffect(() => {
    if (!selected) return;
    setContentForm({
      profile_title: selected.profile_title || '',
      profile_description: selected.profile_description || '',
      service_offers: Array.isArray(selected.service_offers) ? selected.service_offers.join('\n') : '',
      product_showcase: Array.isArray(selected.product_showcase)
        ? selected.product_showcase.map((item) => `${item?.title || ''}|${item?.description || ''}`).join('\n')
        : '',
    });
    setCoverFile(null);
    setRemoveCoverImage(false);
  }, [selected?.uuid]);

  const handleApprove = async () => {
    if (!selected?.uuid) return;
    try {
      await adminService.approvePartnership(selected.uuid);
      await loadApplications({ silent: true });
      toast.success('Partenariat validé avec succès.');
    } catch (err) {
      console.error('Erreur validation partenariat:', err);
      toast.error('Erreur lors de la validation.');
    }
  };

  const handleDelete = async () => {
    if (!selected?.uuid) return;
    if (!window.confirm('Supprimer ce partenariat ?')) return;
    try {
      await adminService.deletePartnership(selected.uuid);
      setApplications((prev) => prev.filter((item) => item.uuid != selected.uuid));
      setSelected(null);
      toast.success('Partenariat supprimé avec succès.');
    } catch (err) {
      console.error('Erreur suppression partenariat:', err);
      toast.error('Erreur lors de la suppression.');
    }
  };

  const handleReject = async () => {
    if (!selected?.uuid) return;
    if (!rejectReason.trim()) {
      toast.warning('Veuillez saisir un motif de rejet.');
      return;
    }
    try {
      await adminService.rejectPartnership(selected.uuid, { rejection_reason: rejectReason.trim() });
      setRejectReason('');
      await loadApplications({ silent: true });
      toast.success('Partenariat rejeté avec succès.');
    } catch (err) {
      console.error('Erreur rejet partenariat:', err);
      toast.error('Erreur lors du rejet.');
    }
  };

  const handleContentChange = (event) => {
    const { name, value } = event.target;
    setContentForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseLineList = (value) =>
    String(value || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  const parseProducts = (value) =>
    String(value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split('|');
        return {
          title: String(title || '').trim(),
          description: rest.join('|').trim(),
        };
      })
      .filter((item) => item.title || item.description);

  const handleSaveContent = async () => {
    if (!selected?.uuid) return;
    try {
      setContentSaving(true);

      const payload = new FormData();
      payload.append('profile_title', contentForm.profile_title || '');
      payload.append('profile_description', contentForm.profile_description || '');

      parseLineList(contentForm.service_offers).forEach((item) => {
        payload.append('service_offers[]', item);
      });

      parseProducts(contentForm.product_showcase).forEach((item, index) => {
        payload.append(`product_showcase[${index}][title]`, item.title || '');
        payload.append(`product_showcase[${index}][description]`, item.description || '');
      });

      if (coverFile) {
        payload.append('cover_image', coverFile);
      }
      if (removeCoverImage) {
        payload.append('remove_cover_image', '1');
      }

      const response = await adminService.updatePartnershipContent(selected.uuid, payload);
      const data = response?.data?.data ?? response?.data ?? null;
      if (!data) return;

      setApplications((prev) => prev.map((item) => (item.uuid === data.uuid ? data : item)));
      setSelected(data);
      setCoverFile(null);
      setRemoveCoverImage(false);
      toast.success('Contenu public du partenaire mis à jour avec succès.');
    } catch (err) {
      console.error('Erreur mise a jour contenu partenaire:', err);
      const apiMessage =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
        'Impossible de sauvegarder le contenu public du partenaire.';
      toast.error(apiMessage);
    } finally {
      setContentSaving(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-3xl font-semibold mt-3">Partenariats</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Traitez les demandes de partenariat et suivez les dossiers.
              </p>
            </div>

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'pending', label: 'En attente' },
                { key: 'approved', label: 'Approuvés' },
                { key: 'rejected', label: 'Rejetés' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={filter === f.key ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 surface-panel p-0 overflow-hidden">
                <div className="p-6 border-b border-[rgba(232,221,209,0.8)]">
                  <h2 className="text-lg font-semibold">Demandes</h2>
                  <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                    {loading ? 'Chargement...' : `${applications.length} demande(s)`}
                  </p>
                </div>
                <div className="max-h-[560px] overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                  ) : applications.length === 0 ? (
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">
                      Aucune demande {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : filter === 'rejected' ? 'rejetée' : ''}.
                    </div>
                  ) : (
                    applications.map((item) => (
                      <button
                        key={item.uuid}
                        onClick={() => setSelected(item)}
                        className={`w-full text-left px-5 py-4 border-b border-[rgba(232,221,209,0.6)] transition ${
                          selected?.uuid === item.uuid ? 'bg-[rgba(15,42,46,0.08)]' : 'hover:bg-[rgba(15,42,46,0.04)]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[rgba(15,42,46,0.06)] flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{item.company_name}</p>
                                <p className="text-xs text-[rgba(15,42,46,0.5)]">
                                  {item.company_type || 'Entreprise'}
                                  {item.legal_specialty ? ` · ${item.legal_specialty}` : ''}
                                </p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusInfo(item.status).className}`}>
                                {statusInfo(item.status).label}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-[rgba(15,42,46,0.5)]">
                              {item.city || 'Ville non renseignee'}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {selected ? (
                  <div className="surface-panel p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {selected.logo_path ? (
                          <img
                            src={getStorageUrl(selected.logo_path)}
                            alt={selected.company_name}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                            <Building2 className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-semibold">{selected.company_name}</h2>
                          <p className="text-sm text-[rgba(15,42,46,0.6)]">
                            {selected.company_type}
                            {selected.legal_specialty ? ` · ${selected.legal_specialty}` : ''}
                          </p>
                          <span className={`inline-flex mt-2 text-xs font-semibold px-2 py-1 rounded-full ${statusInfo(selected.status).className}`}>
                            {statusInfo(selected.status).label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selected.status === 'pending' && (
                          <>
                            <button onClick={handleApprove} className="btn-primary">
                              <CheckCircle className="h-4 w-4" />
                              Valider
                            </button>
                            <button onClick={handleReject} className="btn-ghost text-[rgb(var(--clay))]">
                              <XCircle className="h-4 w-4" />
                              Rejeter
                            </button>
                          </>
                        )}
                        <button onClick={handleDelete} className="btn-ghost text-[rgb(var(--clay))]">
                          Supprimer
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="surface-soft px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4" />
                          {selected.email || 'Email non renseigne'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4" />
                          {selected.phone || 'Telephone non renseigne'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          {selected.address || 'Adresse non renseignee'} {selected.city ? `, ${selected.city}` : ''}
                        </div>
                      </div>
                      <div className="surface-soft px-4 py-3 text-sm text-[rgba(15,42,46,0.6)]">
                        <p>Numero d'enregistrement: {selected.registration_number || 'N/A'}</p>
                        <p>Numero fiscal: {selected.tax_number || 'N/A'}</p>
                        <p>Site web: {selected.website || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium mb-2">Services</p>
                        {selectedServices.length === 0 ? (
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">Aucun service renseigne.</p>
                        ) : (
                          <ul className="text-sm space-y-1">
                            {selectedServices.map((service, index) => (
                              <li key={`${service}-${index}`}>- {service}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="surface-soft px-4 py-3">
                        <p className="text-sm font-medium mb-2">Certifications</p>
                        {selectedCertifications.length === 0 ? (
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">Aucune certification.</p>
                        ) : (
                          <ul className="text-sm space-y-1">
                            {selectedCertifications.map((cert, index) => (
                              <li key={`${cert}-${index}`}>- {cert}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium mb-2">Description</p>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">
                        {selected.description || 'Aucune description.'}
                      </p>
                    </div>

                    <div className="surface-soft px-4 py-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold">Contenu public partenaire</p>
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-1">
                          Ces informations seront affichees sur la page detail du site public.
                        </p>
                      </div>

                      {selected.cover_image_path && !removeCoverImage && (
                        <img
                          src={getStorageUrl(selected.cover_image_path)}
                          alt={selected.company_name}
                          className="w-full max-h-56 object-cover rounded-xl"
                        />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Titre detail</label>
                          <input
                            type="text"
                            name="profile_title"
                            value={contentForm.profile_title}
                            onChange={handleContentChange}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                            placeholder="Presentation du partenaire"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">Photo de couverture</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-2.5 text-sm"
                          />
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={removeCoverImage}
                              onChange={(e) => setRemoveCoverImage(e.target.checked)}
                            />
                            Retirer la photo actuelle
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium">Description detaillee</label>
                        <textarea
                          name="profile_description"
                          value={contentForm.profile_description}
                          onChange={handleContentChange}
                          rows={4}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                          placeholder="Texte de presentation detaille du partenaire..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Services proposes (1 ligne = 1 service)
                          </label>
                          <textarea
                            name="service_offers"
                            value={contentForm.service_offers}
                            onChange={handleContentChange}
                            rows={5}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                            placeholder={'Installation\nMaintenance\nAssistance technique'}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Produits (format: Nom|Description)
                          </label>
                          <textarea
                            name="product_showcase"
                            value={contentForm.product_showcase}
                            onChange={handleContentChange}
                            rows={5}
                            className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                            placeholder={'Produit A|Description du produit A\nProduit B|Description du produit B'}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[rgba(15,42,46,0.55)]">
                        <div>
                          <p className="font-medium mb-1">Services enregistres</p>
                          <p>{selectedOfferServices.length} service(s)</p>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Produits enregistres</p>
                          <p>{selectedProducts.length} produit(s)</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveContent}
                          disabled={contentSaving}
                          className="btn-primary"
                        >
                          {contentSaving ? 'Enregistrement...' : 'Sauvegarder contenu public'}
                        </button>
                      </div>
                    </div>

                    <div className="surface-soft px-4 py-3">
                      <p className="text-sm font-medium mb-2">Motif de rejet</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        placeholder="Expliquez la raison du rejet..."
                      />
                      {selected.rejection_reason && (
                        <p className="text-xs text-[rgba(15,42,46,0.5)] mt-2">
                          Dernier motif: {selected.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                    Selectionnez une demande pour voir les details.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPartnershipManagement;
