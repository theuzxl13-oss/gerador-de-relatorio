import { TelaUsuarios } from "@/components/TelaUsuarios";
import { exigirPagina } from "@/server/pagina";

export const dynamic = "force-dynamic";

export default async function PaginaUsuarios() {
  const eu = await exigirPagina("ADMIN");
  return <TelaUsuarios meuId={eu.id} />;
}
