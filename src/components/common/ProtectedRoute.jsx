import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  allowedAgentTypes = [],
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (allowedRoles.length > 0) {
    const userRole = user.role?.slug || user.role;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" />;
    }
  }

  if (allowedAgentTypes.length > 0) {
    const userRole = user.role?.slug || user.role;
    if (userRole === "agent") {
      const agentType = (user.agent_type || user.agentType || "").toLowerCase();
      if (!allowedAgentTypes.includes(agentType)) {
        return <Navigate to="/agent/dashboard" />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
