import {
  ingredientKnowledgeBase,
  strongActives,
} from "../data/ingredientKnowledgeBase";
import { getUserProfile } from "./profileService";
import { generateRecommendations } from "./recommendationEngine";
import { LesionType, UserProfile } from "../types/types";

const DISCLAIMER = "This is general skincare guidance and not a medical diagnosis.";

const lesionReplies: Record<
  LesionType,
  { recommended: string[]; avoid: string[]; explanation: string; safety?: string }
> = {
  Acne: {
    recommended: [
      "Niacinamide",
      "Salicylic Acid",
      "Benzoyl Peroxide",
      "Azelaic Acid",
      "Adapalene",
    ],
    avoid: ["heavy fragrance", "strong irritants", "unnecessary oils"],
    explanation:
      "these help oil control, clogged pores, bacteria, and visible inflammation",
  },
  Burn: {
    recommended: ["Aloe Vera", "Zinc Oxide", "Centella Asiatica", "Hyaluronic Acid"],
    avoid: ["Salicylic Acid", "Benzoyl Peroxide", "Adapalene", "Tea Tree Oil"],
    explanation:
      "burn-prone skin usually needs soothing, hydration, and barrier protection",
    safety:
      "If the burn is painful, blistering, spreading, bleeding, or severe, please seek medical advice.",
  },
  Rash: {
    recommended: ["Aloe Vera", "Zinc Oxide", "Centella Asiatica", "Hyaluronic Acid"],
    avoid: ["Salicylic Acid", "Benzoyl Peroxide", "Adapalene", "Tea Tree Oil", "Fragrance"],
    explanation:
      "rash-prone skin usually needs soothing and barrier repair",
    safety:
      "If the rash is painful, spreading, swollen, oozing, or linked with fever, please seek medical advice.",
  },
  Wart: {
    recommended: ["Salicylic Acid", "Tea Tree Oil"],
    avoid: ["moisturizer-only treatment as the main treatment", "fragrance"],
    explanation:
      "wart guidance focuses on keratolytic or removal support",
    safety:
      "If a wart is painful, spreading, bleeding, changing quickly, or near sensitive areas, please ask a dermatologist.",
  },
};

const ingredientAliases: Record<string, string[]> = {
  "Salicylic Acid": ["salicylic", "salicylic acid", "bha"],
  "Benzoyl Peroxide": ["benzoyl", "benzoyl peroxide", "bp"],
  "Tea Tree Oil": ["tea tree", "tea tree oil"],
  "Aloe Vera": ["aloe", "aloe vera"],
  "Zinc Oxide": ["zinc", "zinc oxide"],
  "Azelaic Acid": ["azelaic", "azelaic acid"],
  "Centella Asiatica": ["centella", "centella asiatica", "cica"],
  "Hyaluronic Acid": ["hyaluronic", "hyaluronic acid", "ha"],
  Niacinamide: ["niacinamide"],
  Adapalene: ["adapalene", "differin"],
  Fragrance: ["fragrance", "perfume", "parfum"],
};

const conflictMessages: Record<string, string> = {
  "Adapalene|Salicylic Acid":
    "Salicylic Acid should not be combined with Adapalene because it may increase irritation.",
  "Benzoyl Peroxide|Salicylic Acid":
    "Benzoyl Peroxide with Salicylic Acid may increase dryness and irritation.",
  "Adapalene|Benzoyl Peroxide":
    "Benzoyl Peroxide with Adapalene may reduce tolerance and increase irritation.",
  "Benzoyl Peroxide|Tea Tree Oil":
    "Tea Tree Oil with Benzoyl Peroxide may increase irritation risk because both can be drying.",
  "Adapalene|Tea Tree Oil":
    "Tea Tree Oil with Adapalene may increase irritation.",
  "Azelaic Acid|Salicylic Acid":
    "Azelaic Acid with Salicylic Acid can be a mild irritation conflict.",
  "Benzoyl Peroxide|Niacinamide":
    "Niacinamide with Benzoyl Peroxide is a caution combination; introduce slowly and monitor tolerance.",
};

