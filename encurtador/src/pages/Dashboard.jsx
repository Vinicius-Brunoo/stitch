import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, serverTimestamp } from "../config/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { generateShortCode, isValidUrl } from "../utils/helpers";
import { 
  Link2, 
  LogOut, 
  Link as LinkIcon, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  ExternalLink 
} from "lucide-react";

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [originalUrl, setOriginalUrl] = useState("");
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Controla animação temporária do botão "Copiar" individual por ID
  const [copiedId, setCopiedId] = useState(null);

  // Sincronização em tempo real dos links do usuário logado
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "links"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLinks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLinks(fetchedLinks);
        setLoadingLinks(false);
      },
      (err) => {
        console.error("Erro no onSnapshot:", err);
        setLoadingLinks(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Função para exibir mensagem temporária (Toast)
  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  }

  // Ação de Encurtar Link
  async function handleEncurtar(e) {
    e.preventDefault();
    setError("");

    const formattedUrl = originalUrl.trim();
    if (!formattedUrl) {
      setError("A URL não pode estar vazia.");
      return;
    }

    if (!isValidUrl(formattedUrl)) {
      setError("Insira uma URL válida (ex: https://exemplo.com).");
      return;
    }

    setSubmitLoading(true);

    try {
      const code = generateShortCode();
      const docRef = doc(db, "links", code);

      await setDoc(docRef, {
        id: code,
        code: code,
        shortCode: code,
        originalUrl: formattedUrl,
        userId: currentUser.uid,
        clicks: 0,
        createdAt: serverTimestamp(),
      });

      setOriginalUrl("");
      showToast("Link encurtado com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar link:", err);
      setError("Ocorreu um erro ao gerar o link curto. Tente novamente.");
    } finally {
      setSubmitLoading(false);
    }
  }

  // Ação de Excluir Link
  async function handleDelete(id) {
    const confirmDelete = window.confirm("Deseja realmente excluir este link?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "links", id));
      showToast("Link excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir link:", err);
      showToast("Erro ao excluir o link.");
    }
  }

  // Ação de Copiar Link Curto para o Clipboard
  function handleCopy(id, code) {
    const shortUrl = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    showToast("Copiado para a área de transferência!");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="header-logo-icon">
            <Link2 size={24} />
          </span>
          <span>Encurta Link Senai</span>
        </div>
        <div className="user-profile">
          <span className="user-email">{currentUser?.email}</span>
          <button onClick={() => logout()} className="logout-btn">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Formulário de Encurtamento */}
        <section className="form-panel glass-panel">
          <h2 className="form-panel-title">Encurte um link longo</h2>
          <form onSubmit={handleEncurtar} className="link-form">
            {error && <div className="error-message">{error}</div>}
            <div className="link-form-row">
              <div className="link-input-wrapper">
                <LinkIcon size={20} className="link-input-icon" />
                <input
                  type="text"
                  placeholder="Cole sua URL longa aqui..."
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="link-input"
                  disabled={submitLoading}
                />
              </div>
              <button
                type="submit"
                disabled={submitLoading}
                className="submit-btn"
              >
                {submitLoading ? (
                  "Gerando..."
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Encurtar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Lista de Links do Usuário */}
        <section className="list-panel glass-panel">
          <div className="list-header">
            <h2 className="list-title">
              Seus Links
              <span className="links-count-badge">{links.length}</span>
            </h2>
          </div>

          {loadingLinks ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div className="spinner" style={{ margin: "0 auto 16px auto", width: "36px", height: "36px" }}></div>
              <p style={{ color: "var(--text-secondary)" }}>Carregando seus links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="empty-state">
              <LinkIcon size={48} className="empty-state-icon" />
              <p>Você ainda não criou nenhum link encurtado.</p>
            </div>
          ) : (
            <div className="links-grid">
              {links.map((link) => {
                const shortUrl = `${window.location.origin}/r/${link.code}`;
                const formattedDate = link.createdAt
                  ? link.createdAt.toDate().toLocaleDateString("pt-BR")
                  : "...";

                return (
                  <div key={link.id} className="link-card">
                    {/* URL Original */}
                    <div className="url-column">
                      <div className="url-label">URL Original</div>
                      <div className="url-original" title={link.originalUrl}>
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {link.originalUrl}
                        </a>
                      </div>
                    </div>

                    {/* URL Curta */}
                    <div className="url-column">
                      <div className="url-label">Link Curto</div>
                      <div className="short-url-container">
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="short-url-link"
                        >
                          {window.location.host}/r/{link.code}
                        </a>
                      </div>
                    </div>

                    {/* Contador de Cliques */}
                    <div>
                      <div className="url-label">Cliques</div>
                      <div className="clicks-badge">
                        {link.clicks || 0} clicks
                      </div>
                    </div>

                    {/* Data de Criação */}
                    <div>
                      <div className="url-label">Criado em</div>
                      <div className="date-text">{formattedDate}</div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="card-actions">
                      <button
                        onClick={() => handleCopy(link.id, link.code)}
                        className="icon-btn copy-btn"
                        title="Copiar link"
                      >
                        {copiedId === link.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <a
                        href={link.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn"
                        title="Visitar URL original"
                        style={{ display: "inline-flex" }}
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="icon-btn delete-btn"
                        title="Excluir link"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <Check size={18} style={{ color: "var(--accent-color)" }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
