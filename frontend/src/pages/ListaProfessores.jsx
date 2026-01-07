import AdminListPage from "../components/AdminListPage";

export default function ListaProfessores() {
  return (
    <AdminListPage
      title="Professores"
      subtitle="Cadastro enxuto e rastreável (registro + e-mail). Sem telas demais."
      endpoint="/professores"
      createTo="/admin/professores/novo"
      searchPlaceholder="Nome, registro ou e-mail..."
      columns={[
        { key: "registro", label: "Registro" },
        { key: "nome", label: "Nome" },
        { key: "email", label: "E-mail" },
      ]}
      mapItem={(p) => ({
        id: p.id ?? p.professorId,
        nome: p.nome ?? p.name ?? "",
        registro: p.registro ?? "",
        email: p.email ?? "",
      })}
      searchFn={(p, q) =>
        (p.nome || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.registro || "").toLowerCase().includes(q)
      }
    />
  );
}
