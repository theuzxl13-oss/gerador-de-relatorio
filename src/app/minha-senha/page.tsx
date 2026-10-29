import { TelaMinhaSenha } from "@/components/TelaMinhaSenha";
import { exigirPagina } from "@/server/pagina";

export const dynamic = "force-dynamic";

export default async function PaginaMinhaSenha() {
  const u = await exigirPagina(undefined, { permitirSenhaProvisoria: true });
  return <TelaMinhaSenha obrigatoria={!!u.trocarSenha} />;
}
