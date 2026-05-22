import {
  AIUnavailableError,
  aiProviderInfo,
  describeAIError,
  getTextClient,
} from "./client";
import { withCoachPersonality } from "@/lib/coach/personalities";
import type { Profile } from "@/types/database";
import type { DaySummary } from "@/types";

export interface InsightContext {
  profile: Pick<
    Profile,
    | "goal"
    | "calorie_target"
    | "protein_target_g"
    | "carbs_target_g"
    | "fat_target_g"
    | "weight_kg"
    | "coach_personality"
  >;
  summary: DaySummary;
}

/** Returned by AI text helpers. `ok` differentiates real responses from fallbacks. */
export interface AITextResult {
  ok: boolean;
  content: string;
  /** "unavailable" when no API key, "failed" on provider errors. */
  reason?: "unavailable" | "failed";
}

const INSIGHT_BASE = `Você é um coach de nutrição e treino do app TreinoHG.
Sua resposta deve ter no máximo 2 frases curtas em português brasileiro,
focadas em ações concretas baseadas nos dados do dia. Sem emojis.`;

const CHAT_BASE = `Você é o coach IA do TreinoHG, um app de nutrição e treino.
Responda em português brasileiro, no máximo 4 frases. Foque em ações
concretas. Sem emojis. Quando útil, sugira ajustes em refeições,
macros ou treino.`;

const MOTIVATION_BASE =
  "Gere uma frase curta e potente de motivação fitness em português brasileiro. Máximo 12 palavras. Sem emojis.";

const MEAL_FEEDBACK_BASE = `Você é o coach IA do TreinoHG analisando uma refeição
recém-registrada. Comente em uma frase curta (máximo 18 palavras) em
português brasileiro. Foque em utilidade prática (macro destacado, ajuste
sugerido, ou validação) sem clichês. Sem emojis.`;

/**
 * Internal helper: run a chat completion against the active TEXT provider
 * (LLM7 → TEXT_AI fallback). Never throws — every failure mode is encoded
 * into the returned `AITextResult` so callers can branch on `result.ok`
 * and `result.reason`.
 *
 * Always logs which provider/model was used and how long the request took
 * so production failures are debuggable from the route logs.
 */
async function safeChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { temperature?: number; max_tokens?: number; label?: string } = {},
): Promise<AITextResult> {
  const label = opts.label ?? "chat";
  let handle;
  try {
    handle = getTextClient();
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      console.warn(
        `[ai:${label}] text provider unavailable: ${describeAIError(err)}`,
      );
      return { ok: false, content: "", reason: "unavailable" };
    }
    console.error(
      `[ai:${label}] text provider init failed: ${describeAIError(err)}`,
    );
    return { ok: false, content: "", reason: "failed" };
  }
  const provider = aiProviderInfo("text");
  const t0 = Date.now();
  try {
    const completion = await handle.client.chat.completions.create({
      model: handle.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 280,
    });
    const elapsed = Date.now() - t0;
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    console.info(
      `[ai:${label}] ok in ${elapsed}ms (provider=${provider.provider}, model=${provider.model}, len=${content.length})`,
    );
    if (!content) {
      // Provider returned 200 but with no message content — treat as a
      // soft failure so the route surfaces it instead of caching empty.
      return { ok: false, content: "", reason: "failed" };
    }
    return { ok: true, content };
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.error(
      `[ai:${label}] request failed after ${elapsed}ms (provider=${provider.provider}, model=${provider.model}): ${describeAIError(err)}`,
    );
    return { ok: false, content: "", reason: "failed" };
  }
}

export async function generateDayInsight(
  ctx: InsightContext,
): Promise<AITextResult> {
  const userMsg = `Meta diária: ${ctx.profile.calorie_target ?? "não definida"} kcal.
Objetivo: ${ctx.profile.goal ?? "não definido"}.
Hoje: consumiu ${ctx.summary.consumed_kcal} kcal, queimou ${ctx.summary.burned_kcal} kcal, saldo líquido ${ctx.summary.net_kcal} kcal.
Macros consumidos: ${ctx.summary.protein_g}g proteína, ${ctx.summary.carbs_g}g carbo, ${ctx.summary.fat_g}g gordura.
Refeições: ${ctx.summary.meal_count}. Treinos: ${ctx.summary.workout_count} (${ctx.summary.workout_minutes} min).
Dê um insight curto e útil para o usuário hoje.`;

  return safeChat(
    [
      {
        role: "system",
        content: withCoachPersonality(
          INSIGHT_BASE,
          ctx.profile.coach_personality,
        ),
      },
      { role: "user", content: userMsg },
    ],
    { temperature: 0.7, max_tokens: 160, label: "insight" },
  );
}

export async function answerCoachQuestion(
  question: string,
  ctx?: InsightContext,
): Promise<AITextResult> {
  const sysContext = ctx
    ? `\nContexto do usuário:\nMeta: ${ctx.profile.calorie_target} kcal, objetivo ${ctx.profile.goal}.\nHoje: ${ctx.summary.consumed_kcal} kcal consumidas, ${ctx.summary.burned_kcal} kcal queimadas.`
    : "";

  return safeChat(
    [
      {
        role: "system",
        content: withCoachPersonality(
          CHAT_BASE + sysContext,
          ctx?.profile.coach_personality,
        ),
      },
      { role: "user", content: question },
    ],
    { temperature: 0.7, max_tokens: 280, label: "chat" },
  );
}

export async function generateMotivationalLine(
  goal: string | null,
  personality?: string | null,
): Promise<AITextResult> {
  return safeChat(
    [
      {
        role: "system",
        content: withCoachPersonality(MOTIVATION_BASE, personality),
      },
      {
        role: "user",
        content: `Objetivo do usuário: ${goal ?? "performance"}. Gere a frase de hoje.`,
      },
    ],
    { temperature: 0.9, max_tokens: 60, label: "motivation" },
  );
}

/**
 * Generates a one-line meal feedback comment in the user's chosen tone.
 * Used right after a meal is saved (optional surface), and any future
 * feedback flow that wants tone-aware copy.
 */
export async function generateMealFeedback(args: {
  personality?: string | null;
  meal_summary: string;
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}): Promise<AITextResult> {
  const userMsg = `Refeição: ${args.meal_summary}. Totais: ${Math.round(args.totals.calories)} kcal, ${Math.round(args.totals.protein_g)}g proteína, ${Math.round(args.totals.carbs_g)}g carbo, ${Math.round(args.totals.fat_g)}g gordura. Comente em uma frase curta.`;
  return safeChat(
    [
      {
        role: "system",
        content: withCoachPersonality(MEAL_FEEDBACK_BASE, args.personality),
      },
      { role: "user", content: userMsg },
    ],
    { temperature: 0.7, max_tokens: 80, label: "meal-feedback" },
  );
}
