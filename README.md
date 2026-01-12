# EduConnect 🎓

**EduConnect** é uma **Plataforma Educacional** com foco em uma jornada guiada: o aluno **não escolhe matéria**.  
Ele entra na **Turma do EduConnect** e automaticamente passa a ter acesso a uma **grade fixa**:

- **Python**
- **SQL**
- **Data Science**
- **Estatística**
- **Inteligência Artificial**

Além disso, a plataforma organiza **turmas**, **professores**, **matrículas**, **tarefas**, **entregas**, **notas/frequência**, **notificações**, **agenda/eventos** e **relatórios (boletim em PDF)**.

---

## Sumário

- [Regras de Negócio](#regras-de-negócio)
- [Papéis e Permissões](#papéis-e-permissões)
- [Stack](#stack)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Rodando Localmente](#rodando-localmente)
  - [Backend (API)](#backend-api)
  - [Frontend (Web)](#frontend-web)
- [Credenciais Padrão](#credenciais-padrão)
- [Fluxos Principais](#fluxos-principais)
- [Upload de Entregas](#upload-de-entregas)
- [Relatórios (Boletim PDF)](#relatórios-boletim-pdf)
- [Integração com Power Automate](#integração-com-power-automate)
- [Troubleshooting](#troubleshooting)

---

## Regras de Negócio

### 1) Grade fixa (sem escolha de matérias)
No EduConnect, o aluno **não monta grade**.

✅ Ao entrar em uma **Turma**, ele recebe a grade fixa do EduConnect:  
**Python, SQL, Data Science, Estatística e Inteligência Artificial**.

> Essas disciplinas já existem no banco via seed/migration (EF Core).

---

### 2) Turma ≠ Disciplina (mas elas se conectam)
A Turma possui sua “grade” através do vínculo **TurmaDisciplina**:

- **Turma**: “1A”, “2B”, “TURMA-2025-1A”, etc.
- **Disciplina**: Python, SQL, DS, Estatística, IA
- **TurmaDisciplina**: o vínculo que define a grade da turma **e quem é o professor daquela disciplina na turma**

📌 Isso permite, por exemplo:
- Turma 1A ter Python com Prof. X
- Turma 2B ter Python com Prof. Y

---

### 3) Matrícula e pagamento
A matrícula do aluno em uma turma nasce com:

- `StatusPagamento = Pendente`
- `PagamentoAprovadoEm = null`

Quando o pagamento é **aprovado**, o sistema:
- marca matrícula como **Aprovado**
- pode **gerar acesso** do aluno (credenciais) e disparar e-mail (via Power Automate)

---

### 4) Notas e frequência
O EduConnect guarda:
- **Nota** (0–10)
- **Frequência** (0–100%)

As informações podem ser usadas para:
- visão do aluno
- visão do professor/admin
- geração do boletim

---

## Papéis e Permissões

Existem 3 roles:

### 👑 Admin
Responsável por “operar” a escola:
- CRUD de **Alunos** e **Professores**
- CRUD de **Turmas**
- Vincular **Disciplinas na Turma** e atribuir **Professor**
- Criar/gerenciar **matrículas** e **aprovar pagamento**
- Gerar acesso (credenciais) e disparar e-mail de provisionamento
- Criar eventos e notificações (globais e por turma)
- Consultar relatórios (ex.: boletim por aluno)

---

### 👨‍🏫 Professor
Atuação pedagógica:
- Visualiza suas **turmas e disciplinas**
- Cria e gerencia **tarefas**
- Avalia entregas (nota + feedback)
- Acompanha avaliações/notas relacionadas

---

### 🎒 Aluno
Experiência do estudante:
- Visualiza notificações e agenda
- Visualiza notas/frequência
- Faz **upload de entregas (PDF)**
- Baixa **boletim em PDF**

---

## Stack

### Backend (API)
- **ASP.NET Core Web API**
- **JWT Authentication**
- **Entity Framework Core (Migrations)**
- **SQL Server**
- **QuestPDF** (geração do boletim PDF)
- Integração **Power Automate** (envio de e-mail de provisionamento)

### Frontend (Web)
- **React + Vite**
- **React Router DOM**
- **Chart.js / react-chartjs-2**
- Context API (Auth/Theme)
- Integração com API via `fetch` (com Bearer Token)

---

## Estrutura do Repositório

```
educonnect/
  backend/
    EduConnect.sln
    EduConnect.API/
      Controllers/
      Entities/
      DTOs/
      Data/
      Services/
      Migrations/
      Program.cs
      appsettings.json
  frontend/
    src/
      pages/
      components/
      context/
      services/api.js
```

---

## Rodando Localmente

### Pré-requisitos
- **.NET SDK 8+**
- **Node 18+** (recomendado)
- **SQL Server** (Express/Developer/LocalDB ok)

---

## Backend (API)

### 1) Configure a connection string
Arquivo:
- `backend/EduConnect.API/appsettings.json`

Procure por:
- `ConnectionStrings:DefaultConnection`

E aponte para seu SQL Server local.

### 2) Rode as migrations
Na pasta do projeto da API:

```bash
cd backend/EduConnect.API
dotnet restore
dotnet ef database update
```

> Se você não tiver o `dotnet-ef` instalado:
```bash
dotnet tool install --global dotnet-ef
```

### 3) Suba a API
```bash
dotnet run
```

Padrão (launchSettings):
- HTTPS: `https://localhost:5230`
- HTTP: `http://localhost:5000`

Swagger (em Development):
- `https://localhost:5230/swagger`

✅ Seed automático:
- Ao subir, a API cria um admin padrão se não existir.

---

## Frontend (Web)

### 1) Instale dependências
```bash
cd frontend
npm install
```

### 2) Configure a URL da API
O frontend lê `VITE_API_URL`.  
Recomendado criar/ajustar um `.env` **de verdade** assim:

```env
VITE_API_URL=https://localhost:5230
```

> Obs.: existe um `.env` no repo, mas ele não está no formato padrão de env. O que vale mesmo é ter `VITE_API_URL=...`.

### 3) Suba o front
```bash
npm run dev
```

Normalmente:
- `http://localhost:5173`

CORS já está liberado na API para:
- `http://localhost:5173`
- `https://localhost:5173`
- `http://localhost:3000`
- `https://localhost:3000`

---

## Credenciais Padrão

Ao subir a API pela primeira vez, é criado:

- **Email:** `admin@educonnect.com`
- **Senha:** `Admin@123`
- **Role:** `Admin`

---

## Fluxos Principais

### Fluxo 1 — Montar uma turma “do zero”
1. Admin cria **Professores**
2. Admin cria **Turma**
3. Admin vincula as **Disciplinas (grade fixa)** na turma  
   (vínculo TurmaDisciplina) e define o **Professor**
4. Admin cria **Aluno**
5. Admin cria **Matrícula** do aluno na turma (fica **Pendente**)

---

### Fluxo 2 — Aprovar pagamento e liberar acesso
Quando o Admin aprova o pagamento da matrícula:
- Matrícula muda para **Aprovado**
- Se o aluno ainda não tiver credenciais válidas, o sistema:
  - gera e-mail institucional único (`nome.sobrenome@educonnect.com`)
  - gera **senha temporária**
  - salva hash da senha
  - dispara envio via **Power Automate**

---

### Fluxo 3 — Tarefas e entregas
1. Professor cria **Tarefa** para uma TurmaDisciplina
2. Aluno envia **Entrega (PDF)**
3. Professor avalia (nota + feedback)

---

## Upload de Entregas

- O upload é **somente PDF**
- O arquivo vai para `wwwroot/uploads/...`
- A API expõe static files, então o arquivo fica acessível via URL pública.

Exemplo de caminho:
```
/uploads/tarefas/{tarefaId}/{alunoId}/{arquivo}.pdf
```

---

## Relatórios (Boletim PDF)

A API gera boletim usando **QuestPDF**.

Endpoints principais:
- **Aluno**: `GET /relatorios/me/boletim`
- **Admin/Professor**: `GET /relatorios/boletim/{alunoId}`

O frontend do aluno usa o endpoint “me/boletim” pra baixar o PDF.

---

## Integração com Power Automate

No `appsettings.json`, existe:

- `PowerAutomate:ProvisionAccessUrl`

A API faz POST nessa URL quando precisa enviar credenciais (provisionamento).

💡 Em ambiente local, se você não tiver o Flow configurado:
- você pode colocar uma URL mock, ou
- ajustar para não chamar (se quiser evoluir isso depois)

---

## Troubleshooting

### 1) “CORS error” no browser
- Confirme se o front está em `http://localhost:5173`
- Confirme se a API está rodando em `https://localhost:5230`
- Confirme se `VITE_API_URL` aponta pra mesma URL

### 2) Problemas com HTTPS local
- Como a API roda em HTTPS, pode ser necessário confiar no certificado dev do dotnet:
```bash
dotnet dev-certs https --trust
```

### 3) Banco não cria / migrations falham
- Confira a connection string
- Confirme que o SQL Server está rodando
- Rode novamente:
```bash
dotnet ef database update
```

---

## Observações rápidas sobre o Front
O front tem áreas **integradas com a API** (dashboard, painéis, listas/cadastros) e também algumas páginas com cara de “fluxo de matrícula/pagamento” que hoje estão mais como **tela/protótipo** (não batem direto no back). O fluxo operacional real de matrícula + aprovação está centralizado no **Admin** via endpoints da API.
