import AdminListPage from "../components/AdminListPage";

export default function ListaAlunos() {
  return (
    <AdminListPage
      title="Alunos"
      subtitle="Visão única de alunos cadastrados. Busca rápida por nome, RA ou e-mail."
      endpoint="/alunos"
      createTo="/admin/alunos/novo"
      searchPlaceholder="Nome, RA ou e-mail..."
      columns={[
        { key: "ra", label: "RA" },
        { key: "nome", label: "Nome" },
        { key: "email", label: "E-mail" },
      ]}
      mapItem={(a) => ({
        id: a.id ?? a.alunoId,
        nome: a.nome ?? a.name ?? "",
        ra: a.ra ?? "",
        email: a.email ?? a.emailAluno ?? "",
      })}
      searchFn={(a, q) =>
        (a.nome || "").toLowerCase().includes(q) ||
        (a.ra || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q)
      }
    />
  );
}
