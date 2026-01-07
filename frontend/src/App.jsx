import { Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole.jsx";
import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

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
import Matricula from "./pages/Matricula.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/Matricula" element={<Matricula />}/>


      {/* autenticado */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Config (todos autenticados) */}
          <Route path="/config" element={<Configuracoes />} />

          {/* Agenda (somente Admin e Professor) */}
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

            <Route path="/admin/professores" element={<ListaProfessores />} />
            <Route path="/admin/professores/novo" element={<CadastroProfessor />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
