import { repositorio } from "@/server/db";
import { naoEncontrado } from "@/server/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const a = await repositorio().obterAnexo(id).catch(() => null);
  if (!a) return naoEncontrado("Imagem não encontrada.");
  return new Response(new Uint8Array(a.dados), {
    headers: {
      "Content-Type": a.tipo,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
