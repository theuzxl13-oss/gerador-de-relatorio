import { NextResponse } from "next/server";
import { ErroValidacao } from "./validacao";

/** Envolve um handler de API com tratamento padronizado de erros. */
export async function responder<T>(fn: () => Promise<T>, status = 200) {
  try {
    const dados = await fn();
    return NextResponse.json(dados ?? { ok: true }, { status });
  } catch (e) {
    if (e instanceof ErroValidacao) return NextResponse.json({ erro: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ erro: "Erro interno ao acessar o banco de dados." }, { status: 500 });
  }
}

export function naoEncontrado(msg = "Registro não encontrado.") {
  return NextResponse.json({ erro: msg }, { status: 404 });
}
