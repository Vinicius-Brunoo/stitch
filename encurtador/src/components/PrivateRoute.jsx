import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

export default function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return currentUser ? children : <Navigate to="/login" replace />;
}
