"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Logo oficial. Usa /logo.png (arquivo original, quando colocado na pasta
 * public/) e, na ausência dele, a versão vetorial /logo.svg.
 */
export function Logo({ className = "h-12 w-12" }: { className?: string }) {
  const [src, setSrc] = useState("/logo.png");
  const ref = useRef<HTMLImageElement>(null);

  // O erro de carregamento pode ocorrer antes da hidratação do React.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setSrc("/logo.svg");
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt="Fazenda da Ilha – Condomínio Residencial"
      className={`${className} rounded-md object-contain`}
      onError={() => setSrc("/logo.svg")}
    />
  );
}
