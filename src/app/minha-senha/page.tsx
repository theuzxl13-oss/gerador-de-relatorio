import { TelaMinhaSenha } from "@/components/TelaMinhaSenha";
import { exigirPagina } from "@/server/pagina";

export const dynamic = "force-dynamic";

export default async function PaginaMinhaSenha() {
  await exigirPagina();
  return <TelaMinhaSenha />;
}
