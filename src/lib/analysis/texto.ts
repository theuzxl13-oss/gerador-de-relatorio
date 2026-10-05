/** Utilitários de normalização de texto em português para a busca de normas. */

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9:/\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "a o as os um uma uns umas de da do das dos em na no nas nos por pela pelo pelas pelos para pra com sem sob sobre e ou que se ao aos à as ja la la la ele ela eles elas seu sua seus suas isso isto esse essa este esta foi era estava esta estao tem ter tinha muito muita muitos muitas mais menos bem mal ja nao sim quando onde como depois antes apos ate entre desde todo toda todos todas qualquer outro outra outros outras mesmo mesma lhe lhes me te nos vos meu minha teu tua dele dela deles delas aqui ali hoje ontem horas hora h rua casa lote quadra associado associada morador moradora proprietario proprietaria visitante funcionario funcionaria pessoa senhor senhora sr sra".split(
    " ",
  ),
);

export function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Radical simplificado: remove plural e limita o tamanho para aproximar flexões. */
export function radical(token: string): string {
  let t = token;
  if (t.length > 3 && t.endsWith("ns")) t = t.slice(0, -2) + "m";
  else if (t.length > 4 && t.endsWith("oes")) t = t.slice(0, -3) + "ao";
  else if (t.length > 4 && t.endsWith("es")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s")) t = t.slice(0, -1);
  return t.length > 5 ? t.slice(0, 5) : t;
}

/**
 * Verifica se um termo do dicionário ocorre no texto normalizado.
 * Termos terminados em "*" casam com qualquer palavra iniciada pelo prefixo.
 */
export function contemTermo(textoNormalizado: string, termo: string): boolean {
  const prefixo = termo.endsWith("*");
  const t = normalizar(prefixo ? termo.slice(0, -1) : termo);
  if (!t) return false;
  const escapado = t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const re = new RegExp(`(^|[^a-z0-9])${escapado}${prefixo ? "[a-z0-9]*" : ""}($|[^a-z0-9])`);
  return re.test(textoNormalizado);
}

/** Converte "HH:MM" em minutos desde 00:00. Retorna null se inválido. */
export function minutos(horario?: string): number | null {
  if (!horario) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
