/**
 * Armazenamento no aparelho (IndexedDB) para uso sem conexão:
 *  - rascunho do formulário de nova ocorrência (um por usuário);
 *  - fila de relatórios preenchidos sem conexão, enviados quando a conexão volta.
 *
 * Tudo fica separado por usuário: a fila só é enviada pela sessão do mesmo usuário
 * que preencheu (o autor do relatório é sempre quem está logado no envio).
 */
export interface FotoLocal {
  /** "local:<uuid>" enquanto não foi enviada ao servidor. */
  id: string;
  nome: string;
  largura: number;
  altura: number;
  /** JPEG reduzido (data URL). */
  dados: string;
}

export interface ItemFila {
  /** Identificador do envio (idCliente): o servidor não cria duas vezes o mesmo. */
  id: string;
  usuarioId: string;
  /** Instante do preenchimento (vira a data do relatório, dentro do limite aceito pelo servidor). */
  registradoEm: string;
  resumo: string;
  dados: Record<string, unknown>;
  fotos: FotoLocal[];
  /** Fotos que já estavam no servidor quando a conexão caiu. */
  anexosServidor: { id: string; nome: string; largura: number; altura: number }[];
  erro?: string;
}

export interface Rascunho {
  usuarioId: string;
  salvoEm: string;
  campos: Record<string, unknown>;
  fotos: FotoLocal[];
}

const BANCO = "fazenda-ilha-offline";
const VERSAO = 1;
const FILA = "fila";
const RASCUNHOS = "rascunhos";
export const EVENTO_FILA = "fazenda-ilha:fila-alterada";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, VERSAO);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(FILA)) db.createObjectStore(FILA, { keyPath: "id" }).createIndex("usuario", "usuarioId");
      if (!db.objectStoreNames.contains(RASCUNHOS)) db.createObjectStore(RASCUNHOS, { keyPath: "usuarioId" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function operar<T>(loja: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((ok, erro) => {
      const tx = db.transaction(loja, modo);
      const req = fn(tx.objectStore(loja));
      tx.oncomplete = () => ok(req.result);
      tx.onerror = () => erro(tx.error);
      tx.onabort = () => erro(tx.error);
    });
  } finally {
    db.close();
  }
}

const avisar = () => window.dispatchEvent(new Event(EVENTO_FILA));

export async function guardarNaFila(item: ItemFila) {
  await operar(FILA, "readwrite", (s) => s.put(item));
  avisar();
}

export async function listarFila(usuarioId: string): Promise<ItemFila[]> {
  const itens = await operar<ItemFila[]>(FILA, "readonly", (s) => s.index("usuario").getAll(usuarioId));
  return itens.sort((a, b) => a.registradoEm.localeCompare(b.registradoEm));
}

export async function removerDaFila(id: string) {
  await operar(FILA, "readwrite", (s) => s.delete(id));
  avisar();
}

export async function salvarRascunho(r: Rascunho) {
  await operar(RASCUNHOS, "readwrite", (s) => s.put(r));
}

export async function lerRascunho(usuarioId: string): Promise<Rascunho | undefined> {
  return operar<Rascunho | undefined>(RASCUNHOS, "readonly", (s) => s.get(usuarioId));
}

export async function apagarRascunho(usuarioId: string) {
  await operar(RASCUNHOS, "readwrite", (s) => s.delete(usuarioId));
}

/** Falha de rede (sem resposta do servidor), diferente de um erro devolvido pelo servidor. */
export function ehFalhaDeRede(e: unknown): boolean {
  return e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);
}

export function novoId(): string {
  return crypto.randomUUID();
}

let enviando: Promise<ResultadoEnvio> | null = null;

export interface ResultadoEnvio {
  enviados: number;
  pendentes: number;
  comErro: number;
  semConexao: boolean;
}

type Api = {
  enviarAnexo: (a: { nome: string; tipo: string; largura: number; altura: number; dados: string }) => Promise<{ id: string; nome: string; largura: number; altura: number }>;
  criarOcorrencia: (o: Record<string, unknown>) => Promise<{ id: string }>;
};

/**
 * Envia a fila deste usuário, um relatório por vez. Fotos enviadas são registradas
 * no item a cada passo (uma queda no meio não reenvia as que já foram). Itens com
 * erro devolvido pelo servidor ficam parados até a pessoa pedir nova tentativa.
 */
export function enviarFila(usuarioId: string, api: Api, opcoes: { incluirComErro?: boolean } = {}): Promise<ResultadoEnvio> {
  if (enviando) return enviando;
  enviando = (async () => {
    const r: ResultadoEnvio = { enviados: 0, pendentes: 0, comErro: 0, semConexao: false };
    for (const item of await listarFila(usuarioId)) {
      if (r.semConexao || (item.erro && !opcoes.incluirComErro)) {
        r.pendentes++;
        if (item.erro) r.comErro++;
        continue;
      }
      try {
        while (item.fotos.length) {
          const f = item.fotos[0];
          const a = await api.enviarAnexo({ nome: f.nome, tipo: "image/jpeg", largura: f.largura, altura: f.altura, dados: f.dados });
          item.anexosServidor.push(a);
          item.fotos.shift();
          await guardarNaFila(item);
        }
        await api.criarOcorrencia({ ...item.dados, anexos: item.anexosServidor, idCliente: item.id, registradoOfflineEm: item.registradoEm });
        await removerDaFila(item.id);
        r.enviados++;
      } catch (e) {
        r.pendentes++;
        if (ehFalhaDeRede(e)) {
          r.semConexao = true;
        } else if (!/já foi enviado/i.test((e as Error).message)) {
          item.erro = (e as Error).message || "Erro ao enviar.";
          r.comErro++;
          await guardarNaFila(item);
        }
      }
    }
    return r;
  })().finally(() => {
    enviando = null;
  });
  return enviando;
}
