import React from "react";

export default function LoadingScreen() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Verificando autenticação...</p>
    </div>
  );
}
