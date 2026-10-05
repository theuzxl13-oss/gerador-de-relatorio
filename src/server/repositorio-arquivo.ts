import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { CONFIGURACOES_PADRAO, type Configuracoes, type Norma, type Ocorrencia } from "@/lib/types";
import type { NovaOcorrencia, Repositorio } from "./repositorio";

interface Banco {
  normas: Norma[];
  ocorrencias: Ocorrencia[];
  sequencias: Record<string, number>;
  configuracoes: Configuracoes;
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
    const n = (db.sequencias[ano] ?? 0) + 1;
    db.sequencias[ano] = n;
    return `${ano}-${String(n).padStart(4, "0")}`;
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

  criarOcorrencia(dados: NovaOcorrencia) {
    return this.exclusivo((db) => {
      const agora = new Date().toISOString();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo: this.protocolo(db, Number(dados.data.slice(0, 4))), criadoEm: agora, atualizadoEm: agora };
      db.ocorrencias.push(o);
      return o;
    }, true);
  }

  atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>) {
    return this.exclusivo((db) => {
      const i = db.ocorrencias.findIndex((o) => o.id === id);
      if (i < 0) return null;
      const atual = db.ocorrencias[i];
      const o: Ocorrencia = { ...atual, ...dados, id: atual.id, protocolo: atual.protocolo, criadoEm: atual.criadoEm, atualizadoEm: new Date().toISOString() };
      db.ocorrencias[i] = o;
      return o;
    }, true);
  }

  excluirOcorrencia(id: string) {
    return this.exclusivo((db) => {
      db.ocorrencias = db.ocorrencias.filter((o) => o.id !== id);
    }, true);
  }

  restaurarDemonstracao() {
    return this.exclusivo((db) => {
      db.ocorrencias = [];
      db.sequencias = {};
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
