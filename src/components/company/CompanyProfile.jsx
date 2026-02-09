import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { companyService } from '../../services/api';
import { Building2, Upload } from 'lucide-react';

const CompanyProfile = () => {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    company_type: '',
    registration_number: '',
    tax_number: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    services: '',
    certifications: '',
  });

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const storageBase = apiBase.replace(/\/api\/?$/, '');
  const getLogoUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const cleaned = path.replace(/^public\//, '');
    return `${storageBase}/storage/${cleaned}`;
  };

  const parseList = (value) => value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await companyService.getMyApplication();
      const payload = response?.data?.data ?? response?.data ?? null;
      setApplication(payload);
      if (payload) {
        setFormData({
          company_name: payload.company_name || '',
          company_type: payload.company_type || '',
          registration_number: payload.registration_number || '',
          tax_number: payload.tax_number || '',
          address: payload.address || '',
          city: payload.city || '',
          phone: payload.phone || '',
          email: payload.email || '',
          website: payload.website || '',
          description: payload.description || '',
          services: Array.isArray(payload.services) ? payload.services.join('\n') : '',
          certifications: Array.isArray(payload.certifications) ? payload.certifications.join('\n') : '',
        });
      }
    } catch (err) {
      console.error('Erreur chargement profil partenaire:', err);
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = new FormData();
    payload.append('company_name', formData.company_name);
    payload.append('company_type', formData.company_type);
    if (formData.registration_number) payload.append('registration_number', formData.registration_number);
    if (formData.tax_number) payload.append('tax_number', formData.tax_number);
    if (formData.address) payload.append('address', formData.address);
    if (formData.city) payload.append('city', formData.city);
    if (formData.phone) payload.append('phone', formData.phone);
    if (formData.email) payload.append('email', formData.email);
    if (formData.website) payload.append('website', formData.website);
    if (formData.description) payload.append('description', formData.description);

    parseList(formData.services).forEach((item) => payload.append('services[]', item));
    parseList(formData.certifications).forEach((item) => payload.append('certifications[]', item));

    if (logoFile) {
      payload.append('logo', logoFile);
    }

    try {
      if (application?.uuid) {
        const response = await companyService.updateApplication(payload);
        const data = response?.data?.data ?? response?.data ?? null;
        setApplication(data || application);
      } else {
        const response = await companyService.applyForPartnership(payload);
        const data = response?.data?.data ?? response?.data ?? null;
        setApplication(data || null);
      }
      setSuccess('Profil mis a jour.');
    } catch (err) {
      console.error('Erreur mise a jour profil:', err);
      setError('Erreur lors de la mise a jour.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status) => {
    if (status === 'approved') return 'Approuve';
    if (status === 'rejected') return 'Rejete';
    if (status === 'pending') return 'En attente';
    if (status === 'suspended') return 'Suspendu';
    return 'Non soumis';
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Espace entreprise</p>
              <h1 className="text-3xl font-semibold mt-3">Profil partenaire</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Mettez a jour les informations de votre entreprise partenaire.
              </p>
            </div>

            {error && (
              <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
            )}

            {success && (
              <div className="surface-panel p-4 text-sm text-emerald-600">{success}</div>
            )}

            <div className="surface-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                {application?.logo_path ? (
                  <img
                    src={getLogoUrl(application.logo_path)}
                    alt={application.company_name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">{application?.company_name || 'Entreprise'}</p>
                  <p className="text-sm text-[rgba(15,42,46,0.6)]">Statut: {statusLabel(application?.status)}</p>
                </div>
              </div>
              <label className="btn-ghost cursor-pointer">
                <Upload className="h-4 w-4" />
                Changer le logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <form onSubmit={handleSubmit} className="surface-panel p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Nom de l'entreprise</label>
                  <input
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type d'entreprise</label>
                  <input
                    name="company_type"
                    value={formData.company_type}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Numero d'enregistrement</label>
                  <input
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Numero fiscal</label>
                  <input
                    name="tax_number"
                    value={formData.tax_number}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
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
                  <label className="block text-sm font-medium mb-2">Adresse</label>
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telephone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Site web</label>
                  <input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Services (un par ligne)</label>
                  <textarea
                    name="services"
                    value={formData.services}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Certifications (une par ligne)</label>
                  <textarea
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving || loading} className="btn-primary">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CompanyProfile;
