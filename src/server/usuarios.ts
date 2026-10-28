import { PERFIS, type Perfil } from "@/lib/types";
import { ErroValidacao } from "./validacao";

export function validarDadosUsuario(b: Record<string, unknown> | null) {
  const nome = typeof b?.nome === "string" ? b.nome.trim() : "";
  const login = typeof b?.login === "string" ? b.login.trim() : "";
  const perfil = b?.perfil as Perfil;
  if (!nome || nome.length > 80) throw new ErroValidacao("Informe o nome (até 80 caracteres).");
  if (!/^[A-Za-z0-9._@-]{3,40}$/.test(login)) throw new ErroValidacao("Login inválido: use de 3 a 40 letras, números, ponto, hífen ou @, sem espaços.");
  if (!PERFIS.includes(perfil)) throw new ErroValidacao("Selecione o perfil.");
  return { nome, login, perfil, ativo: b?.ativo !== false };
}
