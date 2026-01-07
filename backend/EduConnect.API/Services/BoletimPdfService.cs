using EduConnect.API.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduConnect.API.Services
{
    public class BoletimPdfService
    {
        public byte[] GerarBoletimPdf(
            string nomeAluno,
            string ra,
            string turmaNome,
            IEnumerable<AvaliacaoResponse> avaliacoes)
        {
            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(12));

                    page.Header().Element(h =>
                    {
                        h.Row(row =>
                        {
                            row.RelativeItem().Column(col =>
                            {
                                col.Item().Text("EduConnect").FontSize(18).SemiBold();
                                col.Item().Text("Boletim do Aluno").FontSize(14);
                            });
                        });
                    });

                    page.Content().Column(col =>
                    {
                        // Dados do aluno
                        col.Item().Text($"Aluno: {nomeAluno}").SemiBold();
                        col.Item().Text($"RA: {ra}");
                        col.Item().Text($"Turma: {turmaNome}");
                        col.Item().Text($"Data de emissão: {DateTime.Now:dd/MM/yyyy}");
                        col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2); // <== sem ()

                        col.Spacing(5);

                        // Tabela de disciplinas
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(4); // Disciplina
                                columns.RelativeColumn(2); // Nota
                                columns.RelativeColumn(2); // Frequência
                                columns.RelativeColumn(3); // Situação
                            });

                            // Cabeçalho
                            table.Header(header =>
                            {
                                header.Cell().Element(CellHeader).Text("Disciplina");
                                header.Cell().Element(CellHeader).Text("Nota");
                                header.Cell().Element(CellHeader).Text("Frequência");
                                header.Cell().Element(CellHeader).Text("Situação");
                            });

                            foreach (var av in avaliacoes)
                            {
                                table.Cell().Element(CellBody).Text(av.DisciplinaNome);
                                table.Cell().Element(CellBody).Text($"{av.Nota:0.0}");
                                table.Cell().Element(CellBody).Text($"{av.Frequencia:0}%");
                                table.Cell().Element(CellBody).Text(av.Situacao);
                            }

                            static IContainer CellHeader(IContainer container) =>
                                container
                                    .Padding(5)
                                    .Background(Colors.Grey.Lighten3) // <== sem ()
                                    .BorderBottom(1);

                            static IContainer CellBody(IContainer container) =>
                                container
                                    .Padding(5)
                                    .BorderBottom(0.5f)
                                    .BorderColor(Colors.Grey.Lighten2); // <== sem ()
                        });
                    });

                    page.Footer().AlignCenter().Text(txt =>
                    {
                        txt.Span("EduConnect - Boletim gerado automaticamente.");
                    });
                });
            });

            return doc.GeneratePdf();
        }
    }
}
