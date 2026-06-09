# Plano de Desenvolvimento: Encurtador de Links (React + Vite + Firebase)

Este documento estabelece a arquitetura, estrutura de arquivos, modelagem de dados e o plano de tarefas passo a passo para a implementação do encurtador de links. 

---

## 📋 Visão Geral do Projeto

O objetivo é desenvolver uma aplicação web moderna de encurtamento de links contendo uma área autenticada e uma rota pública de redirecionamento.

- **Frontend**: Single Page Application (SPA) responsiva com foco em estética premium, utilizando tema escuro nativo e micro-interações.
- **Backend & Banco de Dados**: Serverless utilizando Firebase (Authentication e Cloud Firestore).
- **Idioma**: Interface em Português do Brasil (PT-BR).

---

## 🎯 Critérios de Sucesso

1. **Acesso Público**:
   - Qualquer usuário pode acessar `/r/:code` e ser redirecionado instantaneamente para a URL original correspondente.
   - O redirecionamento precisa incrementar o contador de cliques de forma atômica no Firestore.
2. **Acesso Restrito**:
   - Apenas usuários autenticados via Firebase Auth (E-mail/Senha ou Google) podem acessar a tela de Dashboard.
   - Tentativas de acessar o Dashboard sem login redirecionam para a tela `/login`.
3. **Gerenciamento de Links**:
   - Geração de código único de 6 caracteres aleatórios.
   - Salvamento do link no Firestore vinculando o `userId` do usuário logado.
   - Sincronização em tempo real da lista de links (utilizando `onSnapshot`) com informações de cliques, URL original e opção de excluir/copiar.

---

## 🛠️ Stack Tecnológica

- **Vite + React (JS/JSX)**: Build rápido e renderização eficiente.
- **React Router DOM v6**: Gerenciamento de rotas (incluindo rotas protegidas e a rota de redirecionamento dinâmico).
- **Firebase SDK (v10+)**:
  - **Firebase Auth**: Login com provedor de E-mail/Senha e login social Google.
  - **Cloud Firestore**: Banco NoSQL em tempo real para armazenamento de links.
- **Vanilla CSS (ou TailwindCSS)**: Estilização moderna sob tema escuro (Dark Mode por padrão), utilizando variáveis CSS customizadas, efeitos de glassmorphism e transições suaves.
- **Lucide React**: Biblioteca de ícones moderna.

---

## 📁 Estrutura de Pastas Sugerida

A estrutura abaixo separa as responsabilidades de configuração do Firebase, contextos globais de autenticação, componentes de interface reutilizáveis e páginas da aplicação:

```
encurtador/
├── .agent/                      # Agentes e Skills locais da IA
├── docs/
│   └── PLAN-encurtador-links.md # Este plano de desenvolvimento
├── .env.example                 # Modelo de variáveis de ambiente
├── firestore.rules              # Regras de segurança do Firestore
├── index.html                   # HTML base da aplicação
├── package.json                 # Dependências do projeto
├── vite.config.js               # Configuração do Vite
├── src/
│   ├── main.jsx                 # Ponto de entrada do React
│   ├── index.css                # CSS Global (Tema Escuro, Variáveis e Reset)
│   ├── App.jsx                  # Roteador central e layout da aplicação
│   ├── config/
│   │   └── firebase.js          # Inicialização do Firebase (Auth e Firestore)
│   ├── context/
│   │   └── AuthContext.jsx      # Contexto de Autenticação global
│   ├── components/
│   │   ├── PrivateRoute.jsx     # Componente wrapper para rotas restritas
│   │   ├── LoadingScreen.jsx    # Feedback de carregamento (Spinner moderno)
│   │   ├── LinkForm.jsx         # Formulário para entrada e validação da URL
│   │   ├── LinkItem.jsx         # Cartão individual do link com ações (Copiar/Excluir)
│   │   └── LinkList.jsx         # Container que gerencia a lista em tempo real
│   ├── pages/
│   │   ├── Login.jsx            # Interface de login (E-mail + Google, Dark Mode)
│   │   ├── Dashboard.jsx        # Tela administrativa restrita dos links
│   │   └── Redirect.jsx         # Tela pública de redirecionamento `/r/:code`
│   └── utils/
│       └── helpers.js           # Funções utilitárias (Gerador de hash, Validador URL)
```

---

## 🗄️ Modelagem da Coleção no Firestore

Os links serão salvos em uma coleção raiz chamada `links`. O identificador exclusivo de cada documento (`Document ID`) será o próprio código de 6 caracteres aleatórios gerado. Isso otimiza a busca no redirecionamento público.

