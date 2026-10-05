import { repositorio } from "@/server/db";
import { responder } from "@/server/api";

export const dynamic = "force-dynamic";

/** Restaura a Base Normativa original extraída dos PDFs. */
export async function POST() {
  return responder(() => repositorio().restaurarNormas());
}
