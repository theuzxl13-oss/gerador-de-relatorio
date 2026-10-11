import { repositorio } from "@/server/db";
import { exigirUsuario } from "@/server/auth";
import { responder } from "@/server/api";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return responder(async () => {
    await exigirUsuario("ADMIN");
    return repositorio().excluirNorma(decodeURIComponent(id));
  });
}
