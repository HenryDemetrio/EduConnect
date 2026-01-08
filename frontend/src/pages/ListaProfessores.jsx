import { useState } from "react";
import { Link } from "react-router-dom";
import AdminListPage from "../components/AdminListPage";
import { apiJson } from "../services/api";

export default function ListaProfessores() {
  const [toast, setToast] = useState(null);

  async function excluir(id, refresh) {
    if (!window.confirm("Excluir professor? Essa ação não pode ser desfeita.")) return;
    setToast(null);
    try {
      await apiJson(`/professores/${id}`, "DELETE");
      setToast({ type: "ok", text: "Professor excluído." });
      await refresh();
    } catch (e) {
      setToast({ type: "error", text: e?.payload?.message || "Erro ao excluir professor." });
    }
  }

  async function gerarAcesso(id, refresh) {
    setToast(null);
    try {
      const resp = await apiJson(`/professores/${id}/gerar-acesso`, "POST");
      setToast({ type: "ok", text: resp?.message || "Acesso gerado e envio solicitado." });
      await refresh();
    } catch (e) {
      setToast({ type: "error", text: e?.payload?.message || "Erro ao gerar acesso." });
    }
  }

  return (
    <>
      <AdminListPage
        title="Professores"
        subtitle="Visão única de professores cadastrados. Busca rápida por nome, registro ou e-mails."
        endpoint="/professores"
        createTo="/admin/professores/novo"
        searchPlaceholder="Nome, registro ou e-mail..."
        columns={[
          { key: "registro", label: "Registro" },
          { key: "nome", label: "Nome" },
          { key: "emailInstitucional", label: "E-mail institucional" },
          { key: "emailContato", label: "E-mail contato" },
        ]}
        mapItem={(p) => ({
          id: p.id ?? p.professorId,
          registro: p.registro ?? "",
          nome: p.nome ?? "",
          emailContato: p.emailContato ?? "",
          emailInstitucional: p.emailInstitucional ?? "",
        })}
        searchFn={(p, q) =>
          (p.nome || "").toLowerCase().includes(q) ||
          (p.registro || "").toLowerCase().includes(q) ||
          (p.emailContato || "").toLowerCase().includes(q) ||
          (p.emailInstitucional || "").toLowerCase().includes(q)
        }
        actionsLabel="Ações"
        rowActions={(p, refresh) => (
          <>
            <button className="btn-ghost btn-small" type="button" onClick={() => gerarAcesso(p.id, refresh)}>
              Acesso
            </button>

            <Link className="btn-ghost btn-small" to={`/admin/professores/${p.id}/editar`}>
              Editar
            </Link>

            <button
              className="btn-ghost btn-small btn-danger"
              type="button"
              onClick={() => excluir(p.id, refresh)}
            >
              Excluir
            </button>
          </>
        )}
      />

      {toast && (
        <div style={{ padding: "0 20px", marginTop: 10 }}>
          <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-ok"}`}>{toast.text}</div>
        </div>
      )}
    </>
  );
}
