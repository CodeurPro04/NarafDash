import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { profileService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { resolveMediaUrl } from '../../utils/media';
import {
  Save,
  Lock,
  UserCircle,
  Camera,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
} from 'lucide-react';

const getInitials = (firstName, lastName) => {
  const initials = `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  return initials || 'U';
};

const ManagerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageIsError, setPasswordMessageIsError] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [profileMeta, setProfileMeta] = useState({ role_name: '', avatar: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await profileService.getProfile();
      const payload = response?.data?.data?.user || response?.data?.user;
      if (payload) {
        setProfileData({
          first_name: payload.first_name || '',
          last_name: payload.last_name || '',
          phone: payload.phone || '',
          email: payload.email || '',
        });
        setProfileMeta({
          role_name: payload.role_name || '',
          avatar: payload.avatar || '',
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.response?.data?.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const avatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : resolveMediaUrl(profileMeta.avatar)),
    [avatarFile, profileMeta.avatar],
  );

  useEffect(() => {
    return () => {
      if (avatarFile) URL.revokeObjectURL(avatarPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarFile]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    setAvatarFile(e.target.files?.[0] || null);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      payload.append('first_name', profileData.first_name);
      payload.append('last_name', profileData.last_name);
      payload.append('phone', profileData.phone);
      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }
      const response = await profileService.updateProfile(payload);
      const updated = response?.data?.data?.user;
      if (updated) {
        setProfileMeta((prev) => ({ ...prev, avatar: updated.avatar || prev.avatar }));
        if (updateUser) {
          updateUser({ ...user, ...updated });
        }
      }
      setAvatarFile(null);
      setSuccess('Profil mis a jour avec succes.');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      console.error('Erreur lors de la mise a jour du profil:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la mise a jour du profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordsFilled = passwordData.new_password.length > 0 && passwordData.new_password_confirmation.length > 0;
  const passwordsMatch = passwordData.new_password === passwordData.new_password_confirmation;
  const newPasswordTooShort = passwordData.new_password.length > 0 && passwordData.new_password.length < 8;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordsFilled && !passwordsMatch) return;
    setSavingPassword(true);
    setPasswordMessage('');
    setPasswordMessageIsError(false);
    try {
      await profileService.changePassword(passwordData);
      setPasswordMessage('Mot de passe mis a jour avec succes.');
      setPasswordMessageIsError(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      setTimeout(() => setPasswordMessage(''), 3500);
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setPasswordMessage(err.response?.data?.message || details || 'Erreur lors du changement de mot de passe.');
      setPasswordMessageIsError(true);
    } finally {
      setSavingPassword(false);
    }
  };

  const fullName = `${profileData.first_name} ${profileData.last_name}`.trim() || 'Utilisateur';

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <p className="chip">Espace gestionnaire</p>
              <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">Profil</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Gerez vos informations personnelles et la securite de votre compte.
              </p>
            </div>

            {loading ? (
              <div className="space-y-6">
                <div className="surface-panel p-6 sm:p-8 h-32 animate-pulse" />
                <div className="surface-panel p-6 h-64 animate-pulse" />
              </div>
            ) : (
              <>
                {error && (
                  <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="surface-soft px-4 py-3 text-sm font-medium text-[rgb(var(--ink))] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {success}
                  </div>
                )}

                {/* Hero */}
                <div className="surface-panel p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                    <div className="relative shrink-0">
                      <div className="h-24 w-24 rounded-full overflow-hidden bg-[rgba(15,42,46,0.08)] flex items-center justify-center border-4 border-white shadow-[0_8px_20px_rgba(15,42,46,0.12)]">
                        {avatarPreviewUrl ? (
                          <img src={avatarPreviewUrl} alt={fullName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-semibold text-[rgba(15,42,46,0.45)]">
                            {getInitials(profileData.first_name, profileData.last_name)}
                          </span>
                        )}
                      </div>
                      <label
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-[rgba(15,42,46,0.85)] transition"
                        title="Changer la photo de profil"
                      >
                        <Camera className="h-4 w-4" />
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-[rgb(var(--ink))] truncate">{fullName}</h2>
                      <p className="text-sm text-[rgba(15,42,46,0.55)] truncate">{profileData.email}</p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                        {profileMeta.role_name && <span className="chip">{profileMeta.role_name}</span>}
                        {avatarFile && (
                          <span className="text-xs font-medium text-[rgb(var(--clay))]">
                            Nouvelle photo selectionnee - enregistrez pour l'appliquer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="surface-panel p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center shrink-0">
                      <UserCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Informations personnelles</h2>
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">Ces informations sont visibles par les autres membres de l'equipe.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prenom *</label>
                      <input
                        type="text"
                        name="first_name"
                        value={profileData.first_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom *</label>
                      <input
                        type="text"
                        name="last_name"
                        value={profileData.last_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.4)]" />
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          readOnly
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/50 pl-10 pr-4 py-3 text-sm cursor-not-allowed text-[rgba(15,42,46,0.6)]"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-[rgba(15,42,46,0.45)]">L'email ne peut pas etre modifie ici.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Telephone</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.4)]" />
                        <input
                          type="text"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          placeholder="Ex. +225 07 00 00 00 00"
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary" disabled={savingProfile}>
                      <Save className="h-4 w-4" />
                      {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>

                <form onSubmit={handlePasswordSubmit} className="surface-panel p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[rgb(var(--ink))] text-white flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[rgb(var(--ink))]">Mot de passe</h2>
                      <p className="text-xs text-[rgba(15,42,46,0.55)]">Utilisez un mot de passe d'au moins 8 caracteres.</p>
                    </div>
                  </div>
                  {passwordMessage && (
                    <div className={`text-sm flex items-center gap-2 ${passwordMessageIsError ? 'text-[rgb(var(--clay))]' : 'text-emerald-600'}`}>
                      {passwordMessageIsError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      {passwordMessage}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Mot de passe actuel *</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          name="current_password"
                          value={passwordData.current_password}
                          onChange={handlePasswordChange}
                          className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--ink))] transition"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nouveau mot de passe *</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          className={`w-full rounded-xl border bg-white/70 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)] ${
                            newPasswordTooShort ? 'border-[rgb(var(--clay))]' : 'border-[rgb(var(--line))]'
                          }`}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--ink))] transition"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {newPasswordTooShort && (
                        <p className="mt-1.5 text-xs text-[rgb(var(--clay))]">Au moins 8 caracteres requis.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirmer le mot de passe *</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="new_password_confirmation"
                          value={passwordData.new_password_confirmation}
                          onChange={handlePasswordChange}
                          className={`w-full rounded-xl border bg-white/70 px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)] ${
                            passwordsFilled && !passwordsMatch ? 'border-[rgb(var(--clay))]' : 'border-[rgb(var(--line))]'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(15,42,46,0.4)] hover:text-[rgb(var(--ink))] transition"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordsFilled && (
                        <p className={`mt-1.5 text-xs flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600' : 'text-[rgb(var(--clay))]'}`}>
                          {passwordsMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          {passwordsMatch ? 'Les mots de passe correspondent.' : 'Les mots de passe ne correspondent pas.'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={savingPassword || (passwordsFilled && !passwordsMatch)}
                    >
                      <Save className="h-4 w-4" />
                      {savingPassword ? 'Mise a jour...' : 'Mettre a jour'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagerProfile;
