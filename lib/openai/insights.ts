import { getOpenAI, OPENAI_MODEL } from "./client";
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
  >;
  summary: DaySummary;
}

const INSIGHT_SYSTEM = `Você é um coach de nutrição e treino direto, prático e motivador.
Sua resposta deve ter no máximo 2 frases curtas em português brasileiro.
Tom: firme, claro, performático, sem clichês. Não use emojis.
Foque em ações concretas baseadas nos dados do dia.`;

export async function generateDayInsight(ctx: InsightContext): Promise<string> {
  const client = getOpenAI();
  const userMsg = `Meta diária: ${ctx.profile.calorie_target ?? "não definida"} kcal.
Objetivo: ${ctx.profile.goal ?? "não definido"}.
Hoje: consumiu ${ctx.summary.consumed_kcal} kcal, queimou ${ctx.summary.burned_kcal} kcal, saldo líquido ${ctx.summary.net_kcal} kcal.
Macros consumidos: ${ctx.summary.protein_g}g proteína, ${ctx.summary.carbs_g}g carbo, ${ctx.summary.fat_g}g gordura.
Refeições: ${ctx.summary.meal_count}. Treinos: ${ctx.summary.workout_count} (${ctx.summary.workout_minutes} min).
Dê um insight curto e útil para o usuário hoje.`;

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: INSIGHT_SYSTEM },
      { role: "user", content: userMsg },
    ],
    temperature: 0.7,
    max_tokens: 160,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

const CHAT_SYSTEM = `Você é o coach IA do TreinoHG, um app de nutrição e treino.
Responda em português brasileiro, de forma direta, prática e motivadora.
Use no máximo 4 frases. Foque em ações concretas. Sem emojis.
Quando útil, sugira ajustes em refeições, macros ou treino.`;

export async function answerCoachQuestion(
  question: string,
  ctx?: InsightContext,
): Promise<string> {
  const client = getOpenAI();
  const sysContext = ctx
    ? `\nContexto do usuário:\nMeta: ${ctx.profile.calorie_target} kcal, objetivo ${ctx.profile.goal}.\nHoje: ${ctx.summary.consumed_kcal} kcal consumidas, ${ctx.summary.burned_kcal} kcal queimadas.`
    : "";

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: CHAT_SYSTEM + sysContext },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 280,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateMotivationalLine(
  goal: string | null,
): Promise<string> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Gere uma frase curta e potente de motivação fitness em português brasileiro. Máximo 12 palavras. Sem emojis. Tom firme, focado em disciplina e performance.",
      },
      {
        role: "user",
        content: `Objetivo do usuário: ${goal ?? "performance"}. Gere a frase de hoje.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 60,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
