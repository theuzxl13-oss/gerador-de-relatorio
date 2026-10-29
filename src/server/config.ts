/**
 * Validação da configuração do servidor (variáveis de ambiente).
 *
 * Regra geral: em produção (NODE_ENV=production) nenhuma configuração ausente
 * ou inválida pode resultar silenciosamente em algo inseguro. Nesses casos é
 * lançado ErroConfiguracao, e /api/saude responde 503 (o Render não troca a
 * versão em produção por uma que falhe no health check).
 *
 * Este módulo não depende do Next.js para poder ser testado diretamente.
 */
import { readFileSync } from "node:fs";

export type Ambiente = Record<string, string | undefined>;

export class ErroConfiguracao extends Error {}

export const ehProducao = (env: Ambiente = process.env) => env.NODE_ENV === "production";

// ───────────────────────────── Banco de dados (TLS) ─────────────────────────────

export type ModoSSL = "verificar" | "sem-verificacao" | "desativado";
const MODOS_SSL: ModoSSL[] = ["verificar", "sem-verificacao", "desativado"];

const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export interface ConfigConexao {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean; ca?: string };
  /** Descrição segura (sem credenciais) do modo usado, para o diagnóstico. */
  modoSSL: ModoSSL;
  aviso?: string;
}

function lerCA(env: Ambiente): string | undefined {
  const texto = env.DATABASE_CA_CERT?.trim();
  if (texto) {
    const pem = texto.replace(/\\n/g, "\n");
    if (!pem.includes("-----BEGIN CERTIFICATE-----")) throw new ErroConfiguracao("DATABASE_CA_CERT não contém um certificado PEM (-----BEGIN CERTIFICATE-----).");
    return pem;
  }
  const arquivo = env.DATABASE_CA_CERT_FILE?.trim();
  if (arquivo) {
    try {
      return readFileSync(arquivo, "utf8");
    } catch {
      throw new ErroConfiguracao("DATABASE_CA_CERT_FILE aponta para um arquivo que não pôde ser lido.");
    }
  }
  return undefined;
}

/**
 * Monta a configuração do pool do pg a partir da DATABASE_URL.
 *
 *  - Padrão (DATABASE_SSL ausente ou "verificar"): TLS com verificação do certificado
 *    e do nome do servidor. Usa as autoridades públicas do Node (Neon, Render, AWS…)
 *    ou a cadeia informada em DATABASE_CA_CERT / DATABASE_CA_CERT_FILE (ex.: Supabase).
 *  - "sem-verificacao": criptografa mas não confere o certificado. Só por decisão
 *    explícita; gera aviso no diagnóstico.
 *  - "desativado": sem TLS. Permitido apenas para banco local (localhost) ou fora de produção.
 *
 * Os parâmetros ssl* da URL são removidos porque, no pg 8.x, eles substituiriam
 * estas opções; um sslmode=disable na URL nunca desativa o TLS em produção.
 */
export function configurarConexao(url: string, env: Ambiente = process.env): ConfigConexao {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    throw new ErroConfiguracao("DATABASE_URL inválida (esperado postgresql://usuario:senha@servidor/banco).");
  }
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") throw new ErroConfiguracao("DATABASE_URL deve começar com postgresql://");

  const sslmodeUrl = u.searchParams.get("sslmode");
  for (const p of ["sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat", "sslnegotiation", "ssl"]) u.searchParams.delete(p);
  const connectionString = u.toString();

  const local = HOSTS_LOCAIS.has(u.hostname);
  const bruto = env.DATABASE_SSL?.trim();
  if (bruto && !MODOS_SSL.includes(bruto as ModoSSL)) {
    throw new ErroConfiguracao(`DATABASE_SSL inválido: use ${MODOS_SSL.join(", ")}.`);
  }
  let modo: ModoSSL = (bruto as ModoSSL) || "verificar";
  // Banco local sem pedido de TLS (desenvolvimento/testes): sem TLS.
  if (!bruto && local && sslmodeUrl !== "require" && sslmodeUrl !== "verify-full") modo = "desativado";
  // Fora de produção, sslmode=disable na URL continua valendo para bancos de teste.
  if (!bruto && !ehProducao(env) && sslmodeUrl === "disable") modo = "desativado";

  if (modo === "desativado") {
    if (ehProducao(env) && !local) {
      throw new ErroConfiguracao("Conexão sem TLS com banco remoto não é permitida em produção. Remova DATABASE_SSL=desativado.");
    }
    return { connectionString, modoSSL: modo };
  }
  if (modo === "sem-verificacao") {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
      modoSSL: modo,
      aviso: "DATABASE_SSL=sem-verificacao: a conexão é criptografada, mas o certificado do banco não é conferido. Prefira informar DATABASE_CA_CERT.",
    };
  }
  const ca = lerCA(env);
  return { connectionString, ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true }, modoSSL: modo };
}

