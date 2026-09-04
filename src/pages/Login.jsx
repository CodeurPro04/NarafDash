import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      if (result.success) {
        const userData = result.user;
        const userRole = userData?.role;

        switch (userRole) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'gestionnaire':
            navigate('/manager/dashboard');
            break;
          case 'agent':
            navigate('/agent/dashboard');
            break;
          case 'proprietaire':
            setError("Les proprietaires utilisent l'espace profil du site public.");
            await logout();
            break;
          case 'visiteur':
            navigate('/visitor/profile');
            break;
          case 'investisseur':
            navigate('/investor/dashboard');
            break;
          case 'entreprise':
            navigate('/company/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-16 w-16 text-white flex items-center justify-center mx-auto">     
              <img
                src="/images/logoabi2.png"
                alt="NARAF Immobilier"
                className="h-8 w-auto object-contain"
              />
          </div>
          <h1 className="text-3xl font-semibold mt-4">NARAF GROUPE SARL</h1>
          <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Accès sécurisé au back-office</p>
        </div>

        <div className="surface-card p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Connexion</h2>
            <p className="text-sm text-[rgba(15,42,46,0.6)] mt-1">Entrez vos identifiants pour continuer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                  placeholder="votre.email@naraf.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.45)]" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(15,42,46,0.45)] hover:text-[rgb(var(--ink))] transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="surface-soft px-4 py-3 text-sm text-[rgb(var(--clay))]">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <span>Connexion...</span>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[rgba(15,42,46,0.5)] mt-6">
          © {new Date().getFullYear()} NARAF Groupe SARL. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default Login;
