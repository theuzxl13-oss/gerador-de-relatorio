import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Registro não encontrado</h1>
      <p className="mt-2 text-sm text-gray-600">A ocorrência pode ter sido excluída.</p>
      <Link href="/historico" className="mt-6 inline-block font-medium text-marca-700 hover:underline">Voltar ao histórico</Link>
    </div>
  );
}
