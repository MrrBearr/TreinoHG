/**
 * Curated subset of the TACO (Tabela Brasileira de Composição de Alimentos,
 * UNICAMP, 4ª ed.) and TBCA (FCF/USP) tables.
 *
 * Values are per 100g unless `is_liquid` is true, in which case they're per
 * 100ml. We intentionally keep this dataset small (~100 entries) and
 * curated rather than shipping the full CSV — these foods cover the vast
 * majority of meals Brazilians log day-to-day. Anything missing falls
 * through to the USDA layer and finally to the AI estimator.
 *
 * Sources cross-checked against published TACO 4ª ed. averages and TBCA.
 * Numbers are rounded to one decimal — overall granularity is ±5 kcal which
 * is well within the noise of any real-world portion estimate.
 */

import type { TacoEntry } from "./types";

export const TACO_DATASET: readonly TacoEntry[] = [
  // ============== Cereais, pães, massas ==============
  {
    name: "Arroz branco cozido",
    aliases: ["arroz branco cozido", "arroz cozido", "arroz branco", "arroz"],
    kcal_per_100: 128,
    protein_per_100: 2.5,
    carbs_per_100: 28.1,
    fat_per_100: 0.2,
  },
  {
    name: "Arroz integral cozido",
    aliases: ["arroz integral cozido", "arroz integral"],
    kcal_per_100: 124,
    protein_per_100: 2.6,
    carbs_per_100: 25.8,
    fat_per_100: 1.0,
  },
  {
    name: "Macarrão cozido",
    aliases: [
      "macarrao cozido",
      "macarrao",
      "massa cozida",
      "espaguete cozido",
      "penne cozido",
      "macarrao branco",
    ],
    kcal_per_100: 158,
    protein_per_100: 5.8,
    carbs_per_100: 30.9,
    fat_per_100: 0.9,
  },
  {
    name: "Pão francês",
    aliases: ["pao frances", "pao", "pao branco", "pao de sal"],
    kcal_per_100: 300,
    protein_per_100: 8.0,
    carbs_per_100: 58.6,
    fat_per_100: 3.1,
    unit_g: 50,
  },
  {
    name: "Pão de forma",
    aliases: ["pao de forma", "pao de sanduiche", "pao de sanduíche"],
    kcal_per_100: 253,
    protein_per_100: 9.0,
    carbs_per_100: 49.1,
    fat_per_100: 3.0,
    unit_g: 25,
  },
  {
    name: "Pão integral",
    aliases: ["pao integral", "pao integral fatiado"],
    kcal_per_100: 247,
    protein_per_100: 9.4,
    carbs_per_100: 47.0,
    fat_per_100: 3.0,
    unit_g: 25,
  },
  {
    name: "Tapioca",
    aliases: ["tapioca", "goma de tapioca", "beiju"],
    kcal_per_100: 348,
    protein_per_100: 0.4,
    carbs_per_100: 86.4,
    fat_per_100: 0.0,
  },
  {
    name: "Aveia em flocos",
    aliases: ["aveia", "aveia em flocos", "flocos de aveia"],
    kcal_per_100: 394,
    protein_per_100: 13.9,
    carbs_per_100: 66.6,
    fat_per_100: 8.5,
  },
  {
    name: "Granola",
    aliases: ["granola"],
    kcal_per_100: 471,
    protein_per_100: 9.7,
    carbs_per_100: 67.0,
    fat_per_100: 19.0,
  },
  {
    name: "Cuscuz de milho",
    aliases: ["cuscuz", "cuscuz de milho", "cuscuz nordestino"],
    kcal_per_100: 113,
    protein_per_100: 2.2,
    carbs_per_100: 25.0,
    fat_per_100: 0.4,
  },
  {
    name: "Farinha de mandioca",
    aliases: ["farinha de mandioca", "farofa pronta"],
    kcal_per_100: 365,
    protein_per_100: 1.6,
    carbs_per_100: 87.9,
    fat_per_100: 0.3,
  },
  {
    name: "Polenta cozida",
    aliases: ["polenta", "polenta cozida"],
    kcal_per_100: 100,
    protein_per_100: 2.4,
    carbs_per_100: 22.0,
    fat_per_100: 0.4,
  },

  // ============== Leguminosas ==============
  {
    name: "Feijão preto cozido",
    aliases: ["feijao preto cozido", "feijao preto"],
    kcal_per_100: 77,
    protein_per_100: 4.5,
    carbs_per_100: 14.0,
    fat_per_100: 0.5,
  },
  {
    name: "Feijão carioca cozido",
    aliases: ["feijao carioca cozido", "feijao carioca", "feijao", "feijao cozido"],
    kcal_per_100: 76,
    protein_per_100: 4.8,
    carbs_per_100: 13.6,
    fat_per_100: 0.5,
  },
  {
    name: "Feijoada",
    aliases: ["feijoada"],
    kcal_per_100: 117,
    protein_per_100: 7.5,
    carbs_per_100: 7.4,
    fat_per_100: 6.2,
  },
  {
    name: "Lentilha cozida",
    aliases: ["lentilha cozida", "lentilha"],
    kcal_per_100: 93,
    protein_per_100: 6.3,
    carbs_per_100: 16.3,
    fat_per_100: 0.5,
  },
  {
    name: "Grão de bico cozido",
    aliases: ["grao de bico", "grao de bico cozido"],
    kcal_per_100: 121,
    protein_per_100: 7.8,
    carbs_per_100: 19.7,
    fat_per_100: 2.1,
  },
  {
    name: "Soja cozida",
    aliases: ["soja", "soja cozida"],
    kcal_per_100: 142,
    protein_per_100: 12.5,
    carbs_per_100: 9.9,
    fat_per_100: 6.5,
  },

  // ============== Carnes / frango / peixes ==============
  {
    name: "Peito de frango grelhado",
    aliases: [
      "peito de frango grelhado",
      "peito de frango",
      "frango grelhado",
      "frango assado",
      "frango cozido",
      "frango",
    ],
    kcal_per_100: 165,
    protein_per_100: 31.0,
    carbs_per_100: 0.0,
    fat_per_100: 3.6,
  },
  {
    name: "Coxa de frango assada",
    aliases: ["coxa de frango", "sobrecoxa", "frango com pele"],
    kcal_per_100: 215,
    protein_per_100: 26.0,
    carbs_per_100: 0.0,
    fat_per_100: 12.0,
  },
  {
    name: "Carne moída magra",
    aliases: ["carne moida", "carne moida magra", "patinho moido"],
    kcal_per_100: 212,
    protein_per_100: 26.7,
    carbs_per_100: 0.0,
    fat_per_100: 11.8,
  },
  {
    name: "Bife de patinho grelhado",
    aliases: ["bife", "bife grelhado", "patinho grelhado", "patinho", "carne grelhada"],
    kcal_per_100: 219,
    protein_per_100: 35.9,
    carbs_per_100: 0.0,
    fat_per_100: 7.3,
  },
  {
    name: "Picanha grelhada",
    aliases: ["picanha", "picanha grelhada"],
    kcal_per_100: 290,
    protein_per_100: 26.5,
    carbs_per_100: 0.0,
    fat_per_100: 20.5,
  },
  {
    name: "Linguiça calabresa",
    aliases: ["calabresa", "linguica calabresa", "linguica"],
    kcal_per_100: 304,
    protein_per_100: 14.1,
    carbs_per_100: 1.9,
    fat_per_100: 26.6,
  },
  {
    name: "Salsicha",
    aliases: ["salsicha"],
    kcal_per_100: 257,
    protein_per_100: 13.0,
    carbs_per_100: 4.0,
    fat_per_100: 21.5,
    unit_g: 50,
  },
  {
    name: "Bacon",
    aliases: ["bacon"],
    kcal_per_100: 541,
    protein_per_100: 37.0,
    carbs_per_100: 1.4,
    fat_per_100: 41.8,
  },
  {
    name: "Tilápia grelhada",
    aliases: ["tilapia", "tilapia grelhada", "peixe branco"],
    kcal_per_100: 129,
    protein_per_100: 26.2,
    carbs_per_100: 0.0,
    fat_per_100: 2.7,
  },
  {
    name: "Salmão grelhado",
    aliases: ["salmao", "salmao grelhado"],
    kcal_per_100: 211,
    protein_per_100: 22.3,
    carbs_per_100: 0.0,
    fat_per_100: 13.4,
  },
  {
    name: "Atum em conserva",
    aliases: ["atum", "atum em conserva", "atum lata"],
    kcal_per_100: 139,
    protein_per_100: 23.0,
    carbs_per_100: 0.0,
    fat_per_100: 4.8,
  },

  // ============== Ovos / laticínios ==============
  {
    name: "Ovo de galinha cozido",
    aliases: ["ovo cozido", "ovo", "ovos cozidos", "ovo de galinha"],
    kcal_per_100: 146,
    protein_per_100: 13.3,
    carbs_per_100: 0.6,
    fat_per_100: 9.5,
    unit_g: 50,
  },
  {
    name: "Ovo frito",
    aliases: ["ovo frito", "ovos fritos"],
    kcal_per_100: 196,
    protein_per_100: 13.6,
    carbs_per_100: 0.4,
    fat_per_100: 15.3,
    unit_g: 55,
  },
  {
    name: "Clara de ovo cozida",
    aliases: ["clara de ovo", "claras", "clara"],
    kcal_per_100: 52,
    protein_per_100: 10.9,
    carbs_per_100: 0.7,
    fat_per_100: 0.2,
    unit_g: 33,
  },
  {
    name: "Leite integral",
    aliases: ["leite integral", "leite"],
    kcal_per_100: 61,
    protein_per_100: 2.9,
    carbs_per_100: 4.3,
    fat_per_100: 3.5,
    is_liquid: true,
  },
  {
    name: "Leite desnatado",
    aliases: ["leite desnatado"],
    kcal_per_100: 35,
    protein_per_100: 3.4,
    carbs_per_100: 4.9,
    fat_per_100: 0.1,
    is_liquid: true,
  },
  {
    name: "Iogurte natural integral",
    aliases: ["iogurte natural", "iogurte", "iogurte integral"],
    kcal_per_100: 51,
    protein_per_100: 4.1,
    carbs_per_100: 1.9,
    fat_per_100: 3.0,
    is_liquid: true,
  },
  {
    name: "Iogurte grego",
    aliases: ["iogurte grego", "grego"],
    kcal_per_100: 130,
    protein_per_100: 4.7,
    carbs_per_100: 14.5,
    fat_per_100: 5.9,
    is_liquid: true,
  },
  {
    name: "Queijo minas frescal",
    aliases: ["queijo minas", "queijo minas frescal", "queijo branco"],
    kcal_per_100: 240,
    protein_per_100: 17.4,
    carbs_per_100: 3.2,
    fat_per_100: 17.9,
  },
  {
    name: "Mussarela",
    aliases: ["mussarela", "muçarela", "mozzarella"],
    kcal_per_100: 280,
    protein_per_100: 22.0,
    carbs_per_100: 3.0,
    fat_per_100: 21.0,
  },
  {
    name: "Requeijão cremoso",
    aliases: ["requeijao", "requeijao cremoso"],
    kcal_per_100: 257,
    protein_per_100: 9.6,
    carbs_per_100: 3.0,
    fat_per_100: 23.0,
  },
  {
    name: "Manteiga",
    aliases: ["manteiga"],
    kcal_per_100: 717,
    protein_per_100: 0.6,
    carbs_per_100: 0.3,
    fat_per_100: 81.1,
  },

  // ============== Frutas ==============
  {
    name: "Banana prata",
    aliases: ["banana", "banana prata", "banana nanica"],
    kcal_per_100: 98,
    protein_per_100: 1.3,
    carbs_per_100: 26.0,
    fat_per_100: 0.1,
    unit_g: 90,
  },
  {
    name: "Maçã",
    aliases: ["maca", "maçã"],
    kcal_per_100: 56,
    protein_per_100: 0.3,
    carbs_per_100: 15.2,
    fat_per_100: 0.4,
    unit_g: 130,
  },
  {
    name: "Laranja pera",
    aliases: ["laranja", "laranja pera"],
    kcal_per_100: 37,
    protein_per_100: 1.0,
    carbs_per_100: 8.7,
    fat_per_100: 0.1,
    unit_g: 130,
  },
  {
    name: "Mamão papaya",
    aliases: ["mamao", "mamao papaya", "papaia"],
    kcal_per_100: 45,
    protein_per_100: 0.8,
    carbs_per_100: 11.6,
    fat_per_100: 0.1,
  },
  {
    name: "Manga",
    aliases: ["manga"],
    kcal_per_100: 64,
    protein_per_100: 0.9,
    carbs_per_100: 16.7,
    fat_per_100: 0.2,
  },
  {
    name: "Abacate",
    aliases: ["abacate"],
    kcal_per_100: 96,
    protein_per_100: 1.2,
    carbs_per_100: 6.0,
    fat_per_100: 8.4,
  },
  {
    name: "Morango",
    aliases: ["morango", "morangos"],
    kcal_per_100: 30,
    protein_per_100: 0.7,
    carbs_per_100: 6.8,
    fat_per_100: 0.3,
  },
  {
    name: "Uva",
    aliases: ["uva", "uvas"],
    kcal_per_100: 67,
    protein_per_100: 0.7,
    carbs_per_100: 17.2,
    fat_per_100: 0.2,
  },
  {
    name: "Melancia",
    aliases: ["melancia"],
    kcal_per_100: 30,
    protein_per_100: 0.6,
    carbs_per_100: 7.6,
    fat_per_100: 0.2,
  },
  {
    name: "Abacaxi",
    aliases: ["abacaxi"],
    kcal_per_100: 50,
    protein_per_100: 0.5,
    carbs_per_100: 13.1,
    fat_per_100: 0.1,
  },

  // ============== Vegetais / saladas ==============
  {
    name: "Alface",
    aliases: ["alface", "alface lisa", "alface crespa"],
    kcal_per_100: 11,
    protein_per_100: 1.4,
    carbs_per_100: 1.7,
    fat_per_100: 0.2,
  },
  {
    name: "Tomate",
    aliases: ["tomate"],
    kcal_per_100: 18,
    protein_per_100: 0.9,
    carbs_per_100: 3.9,
    fat_per_100: 0.2,
  },
  {
    name: "Cenoura crua",
    aliases: ["cenoura", "cenoura crua"],
    kcal_per_100: 41,
    protein_per_100: 0.9,
    carbs_per_100: 9.6,
    fat_per_100: 0.2,
  },
  {
    name: "Brócolis cozido",
    aliases: ["brocolis", "brocolis cozido"],
    kcal_per_100: 35,
    protein_per_100: 2.4,
    carbs_per_100: 7.2,
    fat_per_100: 0.4,
  },
  {
    name: "Couve refogada",
    aliases: ["couve", "couve refogada", "couve mineira"],
    kcal_per_100: 90,
    protein_per_100: 2.9,
    carbs_per_100: 6.8,
    fat_per_100: 6.0,
  },
  {
    name: "Batata cozida",
    aliases: ["batata", "batata cozida", "batata inglesa"],
    kcal_per_100: 86,
    protein_per_100: 1.7,
    carbs_per_100: 19.0,
    fat_per_100: 0.1,
  },
  {
    name: "Batata frita",
    aliases: ["batata frita", "fritas"],
    kcal_per_100: 312,
    protein_per_100: 4.0,
    carbs_per_100: 41.0,
    fat_per_100: 14.7,
  },
  {
    name: "Mandioca cozida",
    aliases: ["mandioca", "mandioca cozida", "aipim", "macaxeira"],
    kcal_per_100: 125,
    protein_per_100: 0.6,
    carbs_per_100: 30.1,
    fat_per_100: 0.3,
  },
  {
    name: "Batata-doce cozida",
    aliases: ["batata doce", "batata-doce", "batata doce cozida"],
    kcal_per_100: 77,
    protein_per_100: 0.6,
    carbs_per_100: 18.4,
    fat_per_100: 0.1,
  },
  {
    name: "Mandioquinha cozida",
    aliases: ["mandioquinha", "batata baroa"],
    kcal_per_100: 80,
    protein_per_100: 1.4,
    carbs_per_100: 18.5,
    fat_per_100: 0.2,
  },

  // ============== Pratos brasileiros / lanches ==============
  {
    name: "Pão de queijo",
    aliases: ["pao de queijo"],
    kcal_per_100: 363,
    protein_per_100: 5.4,
    carbs_per_100: 41.0,
    fat_per_100: 19.5,
    unit_g: 25,
  },
  {
    name: "Coxinha de frango",
    aliases: ["coxinha", "coxinha de frango"],
    kcal_per_100: 282,
    protein_per_100: 9.5,
    carbs_per_100: 28.0,
    fat_per_100: 14.5,
    unit_g: 80,
  },
  {
    name: "Esfiha de carne",
    aliases: ["esfiha", "esfirra", "esfiha de carne"],
    kcal_per_100: 275,
    protein_per_100: 11.0,
    carbs_per_100: 32.0,
    fat_per_100: 11.0,
    unit_g: 70,
  },
  {
    name: "Pastel de carne",
    aliases: ["pastel", "pastel de carne", "pastel de feira"],
    kcal_per_100: 320,
    protein_per_100: 10.5,
    carbs_per_100: 26.0,
    fat_per_100: 19.0,
    unit_g: 100,
  },
  {
    name: "Hambúrguer caseiro",
    aliases: ["hamburguer", "burger", "hamburguer caseiro"],
    kcal_per_100: 295,
    protein_per_100: 17.0,
    carbs_per_100: 18.0,
    fat_per_100: 16.5,
    unit_g: 220,
  },
  {
    name: "X-burger",
    aliases: ["xburger", "x-burger", "x burguer"],
    kcal_per_100: 270,
    protein_per_100: 14.5,
    carbs_per_100: 21.0,
    fat_per_100: 14.0,
    unit_g: 200,
  },
  {
    name: "Pizza de mussarela",
    aliases: ["pizza", "pizza muçarela", "pizza mussarela"],
    kcal_per_100: 240,
    protein_per_100: 11.0,
    carbs_per_100: 28.0,
    fat_per_100: 9.5,
    unit_g: 110, // typical fatia
  },
  {
    name: "Lasanha à bolonhesa",
    aliases: ["lasanha", "lasanha bolonhesa"],
    kcal_per_100: 145,
    protein_per_100: 7.5,
    carbs_per_100: 14.0,
    fat_per_100: 6.5,
  },
  {
    name: "Estrogonofe de frango",
    aliases: ["estrogonofe", "stroganoff", "strogonoff"],
    kcal_per_100: 165,
    protein_per_100: 11.5,
    carbs_per_100: 5.0,
    fat_per_100: 11.0,
  },
  {
    name: "Açaí na tigela com granola",
    aliases: ["acai", "acai na tigela", "tigela de acai"],
    kcal_per_100: 175,
    protein_per_100: 1.6,
    carbs_per_100: 24.0,
    fat_per_100: 8.0,
  },

  // ============== Bebidas / doces ==============
  {
    name: "Café preto sem açúcar",
    aliases: ["cafe", "cafe preto", "cafe sem acucar"],
    kcal_per_100: 1,
    protein_per_100: 0.1,
    carbs_per_100: 0.0,
    fat_per_100: 0.0,
    is_liquid: true,
  },
  {
    name: "Suco de laranja natural",
    aliases: ["suco de laranja", "suco laranja natural"],
    kcal_per_100: 41,
    protein_per_100: 0.6,
    carbs_per_100: 9.7,
    fat_per_100: 0.1,
    is_liquid: true,
  },
  {
    name: "Refrigerante de cola",
    aliases: ["coca cola", "coca-cola", "refrigerante", "refri"],
    kcal_per_100: 42,
    protein_per_100: 0.0,
    carbs_per_100: 10.6,
    fat_per_100: 0.0,
    is_liquid: true,
  },
  {
    name: "Cerveja",
    aliases: ["cerveja", "chopp", "lager"],
    kcal_per_100: 43,
    protein_per_100: 0.5,
    carbs_per_100: 3.6,
    fat_per_100: 0.0,
    is_liquid: true,
  },
  {
    name: "Whey protein",
    aliases: ["whey", "whey protein", "shake de whey"],
    kcal_per_100: 380,
    protein_per_100: 76.0,
    carbs_per_100: 8.0,
    fat_per_100: 6.0,
  },
  {
    name: "Brigadeiro",
    aliases: ["brigadeiro"],
    kcal_per_100: 380,
    protein_per_100: 5.0,
    carbs_per_100: 60.0,
    fat_per_100: 13.0,
    unit_g: 25,
  },

  // ============== Óleos / temperos / extras ==============
  {
    name: "Azeite de oliva",
    aliases: ["azeite", "azeite de oliva", "oleo de oliva"],
    kcal_per_100: 884,
    protein_per_100: 0.0,
    carbs_per_100: 0.0,
    fat_per_100: 100.0,
    is_liquid: true,
  },
  {
    name: "Óleo de soja",
    aliases: ["oleo", "oleo de soja", "oleo vegetal"],
    kcal_per_100: 884,
    protein_per_100: 0.0,
    carbs_per_100: 0.0,
    fat_per_100: 100.0,
    is_liquid: true,
  },
  {
    name: "Açúcar refinado",
    aliases: ["acucar", "açúcar", "acucar refinado"],
    kcal_per_100: 387,
    protein_per_100: 0.0,
    carbs_per_100: 99.5,
    fat_per_100: 0.0,
  },
  {
    name: "Pasta de amendoim",
    aliases: ["pasta de amendoim", "peanut butter"],
    kcal_per_100: 588,
    protein_per_100: 25.0,
    carbs_per_100: 20.0,
    fat_per_100: 50.0,
  },
  {
    name: "Castanha do pará",
    aliases: ["castanha do para", "castanha-do-para"],
    kcal_per_100: 656,
    protein_per_100: 14.5,
    carbs_per_100: 12.3,
    fat_per_100: 66.0,
  },
];

