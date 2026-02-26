# EduConnect 🎓

O **EduConnect** é uma **Plataforma Educacional** pensada para uma jornada guiada: aqui o aluno **não escolhe matérias**.  
Ao entrar na **Turma do EduConnect**, ele recebe automaticamente uma **grade fixa**:

- **Python**
- **SQL**
- **Data Science**
- **Estatística**
- **Inteligência Artificial**

A plataforma cobre o ciclo completo: **pré-matrícula (com envio de documentos e comprovante)**, **aprovação de matrícula/pagamento**, **provisionamento de acesso por e-mail via Power Automate**, gestão acadêmica (turmas, professores, tarefas, avaliações), comunicação (notificações e eventos) e **relatórios (boletim em PDF)**.

---

## Sumário

- [Regras de Negócio](#regras-de-negócio)
  - [Grade fixa (sem escolha de matérias)](#grade-fixa-sem-escolha-de-matérias)
  - [Turma × Disciplina (TurmaDisciplina)](#turma--disciplina-turmadisciplina)
  - [Pré-matrícula (novo fluxo)](#pré-matrícula-novo-fluxo)
  - [Matrícula + Pagamento + Liberação de Acesso](#matrícula--pagamento--liberação-de-acesso)
  - [Geração de acesso (Admin)](#geração-de-acesso-admin)
- [Papéis e Permissões](#papéis-e-permissões)
- [Módulos do Sistema](#módulos-do-sistema)
- [Stack](#stack)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Rodando Localmente](#rodando-localmente)
  - [Backend (API)](#backend-api)
  - [Frontend (Web)](#frontend-web)
- [Fluxos Principais (na prática)](#fluxos-principais-na-prática)
  - [Fluxo A — Pré-matrícula do aluno (3 etapas)](#fluxo-a--pré-matrícula-do-aluno-3-etapas)
  - [Fluxo B — Aprovação da Pré-matrícula (Admin)](#fluxo-b--aprovação-da-pré-matrícula-admin)
  - [Fluxo C — Matrícula manual + Aprovar pagamento (Admin)](#fluxo-c--matrícula-manual--aprovar-pagamento-admin)
- [Uploads (Documentos / Comprovantes)](#uploads-documentos--comprovantes)
- [Power Automate](#power-automate)
- [Relatórios (Boletim PDF)](#relatórios-boletim-pdf)
- [Troubleshooting](#troubleshooting)

---

## Regras de Negócio

### Grade fixa (sem escolha de matérias)
No EduConnect, o aluno **não monta grade**.

✅ Ao entrar em uma **Turma**, ele passa a ter acesso automaticamente a:  
**Python, SQL, Data Science, Estatística e Inteligência Artificial**.

> A grade é “fixa” por design: o aluno entra na turma e a turma já nasce com a estrutura padrão do EduConnect.

---

### Turma × Disciplina (TurmaDisciplina)
A Turma se conecta às disciplinas através do vínculo **TurmaDisciplina**:

- **Turma**: “1A”, “2B”, “TURMA-2026-1A”, etc.
- **Disciplina**: Python, SQL, DS, Estatística, IA
- **TurmaDisciplina**: vínculo que define **quais disciplinas** existem na turma e **quem é o professor** daquela disciplina naquela turma

📌 Isso permite:
- Turma 1A ter Python com Prof. X
- Turma 2B ter Python com Prof. Y

---

### Pré-matrícula 
Agora o EduConnect possui um fluxo **real** de entrada do aluno, com etapas e validações.

**Objetivo:** coletar dados + documentos + comprovante antes do Admin aprovar.

**Status principais da Pré-matrícula**
- `INICIADA` → aluno enviou dados pessoais (Etapa 1)
- `DOCUMENTOS_OK` → aluno enviou RG/CPF + Escolaridade (Etapa 2)
- `PENDENTE_ADMIN` → aluno enviou comprovante e aguarda aprovação (Etapa 3)
- `APROVADA` / `REJEITADA`

**Documentos do processo**
- RG/CPF
- Escolaridade
- Comprovante de pagamento

---

### Matrícula + Pagamento + Liberação de Acesso
Existem dois jeitos de chegar em uma matrícula:

1) **Via Pré-matrícula (novo)**  
   Quando o Admin aprova a Pré-matrícula, o sistema já cria:
   - **Usuário (Role = Aluno)**
   - **Aluno (RA + e-mails)**
   - **Matrícula com pagamento aprovado** (porque o comprovante foi anexado antes)

2) **Via Matrícula manual (Admin)**  
   Admin pode matricular aluno em turma manualmente e depois **aprovar pagamento**.

**Regras de acesso (provisionamento)**
- O login do aluno passa a ser o **e-mail institucional** (`@educonnect.com`)
- Se o aluno ainda não tem e-mail institucional, o sistema gera automaticamente:
  - `primeiro.ultimo@educonnect.com` (com sufixo se já existir)
  - senha temporária
- O envio das credenciais é feito via **Power Automate** (Flow)

---

### Geração de acesso (Admin)
Além do fluxo automático por pagamento/pré-matrícula, existe ação administrativa para **gerar acesso** (ex.: aluno/professor criado sem credenciais ainda).

Regra geral:
- Se a pessoa ainda **não tem e-mail institucional**, gera e-mail + senha temporária
- Dispara Power Automate para enviar credenciais
- Se já tem e-mail institucional, não gera uma nova senha “do nada” (pra evitar sobrescrever acesso)

---

## Papéis e Permissões

### 👑 Admin
- Gestão completa de **alunos**, **professores**, **turmas**, **matrículas**
- Aprovar **pré-matrículas** e **pagamentos**
- Gerar acessos (quando necessário)
- Disparar provisionamento de acesso (Power Automate)
- Criar notificações/eventos
- Acompanhar relatórios e visão administrativa

### 👨‍🏫 Professor
- Visualiza turmas/disciplinas atribuídas
- Cria tarefas e avalia entregas
- Acompanha avaliações e desempenho

### 🎒 Aluno
- Faz **pré-matrícula** e envia documentos/pagamento
- Visualiza feed, agenda, avaliações, notas e frequência
- Envia entregas e acessa relatórios/boletim

---

## Módulos do Sistema

- **Auth & Roles (JWT)**: login, perfil (`/auth/me`) e endpoints protegidos por Role  
- **Recuperação de senha**: endpoints de “forgot password” e atualização de senha
- **Pré-matrícula (novo)**: cadastro em 3 etapas + aprovação admin
- **Matrículas & Pagamentos**: pendências, aprovação e provisionamento
- **Geração de acesso (Admin)**: provisionamento manual quando necessário
- **Gestão acadêmica**: turmas, disciplinas e vínculos (TurmaDisciplina)
- **Avaliações**: endpoints de resumo/fechamento e visão do aluno
- **Notificações**: feed e notificações por aluno/turma
- **Eventos/Agenda**: eventos gerais e “meus eventos”
- **Uploads**: documentos/comprovantes (pré-matrícula) e entregas (tarefas)
- **Relatórios**: boletim em PDF

---

## Stack

### Backend (API)
- **ASP.NET Core Web API** (C#)
- **JWT Authentication** + Roles (Admin/Professor/Aluno)
- **Entity Framework Core** (migrations)
- **SQL Server**
- **QuestPDF** (boletim PDF)
- **Power Automate** (envio de e-mail de credenciais)

### Frontend (Web)
- **React + Vite**
- **React Router DOM**
- Context API (Auth/Theme)
- Integração com API via `fetch` com Bearer Token

---

## Estrutura do Repositório
