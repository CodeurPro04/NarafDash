import React, { useEffect, useMemo, useState } from "react";

import Header from "../common/Header";

import Sidebar from "../common/Sidebar";

import { adminService } from "../../services/api";

import {
  Users,
  Building,
  Handshake,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

const DashboardAdmin = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    users: 0,

    properties: 0,

    investments: 0,

    partnerships: 0,
  });

  const [roleStats, setRoleStats] = useState([]);

  const [propertyStats, setPropertyStats] = useState([]);

  const [loading, setLoading] = useState(true);

  const extractPayload = (response) =>
    response?.data?.data ?? response?.data ?? {};

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [dashboardRes, statsRes, rolesRes] = await Promise.all([
        adminService.getDashboard(),

        adminService.getStatistics(),

        adminService.getRoles(),
      ]);

      const dashboardData = extractPayload(dashboardRes);

      const statsData = extractPayload(statsRes);

      const rolesData = extractPayload(rolesRes);

      const rolesArray = Array.isArray(rolesData)
        ? rolesData
        : rolesData?.data || [];

      const rolesMap = new Map(
        rolesArray.map((role) => [role.id, role.name || role.slug])
      );

      setSummary({
        users: dashboardData.users_count ?? dashboardData.total_users ?? 0,

        properties:
          dashboardData.properties_count ?? dashboardData.total_properties ?? 0,

        investments: dashboardData.investment_projects_count ?? 0,

        partnerships: dashboardData.partnerships_count ?? 0,
      });

      const userRoleStats = (statsData.users_per_role || []).map((item) => ({
        label: rolesMap.get(item.role_id) || `Role ${item.role_id}`,

        value: item.count,
      }));

      const propertyStatusStats = (statsData.properties_status || []).map(
        (item) => ({
          label: item.status,

          value: item.count,
        })
      );

      setRoleStats(userRoleStats);

      setPropertyStats(propertyStatusStats);
    } catch (error) {
      console.error("Erreur lors du chargement du dashboard admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(
    () => [
      {
        title: "Utilisateurs",
        value: summary.users,
        icon: Users,
        note: "Comptes actifs",
      },

      {
        title: "PropriÃ©tÃ©s",
        value: summary.properties,
        icon: Building,
        note: "Annonces publiÃ©es",
      },

      {
        title: "Investissements",
        value: summary.investments,
        icon: TrendingUp,
        note: "Projets ouverts",
      },

      {
        title: "Partenariats",
        value: summary.partnerships,
        icon: Handshake,
        note: "Dossiers en cours",
      },
    ],
    [summary]
  );

  const quickActions = [
    {
      label: "CrÃ©er un compte",
      description: "Agents et gestionnaires",
      onClick: () => navigate("/admin/users"),
    },

    {
      label: "Superviser les annonces",
      description: "Tout le catalogue",
      onClick: () => navigate("/admin/properties"),
    },

    {
      label: "Catalogue immobilier",
      description: "Types et caracteristiques",
      onClick: () => navigate("/admin/catalog"),
    },

    {
      label: "Messages clients",
      description: "RÃ©pondre et suivre",
      onClick: () => navigate("/admin/messages"),
    },
  ];

  return (
    <div className="app-shell flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="chip">Administration centrale</p>

                <h1 className="text-3xl font-semibold mt-3">
                  Tableau de bord administrateur
                </h1>

                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Vue globale des performances et des opÃ©rations critiques.
                </p>
              </div>

              <div className="surface-soft px-4 py-3 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--sage))]"></span>

                <span className="text-xs font-medium text-[rgba(15,42,46,0.7)]">
                  SystÃ¨me opÃ©rationnel
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {statCards.map((stat) => (
                <div key={stat.title} className="surface-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[rgba(15,42,46,0.6)]">
                        {stat.title}
                      </p>

                      <p className="text-3xl font-semibold mt-2">
                        {loading
                          ? "..."
                          : Number(stat.value || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                      <stat.icon className="h-6 w-6 text-[rgb(var(--ink))]" />
                    </div>
                  </div>

                  <p className="text-xs text-[rgba(15,42,46,0.5)] mt-4">
                    {stat.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Repartition des roles
                    </h2>

                    <ShieldCheck className="h-5 w-5 text-[rgba(15,42,46,0.6)]" />
                  </div>

                  <div className="space-y-3">
                    {roleStats.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">
                        Aucune donnee disponible.
                      </p>
                    )}

                    {roleStats.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between surface-soft px-4 py-3"
                      >
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>

                        <span className="text-sm font-semibold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Statut des proprietes
                    </h2>

                    <Building className="h-5 w-5 text-[rgba(15,42,46,0.6)]" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {propertyStats.length === 0 && (
                      <p className="text-sm text-[rgba(15,42,46,0.5)]">
                        Aucune statistique remontee.
                      </p>
                    )}

                    {propertyStats.map((item) => (
                      <div
                        key={item.label}
                        className="surface-soft px-4 py-3 flex items-center justify-between"
                      >
                        <span className="text-sm capitalize">{item.label}</span>

                        <span className="text-sm font-semibold">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Actions rapides
                  </h2>

                  <div className="space-y-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={action.onClick}
                        className="w-full flex items-center justify-between surface-soft px-4 py-3 text-left hover:border-[rgba(15,42,46,0.2)] transition"
                      >
                        <div>
                          <p className="text-sm font-medium">{action.label}</p>

                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            {action.description}
                          </p>
                        </div>

                        <ArrowUpRight className="h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="surface-panel p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Points d'attention
                  </h2>

                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.6)]">
                    <p>- Verifier les annonces en attente d'assignation.</p>

                    <p>- Suivre les partenariats en attente de validation.</p>

                    <p>- Mettre a jour les roles cles.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardAdmin;
