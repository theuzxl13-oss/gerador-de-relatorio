import { redirect } from "next/navigation";
import { usuarioAtual } from "@/server/auth";
import { FormularioLogin } from "@/components/FormularioLogin";

export const dynamic = "force-dynamic";

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  const destino = voltar && /^\/(?![\/\\])/.test(voltar) && !/[\\\s]/.test(voltar) ? voltar : "/";
  if (await usuarioAtual().catch(() => null)) redirect(destino);
  return <FormularioLogin destino={destino} />;
}