### Coleção: `links`

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `id` *(Doc ID)* | `string` | Código de 6 caracteres gerado para o link | `"abc123"` |
| `code` | `string` | O mesmo código de 6 caracteres (para queries) | `"abc123"` |
| `originalUrl` | `string` | URL longa original inserida pelo usuário | `"https://google.com/search?q=stitch"` |
| `userId` | `string` | ID único do usuário criador (UID do Firebase Auth) | `"uJ90sk2n1Pl0s8aK3jN8a1Hs9"` |
| `clicks` | `number` | Contador de cliques acumulados | `42` |
| `createdAt` | `timestamp` | Data/Hora de criação do link encurtado | `8 de junho de 2026 às 19:48:47 UTC-3` |

---

## 🔐 Regras de Segurança do Firestore

As regras de segurança garantem isolamento de dados na área administrativa e acesso controlado de leitura/gravação ao público na rota de redirecionamento.

O arquivo `firestore.rules` foi estruturado da seguinte forma:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /links/{linkId} {
      // 1. Redirecionamento: Leitura individual (get) permitida a qualquer visitante.
      allow get: if true;

      // 2. Área Restrita (Listagem): Apenas o dono autenticado pode listar seus links.
      allow list: if request.auth != null && resource.data.userId == request.auth.uid;

      // 3. Área Restrita (Criação): Usuário logado cria o link mapeando seu próprio UID.
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.clicks == 0
                    && request.resource.data.code == linkId;

      // 4. Atualização: 
      // - O dono pode atualizar qualquer campo (ex: atualizar dados básicos).
      // - Visitantes anônimos podem atualizar apenas o campo 'clicks' (incremento do clique).
      allow update: if (request.auth != null && resource.data.userId == request.auth.uid)
                    || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['clicks']));

      // 5. Exclusão: Apenas o dono do link pode deletá-lo.
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 📝 Plano de Tarefas (Task Breakdown)

Este cronograma descreve as tarefas em ordem lógica de dependência para a implementação do sistema por um assistente de desenvolvimento.

### Fase 1: Fundação do Projeto

#### Tarefa 1.1: Inicialização e Dependências
- **Agente**: `devops-engineer`
- **Ações**:
  - Executar a criação do projeto React + Vite.
  - Instalar dependências: `firebase`, `react-router-dom`, `lucide-react`.
  - Configurar arquivo `.env` baseado no `.env.example`.
- **INPUT**: Diretório vazio.
- **OUTPUT**: Estrutura básica do Vite criada, dependências no `package.json` instaladas.
- **VERIFY**: Executar `npm run dev` com sucesso na porta padrão.

#### Tarefa 1.2: Integração com o Firebase
- **Agente**: `backend-specialist`
- **Ações**:
  - Criar `src/config/firebase.js`.
  - Inicializar a aplicação Firebase e expor as instâncias de `auth` e `db` (Firestore).
- **INPUT**: Variáveis do `.env` e arquivo `firebase.js` vazio.
- **OUTPUT**: Conexão estabelecida com Firebase.
- **VERIFY**: Importar as instâncias no console ou inicializar sem crash de chaves vazias.

---

### Fase 2: Autenticação e Segurança

#### Tarefa 2.1: Contexto de Autenticação (AuthContext)
- **Agente**: `backend-specialist` (Segurança: `security-auditor`)
- **Ações**:
  - Criar `src/context/AuthContext.jsx`.
  - Implementar o Listener de estado do Firebase Auth (`onAuthStateChanged`).
  - Disponibilizar métodos para Login (E-mail/Senha), Login com Google, Logout e Cadastro.
- **INPUT**: Instância do `auth` no `firebase.js`.
- **OUTPUT**: Provedor `AuthProvider` envolvendo a aplicação em `main.jsx`.
- **VERIFY**: Componente expondo `currentUser` e carregando estado inicial de autenticação de forma síncrona.

#### Tarefa 2.2: Roteamento Privado (PrivateRoute)
- **Agente**: `frontend-specialist`
- **Ações**:
  - Criar `src/components/PrivateRoute.jsx`.
  - Impedir que usuários não autenticados acessem rotas filhas (ex: Dashboard), redirecionando para `/login`.
  - Exibir `LoadingScreen.jsx` durante a validação do estado do Firebase Auth (`loading === true`).
- **INPUT**: `AuthContext` ativo.
- **OUTPUT**: Guardião de rotas pronto para proteção de telas.
- **VERIFY**: Tentar acessar `/dashboard` deslogado e ser redirecionado para `/login`.

---

### Fase 3: Interfaces de Usuário (Aparência Moderna e Premium)

#### Tarefa 3.1: CSS Global e Identidade Visual (index.css)
- **Agente**: `frontend-specialist`
- **Ações**:
  - Configurar paleta de cores moderna (fundo cinza grafite escuro, acentos em verde menta ou azul neon, superfícies em cinza translúcido para glassmorphism).
  - Configurar tipografia premium (ex: Inter ou Outfit via Google Fonts).
  - Criar estilos globais de formulários e botões com animações de hover/active.
