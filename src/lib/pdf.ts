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
  const LIMITE = 297 - 24; // acima do rodapé
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

  // Cabeçalho (modelo oficial): nome e CNPJ à esquerda, logo à direita, slogan abaixo
  const logo = await carregarLogo();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(11, 71, 64);
  doc.text(r.nomeCabecalho, ML, y + 4);
  if (r.cnpj) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`CNPJ ${r.cnpj}`, ML, y + 10);
  }
  let alturaLogo = 0;
  if (logo) {
    const props = doc.getImageProperties(logo);
    alturaLogo = 22;
    const larguraLogo = (props.width / props.height) * alturaLogo;
    doc.addImage(logo, "PNG", 210 - MR - larguraLogo, y - 4, larguraLogo, alturaLogo);
  }
  y += Math.max(alturaLogo - 4, 12) + 4;
  if (r.slogan) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`“${r.slogan.replace(/[“”"]/g, "")}”`, 210 - MR, y, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
  y += 3;
  doc.setDrawColor(11, 71, 64);
  doc.setLineWidth(0.6);
  doc.line(ML, y, 210 - MR, y);
  y += 11;

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

  if (r.observacoes) {
    paragrafo("Observações:", { tamanho: 10.5, estilo: "bold" });
    paragrafo(r.observacoes, { tamanho: 10.5, justificar: true, espacoDepois: 4 });
  }

  // Assinatura: fica na parte inferior da página, deixando espaço livre acima
  const ALTURA_ASSINATURA = 14;
  const yAssinatura = LIMITE - ALTURA_ASSINATURA;
  if (y + 40 > yAssinatura) {
    doc.addPage();
    y = 22;
  }
  const largAss = 85;
  const xAss = (210 - largAss) / 2;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(xAss, yAssinatura, xAss + largAss, yAssinatura);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(r.responsavelNome || "Responsável pelo registro", 105, yAssinatura + 5, { align: "center" });
  if (r.responsavelCargo) {
    doc.setFont("helvetica", "normal");
    doc.text(r.responsavelCargo, 105, yAssinatura + 10.5, { align: "center" });
  }

  // Rodapé com endereço e contato (todas as páginas)
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(11, 71, 64);
    doc.setLineWidth(0.4);
    doc.line(ML, 280, 210 - MR, 280);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    if (r.rodape) doc.text(doc.splitTextToSize(r.rodape, LARG), 105, 284, { align: "center" });
    if (paginas > 1) doc.text(`Página ${p} de ${paginas}`, 210 - MR, 293, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(nomeArquivo);
}
