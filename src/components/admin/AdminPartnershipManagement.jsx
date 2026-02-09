import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { CheckCircle, XCircle, Building2, Mail, Phone, MapPin } from 'lucide-react';

const AdminPartnershipManagement = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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

  const statusStyle = (status) => {
    if (status === 'approved') return 'bg-emerald-50 text-emerald-700';
    if (status === 'rejected') return 'bg-red-50 text-red-700';
    if (status === 'pending') return 'bg-amber-50 text-amber-700';
    if (status === 'suspended') return 'bg-slate-100 text-slate-700';
    return 'bg-slate-100 text-slate-700';
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminService.getAllPartnerships();
      const list = extractList(response);
      setApplications(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
      }
    } catch (err) {
      console.error('Erreur chargement partenariats:', err);
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const selectedServices = useMemo(() => selected?.services || [], [selected]);
  const selectedCertifications = useMemo(() => selected?.certifications || [], [selected]);

  const updateLocalStatus = (uuid, status, reason = null) => {
    setApplications((prev) => prev.map((item) => (
      item.uuid === uuid ? { ...item, status, rejection_reason: reason } : item
    )));
    setSelected((prev) => (prev && prev.uuid === uuid ? { ...prev, status, rejection_reason: reason } : prev));
  };

  const handleApprove = async () => {
    if (!selected?.uuid) return;
    try {
      await adminService.approvePartnership(selected.uuid);
      updateLocalStatus(selected.uuid, 'approved');
    } catch (err) {
      console.error('Erreur validation partenariat:', err);
      setError('Erreur lors de la validation.');
    }
  };

  const handleDelete = async () => {
    if (!selected?.uuid) return;
    if (!window.confirm('Supprimer ce partenariat ?')) return;
    try {
      await adminService.deletePartnership(selected.uuid);
      setApplications((prev) => prev.filter((item) => item.uuid != selected.uuid));
      setSelected(null);
    } catch (err) {
      console.error('Erreur suppression partenariat:', err);
      setError('Erreur lors de la suppression.');
    }
  };

  const handleReject = async () => {
    if (!selected?.uuid) return;
    if (!rejectReason.trim()) {
      setError('Veuillez saisir un motif de rejet.');
      return;
    }
    try {
      await adminService.rejectPartnership(selected.uuid, { rejection_reason: rejectReason.trim() });
      updateLocalStatus(selected.uuid, 'rejected', rejectReason.trim());
      setRejectReason('');
    } catch (err) {
      console.error('Erreur rejet partenariat:', err);
      setError('Erreur lors du rejet.');
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

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

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
                    <div className="p-6 text-sm text-[rgba(15,42,46,0.5)]">Aucune demande.</div>
                  ) : (
                    applications.map((item) => (
                      <button
                        key={item.uuid}
                        onClick={() => setSelected(item)}
                        className={`w-full text-left px-5 py-4 border-b border-[rgba(232,221,209,0.6)] transition ${
                          selected?.uuid === item.uuid ? 'bg-[rgba(15,42,46,0.08)]' : 'hover:bg-[rgba(15,42,46,0.04)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{item.company_name}</p>
                            <p className="text-xs text-[rgba(15,42,46,0.5)]">{item.company_type || 'Entreprise'}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-[rgba(15,42,46,0.5)]">
                          {item.city || 'Ville non renseignee'}
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
                          <p className="text-sm text-[rgba(15,42,46,0.6)]">{selected.company_type}</p>
                          <span className={`inline-flex mt-2 text-xs px-2 py-1 rounded-full ${statusStyle(selected.status)}`}>
                            {selected.status}
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
