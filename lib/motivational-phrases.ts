export const MOTIVATIONAL_PHRASES = [
  "Disciplina vence motivação. Aparecer todo dia é o jogo.",
  "Pequeno hoje, gigante amanhã. Consistência é o atalho.",
  "Treino é negociação com o seu eu de amanhã.",
  "Você não precisa estar pronto. Precisa começar.",
  "Cada refeição registrada é um passo no plano.",
  "Constância é mais forte do que intensidade.",
  "Foco no processo. O resultado é consequência.",
  "O que mede, você melhora. Continue acompanhando.",
  "Progresso não é perfeição. É repetição.",
  "Hoje é o melhor dia para ser melhor que ontem.",
  "Quem decide vence quem desiste.",
  "Performance vem da rotina, não do ânimo.",
  "Você está construindo o corpo que vai te levar longe.",
  "Pequenos hábitos diários, grandes mudanças anuais.",
  "Não conte os dias. Faça os dias contarem.",
  "A versão mais forte de você está em construção.",
  "Energia gasta com qualidade volta multiplicada.",
  "Hoje você pode ser 1% melhor. Faça valer.",
  "Mente firme, corpo segue.",
  "Sua próxima refeição decide o seu próximo dia.",
  "Treino é meditação em movimento.",
  "Quem mantém o ritmo, mantém o resultado.",
  "Resultados amam quem aparece mesmo sem vontade.",
  "Sem desculpas. Apenas a próxima rep.",
  "A constância silenciosa supera o esforço barulhento.",
];

/** Deterministic daily phrase based on date string (YYYY-MM-DD) */
export function getDailyPhrase(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % MOTIVATIONAL_PHRASES.length;
  return MOTIVATIONAL_PHRASES[idx];
}

export function getRandomPhrase(): string {
  return MOTIVATIONAL_PHRASES[
    Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)
  ];
}
