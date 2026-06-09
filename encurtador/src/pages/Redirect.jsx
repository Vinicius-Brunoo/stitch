import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import LoadingScreen from "../components/LoadingScreen";

export default function Redirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleRedirection() {
      if (!code) {
        navigate("/login");
        return;
      }

      try {
        const docRef = doc(db, "links", code);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Incrementa de forma atômica o contador de cliques
          await updateDoc(docRef, {
            clicks: increment(1),
          });

          // Recupera a URL original
          const data = docSnap.data();
          let originalUrl = data.originalUrl;

          // Redireciona o navegador instantaneamente
          window.location.replace(originalUrl);
        } else {
          // Conforme solicitado, redireciona o usuário diretamente para a tela de Login
          console.warn("Código de link encurtado não encontrado:", code);
          navigate("/login");
        }
      } catch (err) {
        console.error("Erro no redirecionamento:", err);
        setError("Erro ao processar redirecionamento. Redirecionando para login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    }

    handleRedirection();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="loading-container">
        <p style={{ color: "var(--danger-color)" }}>{error}</p>
      </div>
    );
  }

  return <LoadingScreen />;
}