- **INPUT**: Arquivo `index.css` padrão.
- **OUTPUT**: Design System definido com variáveis CSS no root.
- **VERIFY**: Layouts sem cores básicas genéricas. Não utilizar tons roxos/violetas (de acordo com diretrizes de estilo).

#### Tarefa 3.2: Tela de Login Moderna
- **Agente**: `frontend-specialist`
- **Ações**:
  - Criar `src/pages/Login.jsx`.
  - Layout centralizado responsivo com efeito de Glassmorphism (efeito vidro fosco).
  - Formulário com campos de E-mail e Senha (com validação básica de UI).
  - Botão de Acesso Rápido com Google com o logo oficial e feedback visual de carregamento.
- **INPUT**: Design System e `AuthContext`.
- **OUTPUT**: Login funcional em português com transições visuais interativas.
- **VERIFY**: Realizar login com credenciais e com Google, checando redirecionamento para o Dashboard após sucesso.

---

### Fase 4: Fluxo de Encurtamento de Links (Área Restrita)

#### Tarefa 4.1: Gerador de Códigos e Validador (helpers.js)
- **Agente**: `backend-specialist`
- **Ações**:
  - Criar `src/utils/helpers.js`.
  - Implementar função que gera 6 caracteres aleatórios alfanuméricos (`a-z`, `A-Z`, `0-9`).
  - Implementar validação básica de URL usando o construtor `URL` nativo do JS.
- **INPUT**: Código vazio.
- **OUTPUT**: Funções utilitárias exportadas.
- **VERIFY**: Validar se o gerador retorna exatamente 6 caracteres aleatórios e se o validador bloqueia entradas inválidas (ex: "texto_sem_http").

#### Tarefa 4.2: Tela do Dashboard e Formulário
- **Agente**: `frontend-specialist`
- **Ações**:
  - Criar `src/pages/Dashboard.jsx` e `src/components/LinkForm.jsx`.
  - Formulário com campo de entrada longo, validação imediata da URL.
  - Ao clicar em "Encurtar", gerar o código de 6 caracteres.
  - Gravar no Firestore na coleção `links` com documento de ID igual ao código gerado.
- **INPUT**: Helpers de código e Firebase DB.
- **OUTPUT**: Salvamento de links no banco vinculando ao UID do usuário logado.
- **VERIFY**: Conferir inserção do documento no Firebase Console com os campos: `code`, `originalUrl`, `userId`, `clicks: 0`, e `createdAt`.

#### Tarefa 4.3: Lista de Links em Tempo Real
- **Agente**: `frontend-specialist` (Segurança: `security-auditor`)
- **Ações**:
  - Criar `src/components/LinkList.jsx` e `src/components/LinkItem.jsx`.
  - Utilizar a função `onSnapshot` do Firestore para monitorar em tempo real as mudanças na coleção `links` onde o `userId == currentUser.uid`.
  - Exibir: URL Original (truncada), Link Encurtado, Cliques, Data formatada.
  - Adicionar botão "Copiar" (usa a API `navigator.clipboard.writeText`).
  - Adicionar botão "Excluir" (deleta o documento no Firestore).
- **INPUT**: Firestore `db` e dados do usuário logado.
- **OUTPUT**: Visualização reativa com feedbacks visuais ao copiar e ao excluir.
- **VERIFY**: Criar e deletar links em abas separadas e verificar se a interface atualiza instantaneamente sem necessidade de recarregar.

---

### Fase 5: Redirecionamento Público e Métricas

#### Tarefa 5.1: Rota de Redirecionamento (/r/:code)
- **Agente**: `backend-specialist`
- **Ações**:
  - Criar `src/pages/Redirect.jsx`.
  - Capturar o parâmetro `:code` através do React Router.
  - Buscar o documento correspondente na coleção `links`.
  - Se o link existir:
    - Incrementar o contador de cliques usando `increment(1)` do Firestore de forma atômica.
    - Redirecionar o navegador usando `window.location.replace(doc.originalUrl)`.
  - Se não existir:
    - Apresentar tela amigável de erro 404 (Link Não Encontrado).
- **INPUT**: Rota dinâmica ativa no App.jsx.
- **OUTPUT**: Redirecionamento rápido e contagem de cliques funcionando.
- **VERIFY**: Acessar um link existente, verificar redirecionamento correto e conferir no painel do Dashboard se os cliques foram incrementados.

---

## ✅ PHASE X: Lista de Verificação Final

Antes de concluir a entrega do projeto, garanta que os seguintes scripts e verificações sejam executados e passem:

- [ ] **Lint e Sintaxe**: Executar `npm run lint` para garantir código limpo e sem erros.
- [ ] **Firebase Rules**: Testar as regras de acesso no simulador de regras do console do Firebase.
- [ ] **Build Check**: Executar `npm run build` para garantir que o bundle final do Vite compile sem erros de tipos ou referências.
- [ ] **WCAG AA Check**: Garantir contraste de texto adequado para o modo escuro (contraste mínimo de 4.5:1).
