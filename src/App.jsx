import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/common/Toast";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardAdmin from "./components/admin/DashboardAdmin";
import UserManagement from "./components/admin/UserManagement";
import PropertyManagementAdmin from "./components/admin/PropertyManagement";
import MessageManagementAdmin from "./components/admin/MessageManagement";
import AdminPropertyCatalog from "./components/admin/AdminPropertyCatalog";
import AdminProfile from "./components/admin/AdminProfile";
import AdminInvestmentManagement from "./components/admin/AdminInvestmentManagement";
import AdminPartnershipManagement from "./components/admin/AdminPartnershipManagement";
import AdminPartnerProductsValidation from "./components/admin/AdminPartnerProductsValidation";
import AdminHouseModelsManagement from "./components/admin/AdminHouseModelsManagement";
import AdminPresentationVideoManagement from "./components/admin/AdminPresentationVideoManagement";
import AdminNavAdsManagement from "./components/admin/AdminNavAdsManagement";
import AdminReports from "./components/admin/AdminReports";
import DashboardManager from "./components/manager/DashboardManager";
import PropertyManagementManager from "./components/manager/PropertyManagement";
import ManagerAssignments from "./components/manager/ManagerAssignments";
import ManagerReports from "./components/manager/ManagerReports";
import ManagerProfile from "./components/manager/ManagerProfile";
import ClientRequests from "./components/manager/ClientRequests";
import ManagerMessageManagement from "./components/manager/ManagerMessageManagement";
import ConstructionManagement from "./components/manager/ConstructionManagement";
import DashboardAgent from "./components/agent/DashboardAgent";
import PropertyValidation from "./components/agent/PropertyValidation";
import MessageManagementAgent from "./components/agent/MessageManagement";
import AgentSearchRequests from "./components/agent/AgentSearchRequests";
import AgentConstructionAssignments from "./components/agent/AgentConstructionAssignments";
import AgentProfile from "./components/agent/AgentProfile";
import AgentCreateProperty from "./components/agent/AgentCreateProperty";
import AgentPropertyManagement from "./components/agent/AgentPropertyManagement";
import AgentAssignments from "./components/agent/AgentAssignments";
import AgentConstructionPublications from "./components/agent/AgentConstructionPublications";
import AgentInvestmentPublications from "./components/agent/AgentInvestmentPublications";
import AgentInvestmentProposals from "./components/agent/AgentInvestmentProposals";
import VisitorProfile from "./components/visitor/VisitorProfile";
import AdminMessageDetail from "./components/admin/MessageDetail";
import { ROLES } from "./utils/roles";

function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Routes Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <DashboardAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/properties"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <PropertyManagementAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <MessageManagementAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages/:uuid"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminMessageDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/catalog"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminPropertyCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/investments"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminInvestmentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/house-models"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminHouseModelsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/presentation-video"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminPresentationVideoManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/nav-ads"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminNavAdsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/partnerships"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminPartnershipManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/partner-products"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <AdminPartnerProductsValidation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assignments"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <ManagerAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <ClientRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/construction-projects"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <ConstructionManagement />
                </ProtectedRoute>
              }
            />

            {/* Routes Manager */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <DashboardManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/properties"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <PropertyManagementManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/assignments"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ManagerAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/clients"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ClientRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/messages"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ManagerMessageManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/reports"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ManagerReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/construction-projects"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ConstructionManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/investments"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <AdminInvestmentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                  <ManagerProfile />
                </ProtectedRoute>
              }
            />

            {/* Routes Agent */}
            <Route
              path="/agent/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                  <DashboardAgent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/properties"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["immobilier"]}
                >
                  <PropertyValidation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/all-properties"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["immobilier"]}
                >
                  <AgentPropertyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/messages"
              element={
                <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                  <MessageManagementAgent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/search-requests"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["immobilier", "constructeur", "investissement"]}
                >
                  <AgentSearchRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/assigned"
              element={
                <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                  <AgentAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/construction"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["constructeur"]}
                >
                  <AgentConstructionAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/construction-publications"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["constructeur"]}
                >
                  <AgentConstructionPublications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/investment-publications"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["investissement"]}
                >
                  <AgentInvestmentPublications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/investment-proposals"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["investissement"]}
                >
                  <AgentInvestmentProposals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/property-requests/:uuid/create"
              element={
                <ProtectedRoute
                  allowedRoles={[ROLES.AGENT]}
                  allowedAgentTypes={["immobilier"]}
                >
                  <AgentCreateProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.AGENT]}>
                  <AgentProfile />
                </ProtectedRoute>
              }
            />

            {/* Routes Visitor */}
            <Route
              path="/visitor/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.VISITOR]}>
                  <VisitorProfile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </ToastProvider>
  );
}

export default App;