export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLesionFromMessage(message: string): LesionType | null {
  const text = normalizeMessage(message);

  if (/\b(acne|pimple|pimples|breakout|breakouts)\b/.test(text)) {
    return "Acne";
  }
  if (/\b(burn|burns|skin burn|burnt)\b/.test(text)) {
    return "Burn";
  }
  if (/\b(rash|rashes|itchy rash|red rash)\b/.test(text)) {
    return "Rash";
  }
  if (/\b(wart|warts)\b/.test(text)) {
    return "Wart";
  }

  return null;
}

export function detectIngredientNames(message: string): string[] {
  const text = normalizeMessage(message);

  return Object.keys(ingredientAliases).filter((ingredient) =>
    ingredientAliases[ingredient].some((alias) => {
      const safeAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${safeAlias}\\b`).test(text);
    })
  );
}

function conflictKey(first: string, second: string): string {
  return [first, second].sort().join("|");
}

export function checkIngredientConflict(
  firstIngredient: string,
  secondIngredient: string
): string | null {
  return conflictMessages[conflictKey(firstIngredient, secondIngredient)] || null;
}

export function getIngredientsForLesion(lesion: LesionType) {
  return lesionReplies[lesion];
}

function list(items: string[]): string {
  return items.join(", ");
}

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function buildLesionReply(lesion: LesionType, profile: UserProfile): string {
  const guide = getIngredientsForLesion(lesion);
  const severityNote =
    profile.severity === "High"
      ? " Because your selected severity is High, dermatologist advice is recommended."
      : "";

  return `For ${lesion.toLowerCase()}-related skin concerns, I would prioritize ${list(
    guide.recommended
  )} because ${guide.explanation}. I would avoid strong or unsuitable ingredients such as ${list(
    guide.avoid
  )} because they may irritate the skin.${severityNote} ${
    guide.safety || ""
  } ${DISCLAIMER}`;
}

function buildWhyReply(ingredientName: string, profile: UserProfile): string {
  const result = generateRecommendations(profile);
  const recommended = result.recommended.find(
    (item) => item.name.toLowerCase() === ingredientName.toLowerCase()
  );

  if (recommended) {
    const cautions =
      recommended.cautions.length > 0
        ? ` Cautions: ${recommended.cautions.join(" ")}`
        : "";

    return `${recommended.name} was recommended because ${recommended.reason}. Benefits include ${recommended.benefits.join(
      ", "
    )}. Profile factors considered: ${recommended.profileFactorsConsidered
      .slice(0, 4)
      .join(", ")}.${cautions} ${DISCLAIMER}`;
  }

  const avoid = result.avoid.find(
    (item) => item.name.toLowerCase() === ingredientName.toLowerCase()
  );

  if (avoid) {
    return `${avoid.name} is placed in the avoid group because ${avoid.reason} ${DISCLAIMER}`;
  }

  const knowledge = ingredientKnowledgeBase.find(
    (item) => item.name.toLowerCase() === ingredientName.toLowerCase()
  );

  if (knowledge && strongActives.includes(knowledge.name)) {
    return `${knowledge.name} is a strong active ingredient. For your current lesion, severity, or sensitivity profile, it may increase irritation, so it may be placed in the avoid or caution group. ${DISCLAIMER}`;
  }

  return `I could not find ${ingredientName} in the current recommendation result. Ask about another listed ingredient. ${DISCLAIMER}`;
}

function buildAvoidReply(profile: UserProfile): string {
  const result = generateRecommendations(profile);

  if (result.avoid.length === 0) {
    return `I do not see avoid ingredients in the current result, but you should still patch test new products. ${DISCLAIMER}`;
  }

  const avoidText = result.avoid
    .map((item) => `${item.name} because ${item.reason}`)
    .join("; ");

  return `Based on the current profile, avoid: ${avoidText}. ${DISCLAIMER}`;
}

function buildConflictReply(ingredients: string[], profile: UserProfile): string {
  const result = generateRecommendations(profile);

  if (ingredients.length >= 2) {
    const conflict = checkIngredientConflict(ingredients[0], ingredients[1]);

    if (conflict) {
      return `${conflict} It is better not to layer them in the same routine unless a dermatologist advises it. ${DISCLAIMER}`;
    }

    return `I do not see a known conflict between ${ingredients[0]} and ${ingredients[1]}. Introduce them slowly and patch test first. ${DISCLAIMER}`;
  }

  if (result.conflicts.length > 0) {
    return `Current possible conflicts: ${result.conflicts.join(" ")} ${DISCLAIMER}`;
  }

  return `Please give me two ingredient names to check. Example: can I use Salicylic Acid with Adapalene? ${DISCLAIMER}`;
}

function buildAllergyReply(ingredients: string[]): string {
  if (ingredients.length === 0) {
    return `I noted that you mentioned an allergy. Please tell me the ingredient name so I can explain what to avoid. ${DISCLAIMER}`;
  }

  return `I noted that allergy. You should avoid ${ingredients[0]}, and I will exclude it from recommendations. Please update your allergy profile too if possible. ${DISCLAIMER}`;
}

function buildHistoryReply(message: string, profile: UserProfile): string {
  if (message.includes("acne")) {
    return `Family acne history noted. Acne-supportive ingredients can still be considered, but I will also check severity, irritation risk, and safety before recommending strong active ingredients. ${DISCLAIMER}`;
  }

  const previous =
    profile.previousSkinIssues.length > 0
      ? profile.previousSkinIssues.join(", ")
      : "none listed";
  const genetic =
    profile.geneticIssues.length > 0 ? profile.geneticIssues.join(", ") : "none listed";

  return `I considered previous skin issues (${previous}) and family/genetic issues (${genetic}). Sensitivity, allergy, eczema, or dermatitis history reduces irritating ingredients and increases soothing or barrier-support ingredients. ${DISCLAIMER}`;
}

export function generateRebekaReply(
  userMessage: string,
  profile: UserProfile = getUserProfile()
): string {
  const text = normalizeMessage(userMessage);
  const lesion = detectLesionFromMessage(userMessage);
  const ingredients = detectIngredientNames(userMessage);

  if (!text) {
    return `Can you type your question again? You can ask about Acne, Burn, Rash, Wart, avoid ingredients, or ingredient conflicts. ${DISCLAIMER}`;
  }

  if (["hi", "hello", "hey"].includes(text)) {
    return `Hi, I am Rebeka. I am using your temporary profile for now, so you can test recommendations until the real profile module is connected. Ask me about ingredients, allergies, or conflicts. ${DISCLAIMER}`;
  }

  if (containsAny(text, ["thank", "thanks"])) {
    return `You are welcome. I can also explain why an ingredient was recommended or check a combination for conflicts. ${DISCLAIMER}`;
  }

  if (containsAny(text, ["family", "genetic", "history", "previous", "past issue"])) {
    return buildHistoryReply(text, profile);
  }

  if (containsAny(text, ["allergic", "allergy", "cannot use"])) {
    return buildAllergyReply(ingredients);
  }

  if (
    containsAny(text, ["can i use", "mix", "combine", "together", "conflict", "with"]) &&
    ingredients.length > 0
  ) {
    return buildConflictReply(ingredients, profile);
  }

  if (containsAny(text, ["avoid", "unsafe", "not use", "should not"])) {
    return buildAvoidReply(profile);
  }

  if (containsAny(text, ["why", "reason"])) {
    if (ingredients.length > 0) {
      return buildWhyReply(ingredients[0], profile);
    }
    return `I can explain an ingredient if you include its name. For example: why Niacinamide? ${DISCLAIMER}`;
  }

  if (lesion) {
    return buildLesionReply(lesion, profile);
  }

  if (ingredients.length > 0) {
    return buildWhyReply(ingredients[0], profile);
  }

  return `Can you tell me the lesion type? Acne, Burn, Rash, or Wart? ${DISCLAIMER}`;
}
