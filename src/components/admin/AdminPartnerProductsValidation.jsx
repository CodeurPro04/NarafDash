import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Package, ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { partnerProductService } from '../../services/api';

const STATUS_CONFIG = {
  pending:  { label: 'En attente',  className: 'chip-warning' },
  approved: { label: 'Approuvé',    className: 'chip-success' },
  rejected: { label: 'Rejeté',      className: 'chip-error' },
};

const TYPE_LABELS = {
  'Partenaire financier':    { label: 'Financier',     color: 'text-blue-600' },
  'Partenaire constructeur': { label: 'Constructeur',  color: 'text-amber-600' },
  'Partenaire immobilier':   { label: 'Immobilier',    color: 'text-emerald-600' },
};

const AdminPartnerProductsValidation = () => {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = filter === 'pending'
        ? await partnerProductService.getPending()
        : await partnerProductService.getAll({ status: filter });
      const data = res?.data?.data ?? res?.data ?? [];
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setProducts(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); setSelected(null); }, [filter]);

  const showNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3500); };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await partnerProductService.approve(selected.uuid);
      showNotice('Produit approuvé et publié.');
      await load();
      setSelected(null);
    } catch { showNotice('Erreur lors de l\'approbation.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await partnerProductService.reject(selected.uuid, rejectReason);
      showNotice('Produit rejeté.');
      setShowRejectForm(false);
      setRejectReason('');
      await load();
      setSelected(null);
    } catch { showNotice('Erreur lors du rejet.'); }
    finally { setActionLoading(false); }
  };

  const td = selected?.type_data || {};

  return (
    <div className="space-y-6">
      <div>
        <p className="chip">Partenaires</p>
        <h1 className="text-2xl font-semibold mt-2">Validation des produits</h1>
        <p className="text-sm text-[rgba(15,42,46,0.6)] mt-1">
          Approuvez ou rejetez les produits soumis par les partenaires.
        </p>
      </div>

      {notice && (
        <div className="surface-soft px-4 py-3 text-sm font-medium text-[rgb(var(--ink))] flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {notice}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
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

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Liste */}
        <div className="surface-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(15,42,46,0.08)]">
            <p className="text-sm font-medium">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-y-auto max-h-[540px]">
            {loading ? (
              <div className="space-y-1 p-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-16 surface-soft animate-pulse rounded-lg" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[rgba(15,42,46,0.5)]">
                Aucun produit {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvé' : 'rejeté'}.
              </div>
            ) : (
              <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                {products.map((product) => {
                  const partnerType = product.partnership?.company_type || '';
                  const typeInfo = Object.entries(TYPE_LABELS).find(([k]) => partnerType.toLowerCase().includes(k.split(' ')[1]?.toLowerCase() || ''))?.[1];
                  return (
                    <button
                      key={product.uuid}
                      onClick={() => { setSelected(product); setShowRejectForm(false); setRejectReason(''); }}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-[rgba(15,42,46,0.04)]
                        ${selected?.uuid === product.uuid ? 'bg-[rgba(15,42,46,0.06)]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[rgba(15,42,46,0.06)] flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-[rgba(15,42,46,0.4)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{product.title}</p>
                          <p className={`text-xs mt-0.5 ${typeInfo?.color || 'text-[rgba(15,42,46,0.5)]'}`}>
                            {product.partnership?.company_name || 'Partenaire'}
                          </p>
                          <div className="mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                              ${product.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                product.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-red-100 text-red-700'}`}>
                              {STATUS_CONFIG[product.status]?.label || product.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Détail */}
        <div className="surface-panel p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-[rgba(15,42,46,0.4)]">
              <Eye className="h-10 w-10 mb-3" />
              <p className="text-sm">Sélectionnez un produit pour le visualiser</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{selected.title}</h2>
                  <p className="text-sm text-[rgba(15,42,46,0.6)] mt-1">
                    {selected.partnership?.company_name} · {selected.partnership?.company_type}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0
                  ${selected.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    selected.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'}`}>
                  {STATUS_CONFIG[selected.status]?.label}
                </span>
              </div>

              {/* Images */}
              {selected.images?.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {selected.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="h-32 w-32 object-cover rounded-lg flex-shrink-0 border border-[rgba(15,42,46,0.1)]" />
                  ))}
                </div>
              )}

              {/* Infos de base */}
              <div className="grid grid-cols-2 gap-4">
                {selected.price && (
                  <div className="surface-soft px-3 py-3 rounded-lg">
                    <p className="text-xs text-[rgba(15,42,46,0.5)] mb-1">Prix</p>
                    <p className="text-sm font-semibold">{Number(selected.price).toLocaleString('fr-FR')} {selected.currency}</p>
                  </div>
                )}
                <div className="surface-soft px-3 py-3 rounded-lg">
                  <p className="text-xs text-[rgba(15,42,46,0.5)] mb-1">Soumis le</p>
                  <p className="text-sm font-semibold">{new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Description */}
              {selected.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(15,42,46,0.4)] mb-2">Description</p>
                  <p className="text-sm text-[rgba(15,42,46,0.8)] leading-relaxed">{selected.description}</p>
                </div>
              )}

              {/* Données spécifiques */}
              {Object.keys(td).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[rgba(15,42,46,0.4)] mb-3">Données spécifiques</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(td).filter(([, v]) => v).map(([key, val]) => (
                      <div key={key} className="surface-soft px-3 py-2.5 rounded-lg">
                        <p className="text-[10px] text-[rgba(15,42,46,0.4)] capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xs font-semibold mt-0.5">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Motif de rejet existant */}
              {selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Motif de rejet</p>
                  <p className="text-sm text-red-600">{selected.rejection_reason}</p>
                </div>
              )}

              {/* Actions — seulement si en attente */}
              {selected.status === 'pending' && (
                <div className="border-t border-[rgba(15,42,46,0.08)] pt-5 space-y-3">
                  {!showRejectForm ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="btn-primary flex items-center gap-2 flex-1 justify-center"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {actionLoading ? 'En cours...' : 'Approuver'}
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={actionLoading}
                        className="btn-ghost flex items-center gap-2 flex-1 justify-center text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motif du rejet (obligatoire)..."
                        rows={3}
                        className="w-full border border-[rgba(15,42,46,0.15)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 resize-none"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleReject}
                          disabled={!rejectReason.trim() || actionLoading}
                          className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2 flex-1 justify-center"
                        >
                          <XCircle className="h-4 w-4" />
                          Confirmer le rejet
                        </button>
                        <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="btn-ghost flex-1 justify-center">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPartnerProductsValidation;