/**
 * Normalize a name for fuzzy matching: lowercase, strip diacritics, collapse
 * whitespace, drop common filler words ("de", "da", "do", "com", "sem").
 */
export function normalizeFoodName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(de|da|do|com|sem|e|o|a|os|as|um|uma|no|na|em|integral|natural)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Look up a TACO entry by free-text food name. Returns the best alias match
 * — preferring whole-word equality, then containment. We never return a
 * speculative match: if no alias is at least token-equal or fully contained,
 * the function returns null and the resolver moves on to USDA / AI.
 */
export function findTacoEntry(name: string): TacoEntry | null {
  const norm = normalizeFoodName(name);
  if (!norm) return null;
  const tokens = new Set(norm.split(" "));

  let exact: TacoEntry | null = null;
  let contains: { entry: TacoEntry; score: number } | null = null;

  for (const entry of TACO_DATASET) {
    for (const alias of entry.aliases) {
      const aliasNorm = normalizeFoodName(alias);
      if (!aliasNorm) continue;
      if (aliasNorm === norm) return entry;

      // Exact-token match: every word of the alias is in the query.
      const aliasTokens = aliasNorm.split(" ");
      if (aliasTokens.every((t) => tokens.has(t))) {
        // Pick the alias with the most tokens (most specific) on tie.
        if (!exact || aliasTokens.length > normalizeFoodName(exact.aliases[0]).split(" ").length) {
          exact = entry;
        }
      }

      // Substring containment fallback (e.g. "frango" inside "frango assado").
      if (norm.includes(aliasNorm) || aliasNorm.includes(norm)) {
        const score = Math.min(aliasNorm.length, norm.length);
        if (!contains || score > contains.score) {
          contains = { entry, score };
        }
      }
    }
  }

  return exact ?? contains?.entry ?? null;
}
