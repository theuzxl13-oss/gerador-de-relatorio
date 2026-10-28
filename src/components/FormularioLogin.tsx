"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { Aviso, Botao, Campo, Entrada } from "./ui";

export function FormularioLogin({ destino }: { destino: string }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEntrando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível entrar.");
      window.location.href = destino;
    } catch (e) {
      setErro((e as Error).message);
      setEntrando(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-sm sm:mt-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="h-24 w-auto" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Relatórios de Ocorrências</h1>
        <p className="text-sm italic text-marca-700">Onde morar é viver!</p>
      </div>
      <form onSubmit={entrar} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Campo rotulo="Usuário">
          <Entrada value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus required />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </Campo>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" className="w-full" disabled={entrando}>
          {entrando ? "Entrando..." : "Entrar"}
        </Botao>
      </form>
      <p className="mt-4 text-center text-xs text-gray-500">Esqueceu a senha? Peça ao administrador para redefini-la.</p>
    </div>
  );
}
