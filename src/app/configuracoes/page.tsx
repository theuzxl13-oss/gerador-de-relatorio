import { TelaConfiguracoes } from "@/components/TelaConfiguracoes";
import { exigirPagina } from "@/server/pagina";

export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  await exigirPagina("ADMIN");
  return <TelaConfiguracoes />;
}
