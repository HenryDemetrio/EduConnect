using EduConnect.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace EduConnect.API.Data
{
    public class EduConnectContext : DbContext
    {
        public EduConnectContext(DbContextOptions<EduConnectContext> options) : base(options) { }

        public DbSet<Usuario> Usuarios => Set<Usuario>();
        public DbSet<Aluno> Alunos => Set<Aluno>();
        public DbSet<Professor> Professores => Set<Professor>();

        public DbSet<Turma> Turmas => Set<Turma>();
        public DbSet<Matricula> Matriculas => Set<Matricula>();

        public DbSet<Disciplina> Disciplinas => Set<Disciplina>();
        public DbSet<TurmaDisciplina> TurmaDisciplinas => Set<TurmaDisciplina>();
        public DbSet<Avaliacao> Avaliacoes => Set<Avaliacao>();
        public DbSet<EventoEscolar> EventosEscolares => Set<EventoEscolar>();
        public DbSet<Notificacao> Notificacoes => Set<Notificacao>();
        public DbSet<Tarefa> Tarefas => Set<Tarefa>();
        public DbSet<EntregaTarefa> EntregasTarefas => Set<EntregaTarefa>();
        public DbSet<PreMatricula> PreMatriculas => Set<PreMatricula>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ===== USUARIO =====
            modelBuilder.Entity<Usuario>()
                .Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(200);

            modelBuilder.Entity<Usuario>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // ===== ALUNO 1:1 USUARIO =====
            modelBuilder.Entity<Aluno>()
                .HasIndex(a => a.UsuarioId)
                .IsUnique();

            modelBuilder.Entity<Aluno>()
                .HasIndex(a => a.RA)
                .IsUnique();

            modelBuilder.Entity<Aluno>()
                .Property(a => a.EmailContato)
                .IsRequired()
                .HasMaxLength(200);

            modelBuilder.Entity<Aluno>()
                .HasOne(a => a.Usuario)
                .WithOne(u => u.Aluno)
                .HasForeignKey<Aluno>(a => a.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Aluno>()
              .Property(a => a.EmailInstitucional)
              .HasMaxLength(120);

            // ===== PROFESSOR 1:1 USUARIO =====
            modelBuilder.Entity<Professor>()
                .HasIndex(p => p.UsuarioId)
                .IsUnique();

            modelBuilder.Entity<Professor>()
                .HasIndex(p => p.Registro)
                .IsUnique()
                .HasFilter("[Registro] IS NOT NULL");

            modelBuilder.Entity<Professor>()
                .Property(p => p.EmailContato)
                .IsRequired()
                .HasMaxLength(200);

            modelBuilder.Entity<Professor>()
                .HasOne(p => p.Usuario)
                .WithOne(u => u.Professor)
                .HasForeignKey<Professor>(p => p.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            // ===== TURMA =====
            modelBuilder.Entity<Turma>()
                .HasIndex(t => t.Codigo)
                .IsUnique();

            // ===== MATRICULA =====
            modelBuilder.Entity<Matricula>()
                .HasIndex(m => new { m.AlunoId, m.TurmaId })
                .IsUnique();

            modelBuilder.Entity<Matricula>()
                .HasOne(m => m.Aluno)
                .WithMany()
                .HasForeignKey(m => m.AlunoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Matricula>()
                .HasOne(m => m.Turma)
                .WithMany(t => t.Matriculas)
                .HasForeignKey(m => m.TurmaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Matricula>(e =>
            {
                e.Property(x => x.StatusPagamento).IsRequired().HasMaxLength(20);
                e.Property(x => x.ComprovanteUrl).HasMaxLength(500);
            });

            // ===== DISCIPLINA (seed fixa) =====
            modelBuilder.Entity<Disciplina>()
                .HasIndex(d => d.Nome)
                .IsUnique();

            modelBuilder.Entity<Disciplina>().HasData(
                new Disciplina { Id = 1, Nome = "Python" },
                new Disciplina { Id = 2, Nome = "SQL" },
                new Disciplina { Id = 3, Nome = "Data Science" },
                new Disciplina { Id = 4, Nome = "Estatística" },
                new Disciplina { Id = 5, Nome = "Inteligência Artificial" }
            );

            // ===== TURMA-DISCIPLINA =====
            modelBuilder.Entity<TurmaDisciplina>()
                .HasIndex(td => new { td.TurmaId, td.DisciplinaId })
                .IsUnique();

            modelBuilder.Entity<TurmaDisciplina>()
                .HasOne(td => td.Turma)
                .WithMany(t => t.TurmasDisciplinas)
                .HasForeignKey(td => td.TurmaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TurmaDisciplina>()
                .HasOne(td => td.Disciplina)
                .WithMany()
                .HasForeignKey(td => td.DisciplinaId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TurmaDisciplina>()
                .HasOne(td => td.Professor)
                .WithMany()
                .HasForeignKey(td => td.ProfessorId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // ===== AVALIACAO =====
            modelBuilder.Entity<Avaliacao>()
                .HasIndex(a => new { a.AlunoId, a.TurmaDisciplinaId })
                .IsUnique();

            modelBuilder.Entity<Avaliacao>()
                .HasOne(a => a.Aluno)
                .WithMany()
                .HasForeignKey(a => a.AlunoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Avaliacao>()
                .HasOne(a => a.TurmaDisciplina)
                .WithMany()
                .HasForeignKey(a => a.TurmaDisciplinaId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Avaliacao>(e =>
            {
                e.Property(x => x.Nota).HasPrecision(4, 2);        // 10.00
                e.Property(x => x.Frequencia).HasPrecision(5, 2);  // 100.00
            });

            // ===== EVENTO ESCOLAR =====
            modelBuilder.Entity<EventoEscolar>()
                .HasOne(e => e.Turma)
                .WithMany()
                .HasForeignKey(e => e.TurmaId)
                .OnDelete(DeleteBehavior.SetNull);

            // ===== NOTIFICACAO =====
            modelBuilder.Entity<Notificacao>()
                .HasOne(n => n.Usuario)
                .WithMany()
                .HasForeignKey(n => n.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Notificacao>()
                .HasOne(n => n.Turma)
                .WithMany()
                .HasForeignKey(n => n.TurmaId)
                .OnDelete(DeleteBehavior.SetNull);

            // ===== TAREFA =====
            modelBuilder.Entity<Tarefa>(e =>
            {
                e.Property(x => x.Tipo).IsRequired().HasMaxLength(20);
                e.Property(x => x.Titulo).IsRequired().HasMaxLength(120);
                e.Property(x => x.Descricao).HasMaxLength(2000);

                // ✅ novo: Numero (P1/P2/P3 e T1/T2/T3). Para legado pode ser 0.
                e.Property(x => x.Numero).HasDefaultValue(0);

                e.Property(x => x.Peso).HasPrecision(5, 2);
                e.Property(x => x.NotaMaxima).HasPrecision(5, 2);

                // ✅ PDF do enunciado (Professor)
                e.Property(x => x.EnunciadoArquivoNome).HasMaxLength(255);
                e.Property(x => x.EnunciadoArquivoPath).HasMaxLength(500);
                e.Property(x => x.EnunciadoContentType).HasMaxLength(120);
                e.Property(x => x.EnunciadoSizeBytes);

                e.HasOne(x => x.TurmaDisciplina)
                  .WithMany(td => td.Tarefas)
                  .HasForeignKey(x => x.TurmaDisciplinaId)
                  .OnDelete(DeleteBehavior.Cascade);

                // existente
                e.HasIndex(x => new { x.TurmaDisciplinaId, x.DataEntrega });

                // regra robusta: não pode duplicar Tipo+Numero dentro da mesma TurmaDisciplina
                // (filtrado pra não quebrar registros antigos com Numero=0)
                e.HasIndex(x => new { x.TurmaDisciplinaId, x.Tipo, x.Numero })
                  .IsUnique()
                  .HasFilter("[Numero] > 0");
            });

            // ===== ENTREGA TAREFA =====
            modelBuilder.Entity<EntregaTarefa>(e =>
            {
                e.Property(x => x.ArquivoNome).IsRequired().HasMaxLength(255);
                e.Property(x => x.ArquivoPath).IsRequired().HasMaxLength(500);
                e.Property(x => x.ContentType).HasMaxLength(120);
                e.Property(x => x.ComentarioAluno).HasMaxLength(2000);
                e.Property(x => x.FeedbackProfessor).HasMaxLength(2000);

                e.Property(x => x.Nota).HasPrecision(5, 2);

                e.HasOne(x => x.Tarefa)
                  .WithMany()
                  .HasForeignKey(x => x.TarefaId)
                  .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(x => x.Aluno)
                  .WithMany()
                  .HasForeignKey(x => x.AlunoId)
                  .OnDelete(DeleteBehavior.Cascade);

                // 1 entrega por aluno por tarefa (o aluno pode reenviar = update)
                e.HasIndex(x => new { x.TarefaId, x.AlunoId }).IsUnique();

            // PRÉ MATRICULA 
            modelBuilder.Entity<PreMatricula>(e =>
            {
                e.Property(x => x.Nome).IsRequired().HasMaxLength(200);
                e.Property(x => x.Email).IsRequired().HasMaxLength(200);
                e.Property(x => x.Telefone).IsRequired().HasMaxLength(50);
                e.Property(x => x.Endereco).IsRequired().HasMaxLength(300);

                e.Property(x => x.Status).IsRequired().HasMaxLength(30);

                e.Property(x => x.RgCpfUrl).HasMaxLength(500);
                e.Property(x => x.EscolaridadeUrl).HasMaxLength(500);
                e.Property(x => x.ComprovantePagamentoUrl).HasMaxLength(500);

                e.HasIndex(x => x.Email);
                });
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
