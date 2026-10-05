import type { ConteudoRelatorio } from "./relatorio";

/**
 * PDF A4 no layout do modelo oficial da portaria (medidas em mm, tiradas do
 * modelo "ANIMAL SOLTO"):
 *  - cabeçalho: FAZENDA DA ILHA (Courier, sublinhado) e CNPJ à esquerda;
 *    logo à direita com “Onde morar é viver” abaixo;
 *  - corpo em Times itálico, linhas espaçadas, parágrafo justificado;
 *  - foto reduzida abaixo do texto e assinatura sublinhada;
 *  - uma página adicional por foto, ampliada;
 *  - rodapé com endereço em todas as páginas.
 */

const ML = 30; // margem esquerda
const MR = 30; // margem direita
const LARG = 210 - ML - MR;
const RECUO = 13; // recuo das linhas do corpo
const Y_RODAPE = 267;
const LIMITE = Y_RODAPE - 8;

function paraDataUrl(blob: Blob) {
  return new Promise<string>((ok, erro) => {
    const fr = new FileReader();
    fr.onload = () => ok(fr.result as string);
    fr.onerror = erro;
    fr.readAsDataURL(blob);
  });
}

/** Carrega o logo como data URL: usa /logo.png e, na falta, rasteriza /logo.svg. */
async function carregarLogo(): Promise<string | null> {
  try {
    const r = await fetch("/logo.png");
    if (r.ok && r.headers.get("content-type")?.startsWith("image/")) return await paraDataUrl(await r.blob());
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

/** Converte qualquer imagem em JPEG (data URL) para o jsPDF. */
async function carregarFoto(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const img = new Image();
    img.src = URL.createObjectURL(await r.blob());
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(img.src);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

/** Dimensões que cabem na caixa mantendo a proporção. */
function caber(larg: number, alt: number, maxL: number, maxA: number) {
  const k = Math.min(maxL / larg, maxA / alt);
  return { l: larg * k, a: alt * k };
}

/** Gera o relatório em PDF A4 e inicia o download. */
export async function gerarPdf(r: ConteudoRelatorio, nomeArquivo: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logo, ...fotos] = await Promise.all([carregarLogo(), ...r.imagens.map((i) => carregarFoto(i.url))]);

  const cabecalho = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("courier", "bold");
    doc.setFontSize(17);
    doc.text(r.nomeCabecalho, ML, 17);
    const larguraTitulo = doc.getTextWidth(r.nomeCabecalho);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(ML, 18.6, ML + larguraTitulo, 18.6);
    if (r.cnpj) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`CNPJ ${r.cnpj}`, ML, 22.5);
    }
    if (logo) {
      const p = doc.getImageProperties(logo);
      const a = 24.2;
      const l = (p.width / p.height) * a;
      doc.addImage(logo, p.fileType, 210 - MR - l, 7.4, l, a);
    }
    if (r.slogan) {
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(`“${r.slogan.replace(/[“”"!]/g, "")}”`, 210 - MR + 2, 34.5, { align: "right" });
    }
  };

  const rodape = () => {
    if (!r.rodape) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    const linhas: string[] = doc.splitTextToSize(r.rodape, LARG + 10);
    linhas.forEach((linha, i) => {
      const y = Y_RODAPE + i * 3.6;
      const m = /(WWW\.[^\s]+)/i.exec(linha);
      if (!m) {
        doc.text(linha, ML, y);
        return;
      }
      const antes = linha.slice(0, m.index);
      doc.text(antes, ML, y);
      const x = ML + doc.getTextWidth(antes);
      doc.setTextColor(0, 0, 238);
      doc.text(m[1], x, y);
      doc.setDrawColor(0, 0, 238);
      doc.setLineWidth(0.2);
      doc.line(x, y + 0.6, x + doc.getTextWidth(m[1]), y + 0.6);
      doc.setTextColor(0, 0, 0);
    });
  };

  const novaPagina = () => {
    doc.addPage();
    cabecalho();
    return 45;
  };

  cabecalho();
  let y = 45;

  const texto = (
    t: string,
    x: number,
    opts: { tamanho?: number; estilo?: string; espaco?: number; justificar?: boolean; recuoPrimeira?: number; entrelinha?: number } = {},
  ) => {
    const tamanho = opts.tamanho ?? 12;
    doc.setFont("times", opts.estilo ?? "italic");
    doc.setFontSize(tamanho);
    const entrelinha = opts.entrelinha ?? tamanho * 0.3528 * 1.5;
    const largura = 210 - MR - x;
    // Recuo apenas na primeira linha (como no parágrafo do modelo).
    const recuo = opts.recuoPrimeira ?? 0;
    const primeira: string[] = doc.splitTextToSize(t, largura - recuo);
    const linhas: { txt: string; x: number; larg: number }[] = [];
    if (recuo && primeira.length) {
      linhas.push({ txt: primeira[0], x: x + recuo, larg: largura - recuo });
      const resto = t.slice(t.indexOf(primeira[0]) + primeira[0].length).trim();
      if (resto) for (const l of doc.splitTextToSize(resto, largura) as string[]) linhas.push({ txt: l, x, larg: largura });
    } else {
      for (const l of primeira) linhas.push({ txt: l, x, larg: largura });
    }
    linhas.forEach((linha, i) => {
      if (y > LIMITE) y = novaPagina();
      const ultima = i === linhas.length - 1;
      if (opts.justificar && !ultima) doc.text(linha.txt, linha.x, y, { align: "justify", maxWidth: linha.larg });
      else doc.text(linha.txt, linha.x, y);
      y += entrelinha;
    });
    y += opts.espaco ?? 0;
  };

  const ESPACO_LINHA = 11; // distância entre as linhas do corpo no modelo
  const ALTURA_LINHA = 12 * 0.3528 * 1.5;
  texto(r.localData, ML + 21, { espaco: ESPACO_LINHA * 1.6 - ALTURA_LINHA });
  for (const linha of [r.destinatario, `Protocolo: ${r.protocolo}`, ...r.linhas.map((l) => `${l.rotulo}: ${l.valor}`), r.quadraLote, `Horas: ${r.horas}`]) {
    texto(linha, ML + RECUO, { espaco: ESPACO_LINHA - ALTURA_LINHA });
  }
  if (r.descricao) texto(`Descrição: ${r.descricao}`, ML, { justificar: true, espaco: 3 });
  texto(r.paragrafo, ML, { justificar: true, recuoPrimeira: RECUO, entrelinha: 7.4, espaco: 2 });

  for (const f of r.fundamentacoes) {
    texto(`${f.titulo}: ${f.citacao}`, ML, { tamanho: 10.5, estilo: "bolditalic", espaco: 0.5 });
    texto(`“${f.texto}”`, ML, { tamanho: 10.5, justificar: true, espaco: 2 });
  }
  if (r.observacoes) texto(`Observações: ${r.observacoes}`, ML, { tamanho: 11, justificar: true, espaco: 2 });

  // Foto reduzida abaixo do texto (primeira imagem)
  const primeiraFoto = fotos[0];
  if (primeiraFoto) {
    const { l, a } = caber(r.imagens[0].largura, r.imagens[0].altura, 99, 62);
    if (y + 4 + a > LIMITE - 20) y = novaPagina();
    doc.addImage(primeiraFoto, "JPEG", ML + 3.6, y + 2, l, a);
    y += a + 16;
  } else {
    y += 14;
  }

  // Assinatura (sublinhada, alinhada às linhas do corpo)
  if (y + 14 > LIMITE) y = novaPagina();
  const assinatura = [r.responsavelNome || "Responsável pelo registro", r.responsavelCargo].filter(Boolean) as string[];
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  for (const linha of assinatura) {
    doc.text(linha, ML + RECUO, y);
    doc.line(ML + RECUO, y + 0.8, ML + RECUO + doc.getTextWidth(linha), y + 0.8);
    y += ESPACO_LINHA;
  }

  // Uma página por foto, ampliada
  fotos.forEach((foto, i) => {
    if (!foto) return;
    novaPagina();
    const { l, a } = caber(r.imagens[i].largura, r.imagens[i].altura, 170, 205);
    doc.addImage(foto, "JPEG", (210 - l) / 2, 40, l, a);
    if (fotos.length > 1) {
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.text(`Imagem ${i + 1} de ${fotos.length} – Protocolo ${r.protocolo}`, 105, 40 + a + 6, { align: "center" });
    }
  });

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    rodape();
  }

  doc.save(nomeArquivo);
}
