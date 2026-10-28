"use client";

import { useState } from "react";
import { api } from "@/lib/api-cliente";
import { useUsuario } from "./UsuarioContexto";
import { Aviso, Botao, Campo, Cartao, Entrada } from "./ui";

export function TelaMinhaSenha() {
  const usuario = useUsuario();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nova.length < 6) return setMsg({ tipo: "erro", texto: "A nova senha deve ter pelo menos 6 caracteres." });
    if (nova !== confirma) return setMsg({ tipo: "erro", texto: "A confirmação não confere com a nova senha." });
    setSalvando(true);
    try {
      await api.trocarMinhaSenha(atual, nova);
      setAtual("");
      setNova("");
      setConfirma("");
      setMsg({ tipo: "sucesso", texto: "Senha alterada com sucesso." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Trocar minha senha</h1>
      {usuario && (
        <p className="text-sm text-gray-600">
          Usuário: <strong>{usuario.login}</strong> ({usuario.nome})
        </p>
      )}
      <Cartao>
        <form onSubmit={salvar} className="space-y-4">
          <Campo rotulo="Senha atual">
            <Entrada type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required />
          </Campo>
          <Campo rotulo="Nova senha" ajuda="Mínimo de 6 caracteres.">
            <Entrada type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required />
          </Campo>
          <Campo rotulo="Confirmar nova senha">
            <Entrada type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" required />
          </Campo>
          {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
          <Botao type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar nova senha"}</Botao>
        </form>
      </Cartao>
    </div>
  );
}
