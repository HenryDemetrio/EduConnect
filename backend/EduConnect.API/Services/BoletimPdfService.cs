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
                        col.Item().Text($"Aluno: {nomeAluno}").SemiBold();
                        col.Item().Text($"RA: {ra}");
                        col.Item().Text($"Turma: {turmaNome}");
                        col.Item().Text($"Data de emissão: {DateTime.Now:dd/MM/yyyy}");
                        col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        col.Spacing(8);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(5); // Disciplina + detalhamento
                                columns.RelativeColumn(2); // Média
                                columns.RelativeColumn(2); // Frequência
                                columns.RelativeColumn(3); // Situação
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellHeader).Text("Disciplina");
                                header.Cell().Element(CellHeader).Text("Média");
                                header.Cell().Element(CellHeader).Text("Frequência");
                                header.Cell().Element(CellHeader).Text("Situação");
                            });

                            foreach (var av in avaliacoes)
                            {
                                table.Cell().Element(CellBody).Column(c =>
                                {
                                    c.Item().Text(av.DisciplinaNome).SemiBold();

                                    // detalhes (se existirem)
                                    var linhaProvas = $"P1: {Fmt(av.P1)}  |  P2: {Fmt(av.P2)}";
                                    var linhaTarefas = $"T1: {Fmt(av.T1)}  |  T2: {Fmt(av.T2)}  |  T3: {Fmt(av.T3)}";

                                    c.Item().Text(linhaProvas).FontSize(10).FontColor(Colors.Grey.Darken2);
                                    c.Item().Text(linhaTarefas).FontSize(10).FontColor(Colors.Grey.Darken2);

                                    if (av.P3 != null)
                                        c.Item().Text($"Rec (P3): {Fmt(av.P3)}").FontSize(10).FontColor(Colors.Grey.Darken2);
                                });

                                // média exibida: prioriza pós-rec se existir, senão médiaFinal, senão Nota gravada
                                decimal? media = av.MediaPosRec ?? av.MediaFinal ?? av.Nota;
                                table.Cell().Element(CellBody).Text(media.HasValue ? $"{media.Value:0.00}" : "-");


                                table.Cell().Element(CellBody).Text($"{av.Frequencia:0}%");
                                table.Cell().Element(CellBody).Text(av.Situacao ?? "-");
                            }

                            static string Fmt(decimal? v) => v.HasValue ? $"{v:0.00}" : "-";

                            static IContainer CellHeader(IContainer container) =>
                                container
                                    .Padding(5)
                                    .Background(Colors.Grey.Lighten3)
                                    .BorderBottom(1);

                            static IContainer CellBody(IContainer container) =>
                                container
                                    .Padding(5)
                                    .BorderBottom(0.5f)
                                    .BorderColor(Colors.Grey.Lighten2);
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
