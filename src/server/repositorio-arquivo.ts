import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NORMAS_ATAS, NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { CONFIGURACOES_PADRAO, type AnexoInfo, type Configuracoes, type Norma, type Ocorrencia, type Usuario, type UsuarioComSenha } from "@/lib/types";
import { normalizarPerfil } from "@/lib/permissoes";
import { emAcompanhamento, estatisticas, ordenar, paginar, resumoProvidencias, type FiltroOcorrencias } from "@/lib/consulta";
import { ErroConflito, ErroValidacao } from "./validacao";
import type { Alteracao, EventoAuditoriaGravado, NovoAnexo, NovaOcorrencia, RegistroAuditoria, Repositorio } from "./repositorio";

interface AnexoArquivo {
  id: string;
  ocorrenciaId?: string;
  enviadoPor?: string;
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
  usuarios?: UsuarioComSenha[];
  auditoria?: EventoAuditoriaGravado[];
  /** Migrações de dados já aplicadas a este arquivo. */
  migracoes?: number[];
}

function comPerfil(u: UsuarioComSenha): UsuarioComSenha {
  return { ...u, perfil: normalizarPerfil(u.perfil) };
}

function semSenha(u: UsuarioComSenha): Usuario {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { senhaHash, ...resto } = u;
  return resto;
}

const chaveProtocolo = (p: string | undefined) => (p ?? "").trim().toLowerCase();
const UM_DIA = 24 * 60 * 60 * 1000;

/**
 * Armazenamento em arquivo JSON para uso local/demonstração (sem PostgreSQL).
 * NÃO use em produção: o disco do Render gratuito é apagado a cada reinício
 * (em produção o sistema exige DATABASE_URL). Cada operação lê, altera e grava o
 * arquivo inteiro de forma serializada, o que equivale a uma transação.
 */