// ───────────────────────────── Administrador inicial ─────────────────────────────

const SENHAS_FRACAS = new Set([
  "admin", "administrador", "123456", "12345678", "123456789", "1234567890", "senha", "senha123", "password",
  "qwerty", "fazenda", "fazendadailha", "trocar", "troque-esta-senha", "mudar123", "admin123",
]);

export const TAMANHO_MINIMO_SENHA_ADMIN = 12;

/** Motivo pelo qual a senha é fraca, ou null se aceitável. */
export function fraquezaSenha(senha: string, login: string, minimo: number): string | null {
  if (senha.length < minimo) return `deve ter pelo menos ${minimo} caracteres`;
  const s = senha.toLowerCase();
  if (SENHAS_FRACAS.has(s) || s === login.toLowerCase() || /^(.)\1+$/.test(s) || /^\d+$/.test(s)) return "é fácil de adivinhar";
  return null;
}

export interface CredenciaisIniciais {
  login: string;
  senha: string;
  nome: string;
}

/**
 * Credenciais do primeiro Admin Geral (usadas somente enquanto não existe nenhum usuário).
 * Não há credencial padrão: APP_USUARIO e APP_SENHA são obrigatórias em qualquer ambiente;
 * em produção a senha precisa ser forte. As mensagens nunca incluem os valores.
 */
export function credenciaisAdminInicial(env: Ambiente = process.env): CredenciaisIniciais {
  const login = env.APP_USUARIO?.trim() ?? "";
  const senha = env.APP_SENHA ?? "";
  if (!login || !senha) {
    throw new ErroConfiguracao("Primeiro acesso: defina APP_USUARIO e APP_SENHA no servidor para criar o Admin Geral inicial.");
  }
  if (!/^[A-Za-z0-9._@-]{3,40}$/.test(login)) throw new ErroConfiguracao("APP_USUARIO inválido: use de 3 a 40 letras, números, ponto, hífen ou @.");
  const minimo = ehProducao(env) ? TAMANHO_MINIMO_SENHA_ADMIN : 8;
  const fraqueza = fraquezaSenha(senha, login, minimo);
  if (fraqueza) throw new ErroConfiguracao(`APP_SENHA ${fraqueza}. Ajuste a variável no servidor antes do primeiro acesso.`);
  return { login, senha, nome: env.APP_ADMIN_NOME?.trim() || login };
}

// ───────────────────────────── Diagnóstico geral ─────────────────────────────

export const TAMANHO_MINIMO_SEGREDO = 32;

/** Lista de problemas que impedem o uso seguro em produção (sem revelar valores). */
export function problemasDeConfiguracao(env: Ambiente = process.env): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  if (!ehProducao(env)) return { erros, avisos };

  if ((env.SESSAO_SEGREDO ?? "").length < TAMANHO_MINIMO_SEGREDO) {
    erros.push(`SESSAO_SEGREDO ausente ou curto (mínimo ${TAMANHO_MINIMO_SEGREDO} caracteres aleatórios).`);
  }
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    if (env.PERMITIR_ARMAZENAMENTO_ARQUIVO !== "true") erros.push("DATABASE_URL ausente: em produção os dados seriam gravados em arquivo temporário e perdidos.");
  } else {
    try {
      const c = configurarConexao(url, env);
      if (c.aviso) avisos.push(c.aviso);
    } catch (e) {
      erros.push((e as Error).message);
    }
  }
  if (env.PERMITIR_RESTAURAR_DEMO === "true") avisos.push("PERMITIR_RESTAURAR_DEMO=true é ignorado em produção.");
  return { erros, avisos };
}
