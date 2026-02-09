import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/roles';
import {
  LayoutDashboard,
  Users,
  Building,
  MessageSquare,
  CheckCircle,
  UserCheck,
  BarChart3,
  Settings,
  Shield,
  User,
  Search,
  FileText,
  TrendingUp,
  Handshake,
  HardHat
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = {
    [ROLES.ADMIN]: [
      { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { path: '/admin/properties', icon: Building, label: 'Proprietes' },
      { path: '/admin/construction-projects', icon: HardHat, label: 'Construction' },
       { path: '/admin/investments', icon: TrendingUp, label: 'Investissements' },
      { path: '/admin/assignments', icon: UserCheck, label: 'Assignations' },
      { path: '/admin/clients', icon: Users, label: 'Clients' },
      { path: '/admin/messages', icon: MessageSquare, label: 'Messages' },
      { path: '/admin/partnerships', icon: Handshake, label: 'Partenariats' },
      { path: '/admin/catalog', icon: Settings, label: 'Catalogue' },
      { path: '/admin/profile', icon: Shield, label: 'Profil' },
    ],
    [ROLES.MANAGER]: [
      { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { path: '/manager/properties', icon: Building, label: 'Proprietes' },
      { path: '/manager/construction-projects', icon: HardHat, label: 'Construction' },
      { path: '/manager/investments', icon: TrendingUp, label: 'Investissements' },
      { path: '/manager/assignments', icon: UserCheck, label: 'Assignations' },
      { path: '/manager/clients', icon: Users, label: 'Clients' },
      { path: '/manager/reports', icon: BarChart3, label: 'Rapports' },
      { path: '/manager/profile', icon: Shield, label: 'Profil' },
    ],
    [ROLES.AGENT]: (() => {
      const agentType = (user?.agent_type || user?.agentType || '').toLowerCase();
      const baseItems = [
        { path: '/agent/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
        { path: '/agent/assigned', icon: UserCheck, label: 'Assignations' },
      ];

      if (agentType === 'constructeur') {
        return [
          ...baseItems,
          { path: '/agent/construction', icon: HardHat, label: 'Construction' },
          { path: '/agent/construction-publications', icon: FileText, label: 'Publications' },
          { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
          { path: '/agent/profile', icon: Shield, label: 'Profil' },
        ];
      }

      if (agentType === 'investissement') {
        return [
          ...baseItems,
          { path: '/agent/investment-publications', icon: TrendingUp, label: 'Investissements' },
          { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
          { path: '/agent/profile', icon: Shield, label: 'Profil' },
        ];
      }

      return [
        ...baseItems,
        { path: '/agent/properties', icon: CheckCircle, label: 'Validation' },
        { path: '/agent/all-properties', icon: Building, label: 'Proprietes' },
        { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
        { path: '/agent/profile', icon: Shield, label: 'Profil' },
      ];
    })(),
    [ROLES.VISITOR]: [
      { path: '/visitor/profile', icon: User, label: 'Profil' },
    ],
    [ROLES.INVESTOR]: [
      { path: '/investor/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { path: '/investor/opportunities', icon: TrendingUp, label: 'Opportunites' },
      { path: '/investor/proposals', icon: FileText, label: 'Propositions' },
      { path: '/investor/portfolio', icon: BarChart3, label: 'Portefeuille' },
    ],
    [ROLES.COMPANY]: [
      { path: '/company/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { path: '/company/partnership', icon: Handshake, label: 'Partenariat' },
      { path: '/company/applications', icon: FileText, label: 'Candidatures' },
      { path: '/company/profile', icon: Shield, label: 'Profil' },
    ],
  };

  const currentMenu = menuItems[user?.role] || [];

  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-[rgb(var(--ink))] text-[rgb(var(--paper))] border-r border-[rgba(255,253,250,0.08)]">
      <div className="p-6 border-b border-[rgba(255,253,250,0.08)]">
        <div className="flex items-center gap-3">
          <div>
            <img src="/images/logonaraf.png" alt="NARAF Immobilier" className="h-7 w-auto object-contain" />
            <p className="text-xs text-[rgba(255,253,250,0.6)]">Espace de gestion</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {currentMenu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-[rgb(var(--paper))] text-[rgb(var(--ink))] shadow-[0_12px_22px_rgba(0,0,0,0.2)]'
                    : 'text-[rgba(255,253,250,0.7)] hover:bg-[rgba(255,253,250,0.08)]'
                }`}
              >
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-[rgba(15,42,46,0.08)]' : 'bg-[rgba(255,253,250,0.06)]'
                }`}>
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-[rgba(255,253,250,0.08)]">
        <div className="rounded-2xl bg-[rgba(255,253,250,0.08)] px-4 py-3">
          <p className="text-xs text-[rgba(255,253,250,0.6)]">Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
