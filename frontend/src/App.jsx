import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole.jsx";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Matrícula (público)
import Matricula from "./pages/Matricula.jsx";
import MatriculaEfetivacao from "./pages/MatriculaEfetivacao.jsx";
import MatriculaPagamento from "./pages/MatriculaPagamento.jsx";

// Recuperar senha (público)
import RecuperarSenha from "./pages/RecuperarSenha.jsx";

// Aluno
import MeuPainelAluno from "./pages/MeuPainelAluno";

// Professor
import PainelProfessor from "./pages/PainelProfessor";
import AgendaAvisos from "./pages/AgendaAvisos";

// Admin
import ListaAlunos from "./pages/ListaAlunos";
import CadastroAluno from "./pages/CadastroAluno";
import ListaProfessores from "./pages/ListaProfessores";
import CadastroProfessor from "./pages/CadastroProfessor";

// Todos
import Configuracoes from "./pages/Configuracoes";

export default function App() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/login" element={<Login />} />

      <Route path="/matricula" element={<Matricula />} />
      <Route path="/matricula-efetivacao" element={<MatriculaEfetivacao />} />
      <Route path="/matricula-pagamento" element={<MatriculaPagamento />} />

      <Route path="/recuperar-senha" element={<RecuperarSenha />} />

      {/* autenticado */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<Configuracoes />} />

          {/* Agenda (Admin + Professor) */}
          <Route element={<RequireRole allow={["Admin", "Professor"]} />}>
            <Route path="/professor/agenda" element={<AgendaAvisos />} />
            <Route path="/admin/agenda" element={<AgendaAvisos />} />
          </Route>

          {/* Aluno */}
          <Route element={<RequireRole allow={["Aluno"]} />}>
            <Route path="/meu-painel" element={<MeuPainelAluno />} />
          </Route>

          {/* Professor */}
          <Route element={<RequireRole allow={["Professor"]} />}>
            <Route path="/painel-professor" element={<PainelProfessor />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireRole allow={["Admin"]} />}>
            <Route path="/admin/alunos" element={<ListaAlunos />} />
            <Route path="/admin/alunos/novo" element={<CadastroAluno />} />
            <Route path="/admin/alunos/:id/editar" element={<CadastroAluno />} />

            <Route path="/admin/professores" element={<ListaProfessores />} />
            <Route path="/admin/professores/novo" element={<CadastroProfessor />} />
            <Route path="/admin/professores/:id/editar" element={<CadastroProfessor />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}