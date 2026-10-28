import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";
import { ErroValidacao } from "@/server/validacao";

export const dynamic = "force-dynamic";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/** Confere a assinatura do arquivo: só aceita imagens de verdade (não basta declarar o tipo). */
function conteudoConfere(tipo: string, d: Buffer): boolean {
  if (tipo === "image/jpeg") return d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff;
  if (tipo === "image/png") return d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (tipo === "image/webp") return d.subarray(0, 4).toString("latin1") === "RIFF" && d.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}

/**
 * Recebe uma foto já reduzida no navegador (JSON com base64).
 * A foto fica pendente até a ocorrência ser salva com o id dela.
 */
export async function POST(req: Request) {
  // Base64 de 4 MB ≈ 5,5 MB; recusa corpos maiores antes de ler.
  if (Number(req.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) {
    return responder(async () => {
      throw new ErroValidacao("Imagem muito grande (máximo 4 MB).");
    });
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return responder(async () => {
    await exigirUsuario("registrar");
    const tipo = String(b?.tipo ?? "");
    if (!TIPOS.includes(tipo)) throw new ErroValidacao("Formato de imagem não suportado. Use JPG, PNG ou WEBP.");
    const base64 = String(b?.dados ?? "").replace(/^data:[^,]+,/, "");
    const dados = Buffer.from(base64, "base64");
    if (!dados.length) throw new ErroValidacao("Imagem vazia.");
    if (dados.length > TAMANHO_MAXIMO) throw new ErroValidacao("Imagem muito grande (máximo 4 MB).");
    if (!conteudoConfere(tipo, dados)) throw new ErroValidacao("O arquivo enviado não é uma imagem válida.");
    const largura = Math.round(Number(b?.largura));
    const altura = Math.round(Number(b?.altura));
    if (!(largura > 0 && altura > 0 && largura <= 10000 && altura <= 10000)) throw new ErroValidacao("Dimensões da imagem inválidas.");
    const nome = String(b?.nome ?? "imagem").replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 120) || "imagem";
    return repositorio().salvarAnexo({ nome, tipo, largura, altura, dados });
  }, 201);
}
