import { analisarOcorrencia } from "../src/lib/analysis/engine";
import { NORMAS_ORIGINAIS } from "../src/data/normas";
const casos: [string, string?, string?][] = [
 ["Perturbação de sossego","14:40"],["Piscina suja","10:00"],["Material de construção na calçada","10:00"],
 ["Entulho em área comum"],["Obra fora do horário permitido","19:30"],["Obra","10:00"],["Veículo em alta velocidade"],["Queimada"],
 ["Som alto","23:10"],["Descarte irregular de lixo"],["Animal causando transtorno"],["Construção irregular"],
 ["som muito alto depois das 22 horas"],["jogou entulho na rua"],["material na calçada"],["deixou areia na rua"],
 ["cachorro solto sem coleira mordeu visitante"],["menor dirigindo sem habilitação"],["mato alto no terreno"],["nadando no lago"],
 ["caminhão entregando material no sábado","15:00","2026-10-03"],["xingou o porteiro"],["placa de vende-se no lote"],["soltou balão"],
];
(async()=>{for (const [t,h,d] of casos){const r=await analisarOcorrencia(t,NORMAS_ORIGINAIS,{horario:h,data:d??"2026-10-05",tratamento:"Associada"});
console.log(`${t.padEnd(45)} | ${r.encontrado?"OK ":"-- "} ${r.principal?r.principal.norma.id+" "+r.principal.confianca+" "+r.principal.pontuacao:""} | comp:${r.complementar?.norma.id??""} | outros: ${r.candidatos.slice(0,4).map(c=>c.norma.id+":"+c.confianca[0]+c.pontuacao).join(" ")}`);}})();
