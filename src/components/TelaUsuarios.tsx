"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-cliente";
import { perfisGerenciaveis } from "@/lib/permissoes";
import { PERFIL_LABEL, type Perfil, type Usuario } from "@/lib/types";
import { Aviso, Botao, Campo, Carregando, Entrada, Modal, Selecao } from "./ui";
import { useUsuario } from "./UsuarioContexto";

export const PERFIL_DESCRICAO: Record<Perfil, string> = {
  ADMIN_GERAL: "Acesso total: relatórios, providências, exclusão, Base Normativa, Configurações e todos os logins.",
  GERENTE: "Visualiza tudo (relatórios, providências, prazos e painel) para acompanhar os procedimentos. Não altera nada.",
  ADMINISTRACAO: "Analisa os relatórios e registra a providência (arquivado, notificado ou multado). Cria os logins de líderes, porteiros e rondas.",
  LIDER: "Somente gera relatórios e consulta os que ele mesmo gerou.",
  PORTEIRO: "Somente gera relatórios e consulta os que ele mesmo gerou.",
  RONDA: "Somente gera relatórios e consulta os que ele mesmo gerou.",
};

interface Edicao {
  id?: string;
  nome: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
  senha: string;
}

export function TelaUsuarios({ meuId }: { meuId: string }) {
  const perfis = perfisGerenciaveis(useUsuario()?.perfil);
  const NOVO: Edicao = { nome: "", login: "", perfil: perfis.includes("LIDER") ? "LIDER" : perfis[0], ativo: true, senha: "" };
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState("");
  const [erroModal, setErroModal] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => api.usuarios().then(setUsuarios).catch((e) => setErro(e.message));
  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!edicao) return;
    setErroModal("");
    setSalvando(true);
    try {
      if (edicao.id) {
        await api.atualizarUsuario(edicao.id, { nome: edicao.nome, login: edicao.login, perfil: edicao.perfil, ativo: edicao.ativo, senha: edicao.senha || undefined });
        setMensagem(`Usuário "${edicao.nome}" atualizado.`);
      } else {
        await api.criarUsuario({ nome: edicao.nome, login: edicao.login, perfil: edicao.perfil, senha: edicao.senha });
        setMensagem(`Usuário "${edicao.nome}" criado. Informe a ele o login "${edicao.login}" e a senha definida.`);
      }
      setEdicao(null);
      await carregar();
    } catch (e) {
      setErroModal((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const set = <K extends keyof Edicao>(k: K, v: Edicao[K]) => setEdicao((x) => (x ? { ...x, [k]: v } : x));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-600">Quem pode acessar o sistema e o que cada um pode fazer.</p>
        </div>
        <Botao onClick={() => { setErroModal(""); setEdicao({ ...NOVO }); }}>+ Novo usuário</Botao>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {perfis.map((p) => (
          <div key={p} className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
            <div className="mb-1 font-semibold text-marca-800">{PERFIL_LABEL[p]}</div>
            <p className="text-gray-600">{PERFIL_DESCRICAO[p]}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Logins não são apagados: para bloquear o acesso, edite e desmarque “Usuário ativo”. Os relatórios e as decisões continuam registrados com o nome de quem os fez.
      </p>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {mensagem && <Aviso tipo="sucesso">{mensagem}</Aviso>}
      {!usuarios && !erro && <Carregando />}

      {usuarios && usuarios.length === 0 && <p className="text-sm text-gray-500">Nenhum login criado ainda. Clique em “+ Novo usuário”.</p>}
      {usuarios && usuarios.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {usuarios.map((u) => (
            <li key={u.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${u.ativo ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">
                  {u.nome} {u.id === meuId && <span className="text-xs font-normal text-gray-500">(você)</span>}
                </div>
                <div className="text-sm text-gray-600">
                  Login: <span className="font-mono">{u.login}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${u.perfil === "ADMIN_GERAL" || u.perfil === "ADMINISTRACAO" ? "bg-marca-50 text-marca-800 ring-marca-200" : "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                  {PERFIL_LABEL[u.perfil]}
                </span>
                {!u.ativo && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">Desativado</span>}
                <Botao variante="secundario" className="!py-1.5" onClick={() => { setErroModal(""); setEdicao({ id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, ativo: u.ativo, senha: "" }); }}>
                  Editar
                </Botao>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edicao && (
        <Modal aberto aoFechar={() => setEdicao(null)} titulo={edicao.id ? `Editar – ${edicao.nome}` : "Novo usuário"} largura="max-w-lg">
          <div className="space-y-4">
            <Campo rotulo="Nome" obrigatorio>
              <Entrada value={edicao.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Ex.: José Luiz" maxLength={80} />
            </Campo>
            <Campo rotulo="Login (usuário para entrar)" obrigatorio ajuda="Sem espaços. Ex.: jose.luiz, portaria2, hugo">
              <Entrada value={edicao.login} onChange={(e) => set("login", e.target.value.replace(/\s/g, ""))} autoCapitalize="none" maxLength={40} />
            </Campo>
            <Campo rotulo="Perfil" obrigatorio ajuda={PERFIL_DESCRICAO[edicao.perfil]}>
              <Selecao value={edicao.perfil} onChange={(e) => set("perfil", e.target.value as Perfil)}>
                {perfis.map((p) => (
                  <option key={p} value={p}>{PERFIL_LABEL[p]}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo
              rotulo={edicao.id ? "Nova senha (deixe em branco para manter a atual)" : "Senha"}
              obrigatorio={!edicao.id}
              ajuda="Mínimo de 8 caracteres. A pessoa pode trocá-la depois em “trocar senha”."
            >
              <Entrada type="text" value={edicao.senha} onChange={(e) => set("senha", e.target.value)} autoComplete="new-password" />
            </Campo>
            {edicao.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-marca-700" checked={edicao.ativo} onChange={(e) => set("ativo", e.target.checked)} disabled={edicao.id === meuId} />
                Usuário ativo (desmarque para bloquear o acesso sem apagar o histórico)
              </label>
            )}
            {erroModal && <Aviso tipo="erro">{erroModal}</Aviso>}
            <div className="flex justify-end gap-2 pt-2">
              <Botao variante="secundario" onClick={() => setEdicao(null)}>Cancelar</Botao>
              <Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
