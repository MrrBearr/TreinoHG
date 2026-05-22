/**
 * Coach personality system.
 *
 * Each personality is a tone profile (NOT an impersonation of a real person).
 * The selected style is injected into the AI system prompt for insights,
 * chat answers, daily summaries and meal feedback.
 *
 * Persisted in `profiles.coach_personality` and editable from the Profile page.
 */

export type CoachPersonalityId =
  | "motivator"
  | "discipline"
  | "supportive"
  | "high_energy"
  | "elite"
  | "friendly"
  | "analytical";

export interface CoachPersonality {
  /** Stable id stored in DB. */
  value: CoachPersonalityId;
  /** Short label shown in UI. */
  label: string;
  /** Single-emoji glyph used in pickers. */
  icon: string;
  /** One-line description for the picker card. */
  description: string;
  /** Prompt fragment merged into AI system prompts. Pure tone direction. */
  prompt: string;
}

export const DEFAULT_COACH_PERSONALITY: CoachPersonalityId = "motivator";

/**
 * Personality catalog. Order is the order shown to users.
 */
export const COACH_PERSONALITIES: readonly CoachPersonality[] = [
  {
    value: "motivator",
    label: "Motivador",
    icon: "💪",
    description: "Equilíbrio entre direção e incentivo. Tom padrão.",
    prompt:
      "Tom: motivador equilibrado, direto e prático. Foque em ação concreta. Seja firme mas humano. Evite clichês motivacionais e jamais desrespeite o usuário.",
  },
  {
    value: "discipline",
    label: "Disciplina dura",
    icon: "🔥",
    description: "Sem desculpas. Foco total em execução.",
    prompt:
      "Tom: disciplina rígida, sem desculpas, exigente como um técnico de alto rendimento. Frases curtas, verbos no imperativo. Foque em compromisso e execução. Nunca seja agressivo, ofensivo ou pessoalmente humilhante; firmeza não é grosseria.",
  },
  {
    value: "supportive",
    label: "Calmo e suportivo",
    icon: "🌿",
    description: "Acolhedor, paciente, sem pressão.",
    prompt:
      "Tom: calmo, paciente e acolhedor. Reconheça esforços, sugira ajustes pequenos, sem cobranças. Dê espaço para o usuário ir no próprio ritmo. Evite urgência e jamais culpabilize.",
  },
  {
    value: "high_energy",
    label: "Alta energia",
    icon: "⚡",
    description: "Vibração contagiante, empolgação real.",
    prompt:
      "Tom: alta energia, entusiasmo genuíno, contagiante. Use verbos fortes e metáforas de movimento. Mantenha foco no progresso. Evite gritos textuais (CAPS), exageros e clichês.",
  },
  {
    value: "elite",
    label: "Elite — sem desculpas",
    icon: "🏆",
    description: "Padrão de atleta de alto rendimento.",
    prompt:
      "Tom: padrão de atleta de elite. Frio, focado, exigente consigo mesmo. Pense em performance, não em sentimento. Linguagem precisa, sem floreios. Seja respeitoso; intensidade não é hostilidade.",
  },
  {
    value: "friendly",
    label: "Amigável",
    icon: "🙌",
    description: "Próximo, acessível, conversa de amigo.",
    prompt:
      "Tom: amigável e próximo, como um amigo treinado em nutrição e treino. Linguagem natural, leve, encorajadora. Evite ser excessivamente sério ou robótico.",
  },
  {
    value: "analytical",
    label: "Performance técnica",
    icon: "📊",
    description: "Dados, lógica e ajustes mensuráveis.",
    prompt:
      "Tom: técnico e analítico. Use números, percentuais e relações claras (kcal, gramas, minutos). Sugira ajustes mensuráveis. Evite linguagem emocional; foque em causa e efeito.",
  },
] as const;

const BY_ID: Record<string, CoachPersonality> = Object.fromEntries(
  COACH_PERSONALITIES.map((p) => [p.value, p]),
);

/** Resolves a stored personality id (possibly null) to its definition. */
export function resolveCoachPersonality(
  id: string | null | undefined,
): CoachPersonality {
  if (id && BY_ID[id]) return BY_ID[id];
  return BY_ID[DEFAULT_COACH_PERSONALITY];
}

/**
 * Universal guardrails appended to every personality. These are tone
 * boundaries we always enforce regardless of the user's choice.
 */
const UNIVERSAL_RULES = [
  "Sempre responda em português brasileiro.",
  "Nunca seja tóxico, ofensivo, preconceituoso ou desrespeitoso.",
  "Não dê diagnóstico médico; sugira buscar profissional quando for o caso.",
  "Nunca repita a mesma frase do dia anterior — varie a forma.",
  "Sem emojis, sem hashtags, sem gírias forçadas.",
].join(" ");

/**
 * Merge a base system prompt with the user's chosen personality.
 *
 * Returns a single combined string with: base + personality tone +
 * universal guardrails. Safe to call with null/undefined personality.
 */
export function withCoachPersonality(
  base: string,
  personalityId: string | null | undefined,
): string {
  const p = resolveCoachPersonality(personalityId);
  return `${base.trim()}\n\nPersonalidade do coach: ${p.label}.\n${p.prompt}\n\nRegras universais: ${UNIVERSAL_RULES}`;
}
