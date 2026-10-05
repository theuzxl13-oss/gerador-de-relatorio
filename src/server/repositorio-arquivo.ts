import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { CONFIGURACOES_PADRAO, type Configuracoes, type Norma, type Ocorrencia } from "@/lib/types";
import type { NovoAnexo, NovaOcorrencia, Repositorio } from "./repositorio";

interface AnexoArquivo {
  id: string;
  ocorrenciaId?: string;
  nome: string;
  tipo: string;
  largura: number;
  altura: number;
  criadoEm: string;
}

interface Banco {
  normas: Norma[];
  ocorrencias: Ocorrencia[];
  sequencias: Record<string, number>;
  configuracoes: Configuracoes;
  anexos?: AnexoArquivo[];
}

/**
 * Armazenamento em arquivo JSON para uso local/demonstração (sem PostgreSQL).
 * NÃO use em produção no Render: o disco do serviço gratuito é apagado a cada
 * reinício. Em produção configure DATABASE_URL.
 */
export class RepositorioArquivo implements Repositorio {
  readonly tipo = "arquivo" as const;
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private arquivo = path.join(process.cwd(), "dados", "banco.json")) {}

  private caminhoAnexo(id: string) {
    return path.join(path.dirname(this.arquivo), "anexos", `${id}.bin`);
  }

  /** Vincula as fotos à ocorrência e remove as que deixaram de fazer parte dela. */
  private async vincularAnexos(db: Banco, o: Ocorrencia) {
    const ids = new Set((o.anexos ?? []).map((a) => a.id));
    const lista = db.anexos ?? [];
    for (const a of lista.filter((x) => x.ocorrenciaId === o.id && !ids.has(x.id))) {
      await fs.rm(this.caminhoAnexo(a.id), { force: true });
    }
    db.anexos = lista.filter((x) => !(x.ocorrenciaId === o.id && !ids.has(x.id)));
    for (const a of db.anexos) if (ids.has(a.id) && !a.ocorrenciaId) a.ocorrenciaId = o.id;
  }

  private async removerAnexosDe(db: Banco, ocorrenciaId?: string) {
    const remover = (db.anexos ?? []).filter((a) => !ocorrenciaId || a.ocorrenciaId === ocorrenciaId);
    for (const a of remover) await fs.rm(this.caminhoAnexo(a.id), { force: true });
    db.anexos = (db.anexos ?? []).filter((a) => !remover.includes(a));
  }

  salvarAnexo(a: NovoAnexo) {
    return this.exclusivo(async (db) => {
      const id = randomUUID();
      await fs.mkdir(path.dirname(this.caminhoAnexo(id)), { recursive: true });
      await fs.writeFile(this.caminhoAnexo(id), a.dados);
      db.anexos = [...(db.anexos ?? []), { id, nome: a.nome, tipo: a.tipo, largura: a.largura, altura: a.altura, criadoEm: new Date().toISOString() }];
      return { id, nome: a.nome, largura: a.largura, altura: a.altura };
    }, true);
  }

  obterAnexo(id: string) {
    return this.exclusivo(async (db) => {
      const a = (db.anexos ?? []).find((x) => x.id === id);
      if (!a) return null;
      return { tipo: a.tipo, dados: await fs.readFile(this.caminhoAnexo(id)) };
    }, false);
  }

  /** Serializa leituras/escritas para evitar condições de corrida. */
  private exclusivo<T>(fn: (db: Banco) => Promise<T> | T, gravar: boolean): Promise<T> {
    const exec = this.fila.then(async () => {
      const db = await this.ler();
      const r = await fn(db);
      if (gravar) await this.gravar(db);
      return r;
    });
    this.fila = exec.catch(() => undefined);
    return exec;
  }

  private async ler(): Promise<Banco> {
    try {
      return JSON.parse(await fs.readFile(this.arquivo, "utf8")) as Banco;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const db: Banco = { normas: structuredClone(NORMAS_ORIGINAIS), ocorrencias: [], sequencias: {}, configuracoes: CONFIGURACOES_PADRAO };
      if (process.env.SEED_DEMO !== "false") this.semear(db);
      await this.gravar(db);
      return db;
    }
  }

  private async gravar(db: Banco) {
    await fs.mkdir(path.dirname(this.arquivo), { recursive: true });
    const tmp = `${this.arquivo}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, this.arquivo);
  }

  private protocolo(db: Banco, ano: number) {
    for (;;) {
      const n = (db.sequencias[ano] ?? 0) + 1;
      db.sequencias[ano] = n;
      const p = `${ano}-${String(n).padStart(4, "0")}`;
      if (!db.ocorrencias.some((o) => o.protocolo === p)) return p;
    }
  }

  protocoloEmUso(protocolo: string, excetoId?: string) {
    const p = protocolo.trim().toLowerCase();
    return this.exclusivo((db) => !!p && db.ocorrencias.some((o) => o.id !== excetoId && (o.protocolo ?? "").toLowerCase() === p), false);
  }

  private semear(db: Banco) {
    for (const o of ocorrenciasDemonstrativas(db.normas)) {
      db.ocorrencias.push({ ...o, id: randomUUID(), protocolo: this.protocolo(db, Number(o.data.slice(0, 4))) });
    }
  }

  listarNormas() {
    return this.exclusivo((db) => db.normas, false);
  }

  salvarNorma(norma: Norma) {
    return this.exclusivo((db) => {
      const n = { ...norma, atualizadoEm: new Date().toISOString() };
      const i = db.normas.findIndex((x) => x.id === n.id);
      if (i >= 0) db.normas[i] = n;
      else db.normas.push(n);
      return n;
    }, true);
  }

  excluirNorma(id: string) {
    return this.exclusivo((db) => {
      db.normas = db.normas.filter((n) => n.id !== id);
    }, true);
  }

  restaurarNormas() {
    return this.exclusivo((db) => {
      db.normas = structuredClone(NORMAS_ORIGINAIS);
    }, true);
  }

  listarOcorrencias() {
    return this.exclusivo(
      (db) => [...db.ocorrencias].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)),
      false,
    );
  }

  obterOcorrencia(id: string) {
    return this.exclusivo((db) => db.ocorrencias.find((o) => o.id === id) ?? null, false);
  }

  criarOcorrencia(dados: NovaOcorrencia, gerarProtocolo = false) {
    return this.exclusivo(async (db) => {
      const agora = new Date().toISOString();
      const protocolo = gerarProtocolo ? this.protocolo(db, Number(dados.data.slice(0, 4))) : (dados.protocolo ?? "").trim();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo, criadoEm: agora, atualizadoEm: agora };
      db.ocorrencias.push(o);
      await this.vincularAnexos(db, o);
      return o;
    }, true);
  }

  atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>, gerarProtocolo = false) {
    return this.exclusivo(async (db) => {
      const i = db.ocorrencias.findIndex((o) => o.id === id);
      if (i < 0) return null;
      const atual = db.ocorrencias[i];
      const o: Ocorrencia = {
        ...atual,
        ...dados,
        id: atual.id,
        protocolo: (dados.protocolo ?? atual.protocolo ?? "").trim(),
        criadoEm: atual.criadoEm,
        atualizadoEm: new Date().toISOString(),
      };
      if (gerarProtocolo) o.protocolo = this.protocolo(db, Number(o.data.slice(0, 4)));
      db.ocorrencias[i] = o;
      await this.vincularAnexos(db, o);
      return o;
    }, true);
  }

  excluirOcorrencia(id: string) {
    return this.exclusivo(async (db) => {
      db.ocorrencias = db.ocorrencias.filter((o) => o.id !== id);
      await this.removerAnexosDe(db, id);
    }, true);
  }

  restaurarDemonstracao() {
    return this.exclusivo(async (db) => {
      db.ocorrencias = [];
      db.sequencias = {};
      await this.removerAnexosDe(db);
      this.semear(db);
    }, true);
  }

  obterConfiguracoes() {
    return this.exclusivo((db) => ({ ...CONFIGURACOES_PADRAO, ...db.configuracoes }), false);
  }

  salvarConfiguracoes(cfg: Configuracoes) {
    return this.exclusivo((db) => {
      db.configuracoes = { ...CONFIGURACOES_PADRAO, ...cfg };
      return db.configuracoes;
    }, true);
  }
}
