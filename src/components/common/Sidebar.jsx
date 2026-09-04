import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../utils/roles';
import { normalizeAgentType } from '../../utils/agentType';
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
  HardHat,
  ChevronDown,
  Plus,
  Package
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const adminGroups = [
    {
      label: 'Propriete',
      icon: Building,
      children: [
        { path: '/admin/assignments', search: 'type=property', icon: FileText, label: 'Mes demandes' },
        { path: '/admin/properties', search: 'view=list', icon: Building, label: 'Liste de propriete' },
        { path: '/admin/properties', search: 'view=create', icon: Plus, label: 'Ajout de propriete' },
      ],
    },
    {
      label: 'Construction',
      icon: HardHat,
      children: [
        { path: '/admin/assignments', search: 'type=construction', icon: FileText, label: 'Mes demandes' },
        { path: '/admin/construction-projects', search: 'view=list', icon: HardHat, label: 'Liste des projets de construction' },
        { path: '/admin/construction-projects', search: 'view=create', icon: Plus, label: 'Ajout de projet de construction' },
      ],
    },
    {
      label: 'Clients',
      icon: Users,
      children: [
        { path: '/admin/clients', search: 'view=pending', icon: Users, label: 'Demandes clients' },
        { path: '/admin/clients', search: 'view=history', icon: FileText, label: 'Historique' },
      ],
    },
    {
      label: 'Investissement',
      icon: TrendingUp,
      children: [
        { path: '/admin/investments', search: 'view=requests', icon: FileText, label: 'Mes demandes' },
        { path: '/admin/investments', search: 'view=list', icon: TrendingUp, label: "Liste des projets d'investissement" },
        { path: '/admin/investments', search: 'view=create', icon: Plus, label: "Ajout de projet d'investissement" },
      ],
    },
  ];

  const managerGroups = [
    {
      label: 'Propriete',
      icon: Building,
      children: [
        { path: '/manager/assignments', search: 'type=property', icon: FileText, label: 'Mes demandes' },
        { path: '/manager/properties', search: 'view=list', icon: Building, label: 'Liste de propriete' },
        { path: '/manager/properties', search: 'view=create', icon: Plus, label: 'Ajout de propriete' },
      ],
    },
    {
      label: 'Construction',
      icon: HardHat,
      children: [
        { path: '/manager/assignments', search: 'type=construction', icon: FileText, label: 'Mes demandes' },
        { path: '/manager/construction-projects', search: 'view=list', icon: HardHat, label: 'Liste des projets de construction' },
        { path: '/manager/construction-projects', search: 'view=create', icon: Plus, label: 'Ajout de projet de construction' },
      ],
    },
    {
      label: 'Clients',
      icon: Users,
      children: [
        { path: '/manager/clients', search: 'view=pending', icon: Users, label: 'Demandes clients' },
        { path: '/manager/clients', search: 'view=history', icon: FileText, label: 'Historique' },
      ],
    },
    {
      label: 'Investissement',
      icon: TrendingUp,
      children: [
        { path: '/manager/investments', search: 'view=requests', icon: FileText, label: 'Mes demandes' },
        { path: '/manager/investments', search: 'view=list', icon: TrendingUp, label: "Liste des projets d'investissement" },
        { path: '/manager/investments', search: 'view=create', icon: Plus, label: "Ajout de projet d'investissement" },
      ],
    },
  ];

  const matchesItem = (item) => {
    if (location.pathname !== item.path) return false;
    if (!item.search) return true;
    return location.search.replace(/^\?/, '') === item.search;
  };

  const initialOpenGroups = useMemo(
    () => adminGroups.reduce((acc, group) => ({
      ...acc,
      [group.label]: group.children.some(matchesItem),
    }), {}),
    [location.pathname, location.search]
  );
  const [openGroups, setOpenGroups] = useState(initialOpenGroups);

  const menuItems = {
    [ROLES.ADMIN]: [
      { section: 'Pilotage' },
      { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { section: 'Domaines metier' },
      ...adminGroups,
      { section: 'Relations' },
      { path: '/admin/messages', icon: MessageSquare, label: 'Messages' },
      { path: '/admin/partnerships', icon: Handshake, label: 'Partenariats' },
      { path: '/admin/partner-products', icon: Package, label: 'Produits partenaires' },
      { section: 'Parametres' },
      { path: '/admin/reports', icon: BarChart3, label: 'Rapports' },
      { path: '/admin/house-models', icon: Building, label: 'Modeles maison' },
      { path: '/admin/catalog', icon: Settings, label: 'Catalogue' },
      { path: '/admin/profile', icon: Shield, label: 'Profil' },
    ],
    [ROLES.MANAGER]: [
      { section: 'Pilotage' },
      { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { section: 'Domaines metier' },
      ...managerGroups,
      { section: 'Relations' },
      { path: '/manager/reports', icon: BarChart3, label: 'Rapports' },
      { section: 'Parametres' },
      { path: '/manager/profile', icon: Shield, label: 'Profil' },
    ],
    [ROLES.AGENT]: (() => {
      const agentType = normalizeAgentType(user?.agent_type || user?.agentType);
      const workspaceHeader = agentType === 'constructeur'
        ? 'Espace agent construction'
        : agentType === 'investissement'
          ? 'Espace agent investissement'
          : 'Espace agent immobilier';
      const agentPropertyGroup = {
        label: 'Propriete',
        icon: Building,
        children: [
          { path: '/agent/properties', icon: UserCheck, label: 'Propriete assignee' },
          { path: '/agent/all-properties', icon: CheckCircle, label: 'Propriete creee' },
        ],
      };
      const agentClientGroup = {
        label: 'Client',
        icon: Users,
        children: [
          { path: '/agent/assigned', search: 'view=clients', icon: Users, label: 'Clients assignes' },
          { path: '/agent/assigned', search: 'view=history', icon: FileText, label: 'Historique clients assignes' },
        ],
      };
      const agentSearchGroup = {
        label: 'Demandes de recherche',
        icon: Search,
        children: [
          { path: '/agent/search-requests', search: 'view=assigned', icon: Search, label: 'Demande assignee' },
          { path: '/agent/search-requests', search: 'view=history', icon: FileText, label: 'Historique des demandes' },
        ],
      };
      const baseItems = [
        { section: 'Pilotage' },
        { path: '/agent/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      ];

      if (agentType === 'constructeur') {
        return [
          { section: workspaceHeader },
          ...baseItems,
          { section: 'Domaines metier' },
          agentClientGroup,
          agentSearchGroup,
          { section: 'Communication' },
          { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
          { section: 'Compte' },
          { path: '/agent/profile', icon: Shield, label: 'Profil' },
        ];
      }

      if (agentType === 'investissement') {
        return [
          { section: workspaceHeader },
          ...baseItems,
          { section: 'Domaines metier' },
          agentClientGroup,
          agentSearchGroup,
          { section: 'Communication' },
          { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
          { section: 'Compte' },
          { path: '/agent/profile', icon: Shield, label: 'Profil' },
        ];
      }

      return [
        { section: workspaceHeader },
        ...baseItems,
        { section: 'Domaines metier' },
        agentPropertyGroup,
        agentClientGroup,
        agentSearchGroup,
        { section: 'Communication' },
        { path: '/agent/messages', icon: MessageSquare, label: 'Messages' },
        { section: 'Compte' },
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

  const currentRole = user?.role?.slug || user?.role;
  const currentMenu = menuItems[currentRole] || [];
  const roleLabel = currentRole === ROLES.ADMIN
    ? 'Administration'
    : currentRole === ROLES.MANAGER
      ? 'Gestionnaire'
      : currentRole || 'Espace';

  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-screen bg-[rgb(var(--ink))] text-[rgb(var(--paper))] border-r border-[rgba(255,253,250,0.08)]">
      <div className="p-6 border-b border-[rgba(255,253,250,0.08)]">
        <div className="space-y-4">
          <div>
            <div className="inline-flex rounded-xl bg-white px-3 py-2 shadow-sm">
              <img src="/images/logoabi2.png" alt="NARAF Immobilier" className="h-7 w-auto object-contain" />
            </div>
            <p className="mt-2 text-xs text-[rgba(255,253,250,0.6)]">Espace de gestion</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {currentMenu.map((item) => {
            if (item.section) {
              return (
                <div key={item.section} className="px-2 pt-3 pb-1">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(255,253,250,0.4)]">
                    {item.section}
                  </p>
                </div>
              );
            }

            if (item.children) {
              const groupActive = item.children.some(matchesItem);
              const isOpen = openGroups[item.label] || groupActive;

              return (
                <div key={item.label} className={`rounded-2xl border transition ${
                  groupActive
                    ? 'border-[rgba(255,253,250,0.14)] bg-[rgba(255,253,250,0.08)]'
                    : 'border-[rgba(255,253,250,0.06)] bg-[rgba(255,253,250,0.03)]'
                }`}>
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [item.label]: !isOpen }))}
                    className={`w-full group flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                      groupActive
                        ? 'text-[rgb(var(--paper))]'
                        : 'text-[rgba(255,253,250,0.7)] hover:bg-[rgba(255,253,250,0.06)]'
                    }`}
                  >
                    <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      groupActive ? 'bg-[rgba(255,253,250,0.12)]' : 'bg-[rgba(255,253,250,0.06)]'
                    }`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1">
                      {item.children.map((child) => {
                        const isActive = matchesItem(child);
                        return (
                          <Link
                            key={`${child.path}?${child.search || ''}`}
                            to={child.search ? `${child.path}?${child.search}` : child.path}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                              isActive
                                ? 'bg-[rgb(var(--paper))] text-[rgb(var(--ink))] shadow-[0_12px_22px_rgba(0,0,0,0.2)]'
                                : 'text-[rgba(255,253,250,0.72)] hover:bg-[rgba(255,253,250,0.08)]'
                            }`}
                          >
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              isActive ? 'bg-[rgba(15,42,46,0.08)]' : 'bg-[rgba(255,253,250,0.06)]'
                            }`}>
                              <child.icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
          <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,253,250,0.45)]">Naraf Dash</p>
          <p className="text-xs text-[rgba(255,253,250,0.6)]">Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
