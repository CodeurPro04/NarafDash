import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, profileService } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const clearStoredSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        const profileResponse = await profileService.getProfile();
        const freshUser = profileResponse?.data?.data?.user;
        const fallbackUser = JSON.parse(storedUser);
        const nextUser = freshUser || fallbackUser;

        if (nextUser?.is_active === false) {
          clearStoredSession();
          setUser(null);
        } else {
          setUser(nextUser);
          localStorage.setItem("user", JSON.stringify(nextUser));
        }
      }
    } catch (error) {
      clearStoredSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { user: userData, token } = response.data.data;

      if (userData?.is_active === false) {
        clearStoredSession();
        setUser(null);
        return {
          success: false,
          error:
            "Votre compte est en attente d'activation. L'acces au backoffice sera disponible apres validation par un administrateur.",
        };
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Erreur de connexion",
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Erreur lors de la deconnexion:", error);
    } finally {
      setUser(null);
      clearStoredSession();
      window.location.href = "/";
    }
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        checkAuthStatus,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
