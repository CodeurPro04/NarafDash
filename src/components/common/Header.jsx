import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/api';
import { disconnectEcho, getEcho } from '../../services/realtime';
import { LogOut, User, Bell, Search, CheckCircle } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const displayName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const displayRole = user?.role?.slug || user?.role;

  const searchTarget = useMemo(() => {
    const role = displayRole;
    const mapping = {
      admin: '/admin/properties',
      gestionnaire: '/manager/properties',
      agent: '/agent/all-properties',
      investor: '/investor/opportunities',
      company: '/company/dashboard',
      visitor: '/visitor/profile',
    };
    return mapping[role] || '/dashboard';
  }, [displayRole]);

  useEffect(() => {
    let mounted = true;
    let channel = null;

    const loadNotifications = async () => {
      if (!user?.id) return;
      try {
        setLoadingNotifications(true);
        const [listRes, countRes] = await Promise.all([
          notificationService.getAll(),
          notificationService.getUnreadCount(),
        ]);
        const payload = listRes?.data?.data ?? listRes?.data ?? [];
        const list = payload.data || payload;
        const count = countRes?.data?.data?.count ?? countRes?.data?.count ?? 0;
        if (mounted) {
          setNotifications(Array.isArray(list) ? list : []);
          setUnreadCount(Number(count) || 0);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
      } finally {
        if (mounted) {
          setLoadingNotifications(false);
        }
      }
    };

    const connectRealtime = () => {
      if (!user?.id) return;
      const token = localStorage.getItem('token');
      const echo = getEcho(token);
      if (!echo) {
        return;
      }
      const channelName = `notifications.${user.id}`;
      channel = echo.private(channelName);
      channel.listen('.notification.created', (event) => {
        const notification = event?.notification || event;
        if (!notification?.id) return;
        setNotifications((prev) => {
          const exists = prev.some((item) => item.id === notification.id);
          return exists ? prev : [notification, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      });
    };

    loadNotifications();
    connectRealtime();

    return () => {
      mounted = false;
      if (channel && user?.id) {
        channel.stopListening('.notification.created');
        const token = localStorage.getItem('token');
        const echo = getEcho(token);
        if (echo) {
          echo.leave(`notifications.${user.id}`);
        }
      }
      if (!user?.id) {
        disconnectEcho();
      }
    };
  }, [user?.id]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const value = searchQuery.trim();
    if (!value) return;
    navigate(`${searchTarget}?q=${encodeURIComponent(value)}`);
    setSearchQuery('');
  };

  const handleNotificationClick = async (notification) => {
    if (!notification?.id || notification.is_read) return;
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) => prev.map((item) => (
        item.id === notification.id ? { ...item, is_read: true } : item
      )));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Erreur lors du marquage de notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[rgb(var(--line))] bg-[rgba(255,253,250,0.85)] backdrop-blur">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div>
              <img
                src="/images/logoabi2.png"
                alt="NARAF Immobilier"
                className="h-8 w-auto object-contain"
              />
              <p className="text-xs text-[rgba(15,42,46,0.6)]">Espace de gestion</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form className="relative w-full" onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(15,42,46,0.45)] h-4 w-4" />
              <input
                type="text"
                placeholder="Recherche rapide..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm text-[rgb(var(--ink))] placeholder-[rgba(15,42,46,0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.35)]"
              />
            </form>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative h-10 w-10 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-[rgb(var(--ink))] hover:bg-white transition"
              >
                <Bell className="h-5 w-5 mx-auto" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[rgb(var(--clay))] text-white text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[rgba(15,42,46,0.1)] bg-white shadow-[0_20px_40px_rgba(15,42,46,0.12)] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(15,42,46,0.08)]">
                    <p className="text-sm font-semibold">Notifications</p>
                    <button onClick={handleMarkAllRead} className="text-xs text-[rgba(15,42,46,0.6)] hover:text-[rgb(var(--ink))]">
                      Tout marquer lu
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="px-4 py-4 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-[rgba(15,42,46,0.5)]">Aucune notification.</div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full text-left px-4 py-3 border-b border-[rgba(15,42,46,0.06)] ${
                            item.is_read ? 'bg-white' : 'bg-[rgba(199,109,74,0.08)]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-[rgb(var(--ink))]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.title || 'Notification'}</p>
                              <p className="text-xs text-[rgba(15,42,46,0.55)] mt-1">
                                {item.message || 'Mise a jour'}
                              </p>
                              <p className="text-[10px] text-[rgba(15,42,46,0.45)] mt-1">
                                {item.created_at ? new Date(item.created_at).toLocaleString('fr-FR') : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-2xl border border-[rgb(var(--line))] bg-white/70">
              <div className="h-9 w-9 rounded-full bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                <User className="h-4 w-4 text-[rgb(var(--ink))]" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium">{displayName || 'Utilisateur'}</p>
                <p className="text-xs text-[rgba(15,42,46,0.55)] capitalize">{displayRole || 'role'}</p>
              </div>
            </div>

            <button onClick={logout} className="btn-ghost">
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Se deconnecter</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
