/**
 * Validação e limpeza de fotos JPEG sem bibliotecas externas.
 *
 * O navegador sempre reduz a foto e a converte para JPEG antes de enviar; o
 * servidor confere que o conteúdo é de fato um JPEG bem formado, lê as dimensões
 * reais do próprio arquivo (não as informadas) e remove metadados (EXIF com GPS,
 * dados do aparelho, comentários), preservando os segmentos necessários à imagem.
 */

export const LADO_MAXIMO_IMAGEM = 10_000;

export class ErroImagem extends Error {}

/** Marcadores SOF (início de quadro) que trazem as dimensões. */
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/**
 * Segmentos mantidos: APP0 (JFIF) e APP14 (Adobe, define a conversão de cores).
 * Removidos: APP1–APP13 e APP15 (EXIF, XMP, ICC, dados de fabricante) e COM (comentários).
 */
function remover(marcador: number): boolean {
  return (marcador >= 0xe1 && marcador <= 0xef && marcador !== 0xee) || marcador === 0xfe;
}

export function processarJpeg(d: Buffer): { dados: Buffer; largura: number; altura: number } {
  if (d.length < 4 || d[0] !== 0xff || d[1] !== 0xd8 || d[2] !== 0xff) throw new ErroImagem("O arquivo enviado não é uma imagem JPEG válida.");
  const partes: Buffer[] = [d.subarray(0, 2)];
  let i = 2;
  let largura = 0;
  let altura = 0;
  for (let segmentos = 0; segmentos < 1000; segmentos++) {
    if (i + 4 > d.length || d[i] !== 0xff) throw new ErroImagem("Imagem JPEG corrompida.");
    // Bytes 0xFF de preenchimento entre segmentos são permitidos.
    let m = d[i + 1];
    while (m === 0xff && i + 2 < d.length) {
      i++;
      m = d[i + 1];
    }
    if (m === 0xda) {
      // Início dos dados da imagem: o restante é copiado sem alteração.
      if (!largura || !altura) throw new ErroImagem("Imagem JPEG sem dimensões.");
      partes.push(d.subarray(i));
      return { dados: Buffer.concat(partes), largura, altura };
    }
    if (m === 0xd9) break;
    const tamanho = d.readUInt16BE(i + 2);
    if (tamanho < 2 || i + 2 + tamanho > d.length) throw new ErroImagem("Imagem JPEG corrompida.");
    if (SOF.has(m)) {
      if (tamanho < 7) throw new ErroImagem("Imagem JPEG corrompida.");
      altura = d.readUInt16BE(i + 5);
      largura = d.readUInt16BE(i + 7);
      if (!largura || !altura || largura > LADO_MAXIMO_IMAGEM || altura > LADO_MAXIMO_IMAGEM) throw new ErroImagem("Dimensões da imagem inválidas.");
    }
    if (!remover(m)) partes.push(d.subarray(i, i + 2 + tamanho));
    i += 2 + tamanho;
  }
  throw new ErroImagem("Imagem JPEG incompleta.");
}
