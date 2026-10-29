import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { ErroImagem, processarJpeg } from "@/server/imagem";
import { dentroDoLimite } from "@/server/limite";
import { ErroTamanho, ErroValidacao } from "@/server/validacao";

export const dynamic = "force-dynamic";

const TAMANHO_MAXIMO = 4 * 1024 * 1024;
/** Base64 de 4 MB ≈ 5,4 MB + campos: corpos maiores são recusados antes de serem lidos. */
const LIMITE_CORPO = 6 * 1024 * 1024;
/** Fotos pendentes (enviadas e ainda não vinculadas) por usuário. */
const MAX_PENDENTES = 12;
const MAX_ENVIOS_POR_HORA = 60;

/**
 * Recebe uma foto já reduzida no navegador (JSON com base64 de um JPEG).
 * O servidor confere o conteúdo, lê as dimensões reais e remove metadados (EXIF/GPS).
 * A foto fica pendente, visível só para quem enviou, até a ocorrência ser salva.
 */
export async function POST(req: Request) {
  return responder(async () => {
    const u = await exigirUsuario("registrar");
    if (!dentroDoLimite(`anexo:${u.id}`, MAX_ENVIOS_POR_HORA, 60 * 60 * 1000)) {
      throw new ErroValidacao("Limite de envio de fotos atingido. Tente novamente mais tarde.");
    }
    const b = await lerCorpo(req, LIMITE_CORPO);
    if (String(b?.tipo ?? "") !== "image/jpeg") throw new ErroValidacao("Formato de imagem não suportado. Envie a foto pela tela do sistema (JPG).");
    const base64 = String(b?.dados ?? "").replace(/^data:image\/jpeg;base64,/, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new ErroValidacao("Imagem inválida.");
    const bruto = Buffer.from(base64, "base64");
    if (!bruto.length) throw new ErroValidacao("Imagem vazia.");
    if (bruto.length > TAMANHO_MAXIMO) throw new ErroTamanho("Imagem muito grande (máximo 4 MB).");
    let img: ReturnType<typeof processarJpeg>;
    try {
      img = processarJpeg(bruto);
    } catch (e) {
      if (e instanceof ErroImagem) throw new ErroValidacao(e.message);
      throw e;
    }
    const repo = repositorio();
    if ((await repo.contarAnexosPendentes(u.id)) >= MAX_PENDENTES) {
      throw new ErroValidacao("Há muitas fotos enviadas e ainda não salvas em um relatório. Salve ou descarte o relatório em andamento.");
    }
    const nome = String(b?.nome ?? "imagem").replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 120) || "imagem";
    return repo.salvarAnexo({ nome, tipo: "image/jpeg", largura: img.largura, altura: img.altura, dados: img.dados, enviadoPor: u.id });
  }, 201);
}
