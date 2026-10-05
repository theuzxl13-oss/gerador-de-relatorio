import { repositorio } from "@/server/db";
import { responder } from "@/server/api";
import { ErroValidacao } from "@/server/validacao";

export const dynamic = "force-dynamic";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/**
 * Recebe uma foto já reduzida no navegador (JSON com base64).
 * A foto fica pendente até a ocorrência ser salva com o id dela.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return responder(async () => {
    const tipo = String(b?.tipo ?? "");
    if (!TIPOS.includes(tipo)) throw new ErroValidacao("Formato de imagem não suportado. Use JPG, PNG ou WEBP.");
    const base64 = String(b?.dados ?? "").replace(/^data:[^,]+,/, "");
    const dados = Buffer.from(base64, "base64");
    if (!dados.length) throw new ErroValidacao("Imagem vazia.");
    if (dados.length > TAMANHO_MAXIMO) throw new ErroValidacao("Imagem muito grande (máximo 4 MB).");
    const largura = Math.round(Number(b?.largura));
    const altura = Math.round(Number(b?.altura));
    if (!(largura > 0 && altura > 0 && largura <= 10000 && altura <= 10000)) throw new ErroValidacao("Dimensões da imagem inválidas.");
    const nome = String(b?.nome ?? "imagem").slice(0, 120) || "imagem";
    return repositorio().salvarAnexo({ nome, tipo, largura, altura, dados });
  }, 201);
}
