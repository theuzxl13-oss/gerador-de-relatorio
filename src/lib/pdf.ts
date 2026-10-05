import type { ConteudoRelatorio } from "./relatorio";

/** Carrega o logo como PNG (data URL): usa /logo.png e, na falta, rasteriza /logo.svg. */
async function carregarLogo(): Promise<string | null> {
  const paraDataUrl = (blob: Blob) =>
    new Promise<string>((ok, erro) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result as string);
      fr.onerror = erro;
      fr.readAsDataURL(blob);
    });
  try {
    const r = await fetch("/logo.png");
    if (r.ok && r.headers.get("content-type")?.startsWith("image/png")) return await paraDataUrl(await r.blob());
  } catch {
    /* segue para o SVG */
  }
  try {
    const img = new Image();
    img.src = "/logo.svg";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 448;
    canvas.height = 448;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 448, 448);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Gera o relatório em PDF A4 e inicia o download. */
export async function gerarPdf(r: ConteudoRelatorio, nomeArquivo: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ML = 22; // margem esquerda
  const MR = 22;
  const LARG = 210 - ML - MR;
  const LIMITE = 297 - 22;
  let y = 20;

  const novaPaginaSe = (altura: number) => {
    if (y + altura > LIMITE) {
      doc.addPage();
      y = 22;
    }
  };

  const paragrafo = (texto: string, opts: { tamanho?: number; estilo?: "normal" | "bold" | "italic"; justificar?: boolean; recuo?: number; espacoDepois?: number } = {}) => {
    const tamanho = opts.tamanho ?? 11.5;
    const recuo = opts.recuo ?? 0;
    doc.setFont("helvetica", opts.estilo ?? "normal");
    doc.setFontSize(tamanho);
    const alturaLinha = tamanho * 0.3528 * 1.45;
    const linhas: string[] = doc.splitTextToSize(texto, LARG - recuo);
    linhas.forEach((linha, i) => {
      novaPaginaSe(alturaLinha);
      const ultima = i === linhas.length - 1;
      if (opts.justificar && !ultima) doc.text(linha, ML + recuo, y, { align: "justify", maxWidth: LARG - recuo });
      else doc.text(linha, ML + recuo, y);
      y += alturaLinha;
    });
    y += opts.espacoDepois ?? 0;
  };

  // Cabeçalho
  const logo = await carregarLogo();
  if (logo) doc.addImage(logo, "PNG", ML, y - 4, 18, 18);
  const xTitulo = logo ? ML + 22 : ML;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(11, 71, 64);
  const titulo: string[] = doc.splitTextToSize(r.cabecalhoAssociacao.toUpperCase(), LARG - (xTitulo - ML));
  doc.text(titulo, xTitulo, y + 2);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("Onde morar é viver!", xTitulo, y + 2 + titulo.length * 4.6);
  doc.setTextColor(0, 0, 0);
  y += 17;
  doc.setDrawColor(11, 71, 64);
  doc.setLineWidth(0.6);
  doc.line(ML, y, 210 - MR, y);
  y += 12;

  paragrafo(r.localData, { espacoDepois: 6 });
  paragrafo(r.destinatario);
  paragrafo(`Protocolo: ${r.protocolo}`, { espacoDepois: 6 });
  for (const l of r.linhas) paragrafo(`${l.rotulo}: ${l.valor}`);
  paragrafo(r.quadraLote);
  paragrafo(`Horas: ${r.horas}`, { espacoDepois: r.descricao ? 2 : 6 });
  if (r.descricao) paragrafo(`Descrição: ${r.descricao}`, { justificar: true, espacoDepois: 6 });

  paragrafo(`            ${r.paragrafo}`, { justificar: true, espacoDepois: 6 });

  for (const f of r.fundamentacoes) {
    paragrafo(`${f.titulo}: ${f.citacao}`, { tamanho: 10, estilo: "bold", espacoDepois: 1 });
    const inicioY = y;
    paragrafo(`“${f.texto}”`, { tamanho: 10, estilo: "italic", justificar: true, recuo: 4 });
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    if (y > inicioY) doc.line(ML + 1, inicioY - 3.5, ML + 1, y - 3.5);
    y += 4;
  }

  // Observações e assinaturas (espaço reservado)
  const alturaObs = 55;
  novaPaginaSe(alturaObs + 40);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observações / providências da Administração:", ML, y);
  y += 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, LARG, alturaObs);
  if (r.observacoes) {
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(r.observacoes, LARG - 6), ML + 3, y + 6);
  }
  y += alturaObs + 26;

  const largAss = 70;
  doc.setDrawColor(60, 60, 60);
  doc.line(ML, y, ML + largAss, y);
  doc.line(210 - MR - largAss, y, 210 - MR, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(r.responsavelNome || "Responsável pelo registro", ML + largAss / 2, y + 5, { align: "center" });
  if (r.responsavelCargo) doc.text(r.responsavelCargo, ML + largAss / 2, y + 10, { align: "center" });
  doc.text("Administração", 210 - MR - largAss / 2, y + 5, { align: "center" });

  // Rodapé
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Protocolo ${r.protocolo}`, ML, 289);
    doc.text(`Página ${p} de ${paginas}`, 210 - MR, 289, { align: "right" });
  }

  doc.save(nomeArquivo);
}
