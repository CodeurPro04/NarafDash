import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLES } from "../utils/roles";
import Header from "../components/common/Header";
import Sidebar from "../components/common/Sidebar";

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" />;
  }

  const userRole = user.role?.slug || user.role;

  switch (userRole) {
    case ROLES.ADMIN:
      return <Navigate to="/admin/dashboard" />;
    case ROLES.MANAGER:
      return <Navigate to="/manager/dashboard" />;
    case ROLES.AGENT:
      return <Navigate to="/agent/dashboard" />;
    case ROLES.OWNER:
      return <Navigate to="/" />;
    case ROLES.VISITOR:
      return <Navigate to="/visitor/profile" />;
    case ROLES.INVESTOR:
      return <Navigate to="/investor/dashboard" />;
    case ROLES.COMPANY:
      return <Navigate to="/company/dashboard" />;
    default:
      return (
        <div className="app-shell flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 px-6 py-8">
              <div className="max-w-4xl mx-auto surface-panel p-8 text-center">
                <h1 className="text-2xl font-semibold">
                  Bienvenue {user.first_name} {user.last_name}
                </h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-3">
                  Votre rôle n'est pas encore configuré dans le back-office.
                </p>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                  Contactez l'administrateur pour activer votre espace.
                </p>
              </div>
            </main>
          </div>
        </div>
      );
  }
};

export default Dashboard;