export class RepositorioArquivo implements Repositorio {
  readonly tipo = "arquivo" as const;
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private arquivo = path.join(process.cwd(), "dados", "banco.json")) {}

  private caminhoAnexo(id: string) {
    return path.join(path.dirname(this.arquivo), "anexos", `${id}.bin`);
  }

  /** Serializa leituras/escritas; a gravação só ocorre se `fn` terminar sem erro. */
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
      const db = JSON.parse(await fs.readFile(this.arquivo, "utf8")) as Banco;
      // Mesma regra da migração 4 do PostgreSQL: acrescenta as atas uma única vez.
      if (!(db.migracoes ?? []).includes(4)) {
        for (const n of NORMAS_ATAS) if (!db.normas.some((x) => x.id === n.id)) db.normas.push(structuredClone(n));
        db.migracoes = [...(db.migracoes ?? []), 4];
        await this.gravar(db);
      }
      return db;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const db: Banco = { normas: structuredClone(NORMAS_ORIGINAIS), ocorrencias: [], sequencias: {}, configuracoes: CONFIGURACOES_PADRAO, migracoes: [4] };
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

  private auditar(db: Banco, a: RegistroAuditoria) {
    const lista = db.auditoria ?? [];
    const id = String(Number(lista.at(-1)?.id ?? 0) + 1);
    lista.push({ ...a, id, em: new Date().toISOString(), resultado: a.resultado ?? "SUCESSO", usuario: a.usuario ?? null, detalhe: a.detalhe ?? {} });
    db.auditoria = lista;
  }

  registrarAuditoria(a: RegistroAuditoria) {
    return this.exclusivo((db) => this.auditar(db, a), true);
  }

  listarAuditoria(f: { limite: number; antesDe?: string; entidade?: string; entidadeId?: string }) {
    return this.exclusivo(
      (db) =>
        [...(db.auditoria ?? [])]
          .reverse()
          .filter((e) => (!f.antesDe || Number(e.id) < Number(f.antesDe)) && (!f.entidade || e.entidade === f.entidade) && (!f.entidadeId || e.entidadeId === f.entidadeId))
          .slice(0, Math.min(Math.max(f.limite, 1), 200)),
      false,
    );
  }

  diagnosticoIntegridade() {
    return this.exclusivo((db) => {
      const cont = new Map<string, number>();
      for (const o of db.ocorrencias) if (chaveProtocolo(o.protocolo)) cont.set(chaveProtocolo(o.protocolo), (cont.get(chaveProtocolo(o.protocolo)) ?? 0) + 1);
      const dup = [...cont].filter(([, n]) => n > 1).map(([p, n]) => `${p} (${n}x)`);
      return dup.length ? [`Há protocolos repetidos (${dup.join(", ")}). Corrija-os pela tela Editar.`] : [];
    }, false);
  }

  /** Vincula as fotos (mesmas regras do PostgreSQL) e remove as retiradas. */
  private async vincularAnexos(db: Banco, o: Ocorrencia, usuarioId: string): Promise<AnexoInfo[] | undefined> {
    const ids = [...new Set((o.anexos ?? []).map((a) => a.id))];
    const lista = db.anexos ?? [];
    const permitidos = lista.filter((a) => ids.includes(a.id) && (a.ocorrenciaId === o.id || (!a.ocorrenciaId && a.enviadoPor === usuarioId)));
    if (permitidos.length !== ids.length) throw new ErroValidacao("Uma das imagens não existe mais ou foi enviada por outro usuário. Envie a foto novamente.");
    for (const a of lista.filter((x) => x.ocorrenciaId === o.id && !ids.includes(x.id))) await fs.rm(this.caminhoAnexo(a.id), { force: true });
    db.anexos = lista.filter((x) => !(x.ocorrenciaId === o.id && !ids.includes(x.id)));
    for (const a of permitidos) a.ocorrenciaId = o.id;
    if (!ids.length) return undefined;
    return ids.map((id) => {
      const a = permitidos.find((x) => x.id === id)!;
      return { id, nome: a.nome, largura: a.largura, altura: a.altura };
    });
  }

  private async removerAnexosDe(db: Banco, ocorrenciaId?: string) {
    const remover = (db.anexos ?? []).filter((a) => (ocorrenciaId ? a.ocorrenciaId === ocorrenciaId : !!a.ocorrenciaId));
    for (const a of remover) await fs.rm(this.caminhoAnexo(a.id), { force: true });
    db.anexos = (db.anexos ?? []).filter((a) => !remover.includes(a));
  }

  salvarAnexo(a: NovoAnexo) {
    return this.exclusivo(async (db) => {
      const agora = Date.now();
      const vencidos = (db.anexos ?? []).filter((x) => !x.ocorrenciaId && agora - Date.parse(x.criadoEm) > UM_DIA);
      for (const x of vencidos) await fs.rm(this.caminhoAnexo(x.id), { force: true });
      db.anexos = (db.anexos ?? []).filter((x) => !vencidos.includes(x));
      const id = randomUUID();
      await fs.mkdir(path.dirname(this.caminhoAnexo(id)), { recursive: true });
      await fs.writeFile(this.caminhoAnexo(id), a.dados);
      db.anexos.push({ id, nome: a.nome, tipo: a.tipo, largura: a.largura, altura: a.altura, enviadoPor: a.enviadoPor, criadoEm: new Date().toISOString() });
      return { id, nome: a.nome, largura: a.largura, altura: a.altura };
    }, true);
  }

  obterAnexo(id: string) {
    return this.exclusivo(async (db) => {
      const a = (db.anexos ?? []).find((x) => x.id === id);
      if (!a) return null;
      return { tipo: a.tipo, dados: await fs.readFile(this.caminhoAnexo(id)), ocorrenciaId: a.ocorrenciaId, enviadoPor: a.enviadoPor };
    }, false);
  }

  contarAnexosPendentes(usuarioId: string) {
    return this.exclusivo((db) => (db.anexos ?? []).filter((a) => !a.ocorrenciaId && a.enviadoPor === usuarioId && Date.now() - Date.parse(a.criadoEm) < UM_DIA).length, false);
  }

  private protocolo(db: Banco, ano: number) {
    for (;;) {
      const n = (db.sequencias[ano] ?? 0) + 1;
      db.sequencias[ano] = n;
      const p = `${ano}-${String(n).padStart(4, "0")}`;
      if (!db.ocorrencias.some((o) => chaveProtocolo(o.protocolo) === chaveProtocolo(p))) return p;
    }
  }

  private conferirProtocoloUnico(db: Banco, o: Ocorrencia) {
    const p = chaveProtocolo(o.protocolo);
    if (p && db.ocorrencias.some((x) => x.id !== o.id && chaveProtocolo(x.protocolo) === p)) {
      throw new ErroConflito("Já existe uma ocorrência com este protocolo.");
    }
  }

  protocoloEmUso(protocolo: string, excetoId?: string) {
    const p = chaveProtocolo(protocolo);
    return this.exclusivo((db) => !!p && db.ocorrencias.some((o) => o.id !== excetoId && chaveProtocolo(o.protocolo) === p), false);
  }

  private semear(db: Banco) {
    for (const o of ocorrenciasDemonstrativas(db.normas)) {
      db.ocorrencias.push({ ...o, id: randomUUID(), protocolo: this.protocolo(db, Number(o.data.slice(0, 4))), versao: 1 });
    }
  }

  listarNormas() {
    return this.exclusivo((db) => db.normas, false);
  }

  salvarNorma(norma: Norma, auditoria: RegistroAuditoria) {
    return this.exclusivo((db) => {
      const n = { ...norma, atualizadoEm: new Date().toISOString() };
      const i = db.normas.findIndex((x) => x.id === n.id);
      if (i >= 0) db.normas[i] = n;
      else db.normas.push(n);
      this.auditar(db, auditoria);
      return n;
    }, true);
  }

  excluirNorma(id: string, auditoria: RegistroAuditoria) {
    return this.exclusivo((db) => {
      db.normas = db.normas.filter((n) => n.id !== id);
      this.auditar(db, auditoria);
    }, true);
  }

  restaurarNormas(auditoria: RegistroAuditoria) {
    return this.exclusivo((db) => {
      db.normas = structuredClone(NORMAS_ORIGINAIS);
      this.auditar(db, auditoria);
    }, true);
  }

  listarOcorrencias() {
    return this.exclusivo(
      (db) => [...db.ocorrencias].map((o) => ({ ...o, versao: o.versao ?? 1 })).sort(ordenar),
      false,
    );
  }

  buscarOcorrencias(filtro: FiltroOcorrencias, pagina: number, porPagina: number, opcoes: { crescente?: boolean } = {}) {
    return this.exclusivo((db) => paginar(db.ocorrencias.map((o) => ({ ...o, versao: o.versao ?? 1 })), filtro, pagina, porPagina, opcoes.crescente), false);
  }

  estatisticas(filtro: Pick<FiltroOcorrencias, "registradoPor">, hoje: string) {
    return this.exclusivo((db) => estatisticas(db.ocorrencias.filter((o) => !filtro.registradoPor || o.registradoPor?.id === filtro.registradoPor), hoje), false);
  }

  resumoProvidencias(hoje: string) {
    return this.exclusivo((db) => resumoProvidencias(db.ocorrencias, hoje), false);
  }

  listarEmAcompanhamento(hoje: string) {
    return this.exclusivo((db) => db.ocorrencias.filter((o) => emAcompanhamento(o, hoje)).map((o) => ({ ...o, versao: o.versao ?? 1 })), false);
  }

  obterPorIdCliente(usuarioId: string, idCliente: string) {
    return this.exclusivo((db) => {
      const o = db.ocorrencias.find((x) => x.idCliente === idCliente && x.registradoPor?.id === usuarioId);
      return o ? { ...o, versao: o.versao ?? 1 } : null;
    }, false);
  }

  obterOcorrencia(id: string) {
    return this.exclusivo((db) => {
      const o = db.ocorrencias.find((x) => x.id === id);
      return o ? { ...o, versao: o.versao ?? 1 } : null;
    }, false);
  }

  criarOcorrencia(dados: NovaOcorrencia, opcoes: { gerarProtocolo?: boolean; usuarioId: string }, auditoria: (o: Ocorrencia) => RegistroAuditoria) {
    return this.exclusivo(async (db) => {
      const agora = new Date().toISOString();
      const protocolo = opcoes.gerarProtocolo ? this.protocolo(db, Number(dados.data.slice(0, 4))) : (dados.protocolo ?? "").trim();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo, criadoEm: agora, atualizadoEm: agora, versao: 1 };
      this.conferirProtocoloUnico(db, o);
      o.anexos = await this.vincularAnexos(db, o, opcoes.usuarioId);
      db.ocorrencias.push(o);
      this.auditar(db, auditoria(o));
      return o;
    }, true);
  }

  alterarOcorrencia(id: string, decidir: (atual: Ocorrencia) => Alteracao | Promise<Alteracao>, opcoes: { versaoEsperada?: number; usuarioId: string }) {
    return this.exclusivo(async (db) => {
      const i = db.ocorrencias.findIndex((o) => o.id === id);
      if (i < 0) return null;
      const atual = { ...db.ocorrencias[i], versao: db.ocorrencias[i].versao ?? 1 };
      if (opcoes.versaoEsperada !== undefined && opcoes.versaoEsperada !== atual.versao) {
        throw new ErroConflito("Este relatório foi alterado por outra pessoa depois que você o abriu. Recarregue a página para ver a versão atual.");
      }
      const alt = await decidir(atual);
      const o: Ocorrencia = {
        ...atual,
        ...alt.dados,
        id: atual.id,
        protocolo: (alt.dados.protocolo ?? atual.protocolo ?? "").trim(),
        criadoEm: atual.criadoEm,
        atualizadoEm: new Date().toISOString(),
        versao: atual.versao + 1,
      };
      if (alt.gerarProtocolo) o.protocolo = this.protocolo(db, Number(o.data.slice(0, 4)));
      this.conferirProtocoloUnico(db, o);
      if ("anexos" in alt.dados) o.anexos = await this.vincularAnexos(db, o, opcoes.usuarioId);
      db.ocorrencias[i] = o;
      if (alt.auditoria) this.auditar(db, alt.auditoria);
      return o;
    }, true);
  }

  excluirOcorrencia(id: string, auditoria: RegistroAuditoria) {
    return this.exclusivo(async (db) => {
      if (!db.ocorrencias.some((o) => o.id === id)) return false;
      db.ocorrencias = db.ocorrencias.filter((o) => o.id !== id);
      await this.removerAnexosDe(db, id);
      this.auditar(db, auditoria);
      return true;
    }, true);
  }

  restaurarDemonstracao(auditoria: RegistroAuditoria) {
    return this.exclusivo(async (db) => {
      db.ocorrencias = [];
      db.sequencias = {};
      await this.removerAnexosDe(db);
      this.semear(db);
      this.auditar(db, auditoria);
    }, true);
  }

  listarUsuarios() {
    return this.exclusivo((db) => [...(db.usuarios ?? [])].sort((a, b) => a.nome.localeCompare(b.nome)).map((u) => semSenha(comPerfil(u))), false);
  }

  obterUsuario(id: string) {
    return this.exclusivo((db) => {
      const u = (db.usuarios ?? []).find((x) => x.id === id);
      return u ? comPerfil(u) : null;
    }, false);
  }

  obterUsuarioPorLogin(login: string) {
    const l = login.trim().toLowerCase();
    return this.exclusivo((db) => {
      const u = (db.usuarios ?? []).find((x) => x.login.toLowerCase() === l);
      return u ? comPerfil(u) : null;
    }, false);
  }

  salvarUsuario(u: UsuarioComSenha, auditoria?: RegistroAuditoria) {
    return this.exclusivo((db) => {
      const lista = db.usuarios ?? [];
      if (lista.some((x) => x.id !== u.id && x.login.toLowerCase() === u.login.toLowerCase())) throw new ErroConflito("Este login já está em uso.");
      const i = lista.findIndex((x) => x.id === u.id);
      if (i >= 0) lista[i] = u;
      else lista.push(u);
      db.usuarios = lista;
      if (auditoria) this.auditar(db, auditoria);
      return semSenha(u);
    }, true);
  }

  criarPrimeiroUsuario(u: UsuarioComSenha) {
    return this.exclusivo((db) => {
      if ((db.usuarios ?? []).length > 0) return false;
      db.usuarios = [u];
      this.auditar(db, { usuario: null, acao: "ADMIN_INICIAL_CRIADO", entidade: "usuario", entidadeId: u.id, detalhe: { login: u.login, perfil: u.perfil } });
      return true;
    }, true);
  }

  contarUsuarios() {
    return this.exclusivo((db) => (db.usuarios ?? []).length, false);
  }

  obterConfiguracoes() {
    return this.exclusivo((db) => ({ ...CONFIGURACOES_PADRAO, ...db.configuracoes }), false);
  }

  salvarConfiguracoes(cfg: Configuracoes, auditoria: RegistroAuditoria) {
    return this.exclusivo((db) => {
      db.configuracoes = { ...CONFIGURACOES_PADRAO, ...cfg };
      this.auditar(db, auditoria);
      return db.configuracoes;
    }, true);
  }
}
