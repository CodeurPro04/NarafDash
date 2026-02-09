import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { profileService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Lock, UserCircle } from 'lucide-react';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

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
      }
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.response?.data?.message || 'Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
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
      if (updated && updateUser) {
        updateUser({
          ...user,
          ...updated,
        });
      }
      setSuccess('Profil mis a jour avec succes.');
    } catch (err) {
      console.error('Erreur lors de la mise a jour du profil:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setError(err.response?.data?.message || details || 'Erreur lors de la mise a jour du profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage('');
    try {
      await profileService.changePassword(passwordData);
      setPasswordMessage('Mot de passe mis a jour avec succes.');
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (err) {
      console.error('Erreur lors du changement de mot de passe:', err);
      const apiErrors = err.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      setPasswordMessage(err.response?.data?.message || details || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <p className="chip">Administration</p>
              <h1 className="text-3xl font-semibold mt-3">Profil</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Mettez a jour vos informations et votre mot de passe.
              </p>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <>
                {error && (
                  <div className="surface-panel p-4 text-sm text-[rgb(var(--clay))]">{error}</div>
                )}
                {success && (
                  <div className="surface-panel p-4 text-sm text-[rgb(var(--sage))]">{success}</div>
                )}

                <form onSubmit={handleProfileSubmit} className="surface-panel p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Informations personnelles</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Prenom</label>
                      <input
                        type="text"
                        name="first_name"
                        value={profileData.first_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom</label>
                      <input
                        type="text"
                        name="last_name"
                        value={profileData.last_name}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        readOnly
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/50 px-4 py-3 text-sm cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Telephone</label>
                      <input
                        type="text"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Avatar</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
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
                    <Lock className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Mot de passe</h2>
                  </div>
                  {passwordMessage && (
                    <div className="text-sm text-[rgb(var(--clay))]">{passwordMessage}</div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Mot de passe actuel</label>
                      <input
                        type="password"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
                      <input
                        type="password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        name="new_password_confirmation"
                        value={passwordData.new_password_confirmation}
                        onChange={handlePasswordChange}
                        className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary" disabled={savingPassword}>
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

export default AdminProfile;
