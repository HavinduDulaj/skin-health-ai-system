import {
  ingredientKnowledgeBase,
  soothingBarrierHydratingIngredients,
  strongActives,
} from "../data/ingredientKnowledgeBase";
import { getUserProfile } from "./profileService";
import {
  AvoidItem,
  IngredientKnowledge,
  IngredientRecommendation,
  RecommendationResult,
  UserProfile,
} from "../types/types";

const DISCLAIMER = "This is general skincare guidance and not a medical diagnosis.";

const evidenceScores = {
  High: 15,
  Medium: 10,
  Low: 5,
};

const acneCoreIngredients = [
  "Niacinamide",
  "Salicylic Acid",
  "Benzoyl Peroxide",
  "Azelaic Acid",
  "Adapalene",
];

const conflictReasons: Record<string, string> = {
  "Adapalene|Salicylic Acid":
    "Salicylic Acid should not be combined with Adapalene because it may increase irritation.",
  "Benzoyl Peroxide|Salicylic Acid":
    "Benzoyl Peroxide should not be combined with Salicylic Acid because it may increase dryness and irritation.",
  "Adapalene|Benzoyl Peroxide":
    "Benzoyl Peroxide should not be combined with Adapalene without guidance because it may reduce tolerance.",
  "Benzoyl Peroxide|Tea Tree Oil":
    "Tea Tree Oil should not be combined with Benzoyl Peroxide because both can be drying and irritating.",
  "Adapalene|Tea Tree Oil":
    "Tea Tree Oil should not be combined with Adapalene because it may increase irritation.",
  "Azelaic Acid|Salicylic Acid":
    "Azelaic Acid with Salicylic Acid can be a mild conflict for irritation-prone skin.",
  "Benzoyl Peroxide|Niacinamide":
    "Niacinamide with Benzoyl Peroxide is usually a caution combination; introduce slowly and monitor tolerance.",
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function capScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function includesAny(values: string[], terms: string[]): boolean {
  const text = values.map(normalize).join(" ");
  return terms.some((term) => text.includes(term));
}

function isStrongActive(name: string): boolean {
  return strongActives.includes(name);
}

function isSoothingBarrierHydrating(ingredient: IngredientKnowledge): boolean {
  return (
    soothingBarrierHydratingIngredients.includes(ingredient.name) ||
    ["Soothing", "Barrier", "Hydrating"].includes(ingredient.category)
  );
}

function isAllergy(profile: UserProfile, ingredientName: string): boolean {
  return profile.allergies.some(
    (allergy) => normalize(allergy) === normalize(ingredientName)
  );
}

function getPercentage(ingredient: IngredientKnowledge, profile: UserProfile): string {
  return (
    ingredient.recommendedPercentage[profile.lesion] ||
    ingredient.recommendedPercentage.default ||
    "Use product label guidance"
  );
}

function chooseProductType(ingredient: IngredientKnowledge, profile: UserProfile): string {
  if (profile.environment === "Humid") {
    const lightType = ingredient.productType.find((type) =>
      ["gel", "serum", "cleanser", "wash"].some((word) =>
        type.toLowerCase().includes(word)
      )
    );
    if (lightType) {
      return lightType;
    }
  }

  return ingredient.productType[0] || "Skincare product";
}

function getBlockingReason(
  ingredient: IngredientKnowledge,
  profile: UserProfile
): string | null {
  if (isAllergy(profile, ingredient.name)) {
    return "User allergy history detected.";
  }

  if (ingredient.avoidFor.includes(profile.lesion)) {
    return `Not suitable for ${profile.lesion}.`;
  }

  if (!ingredient.riskSafe.includes(profile.severity)) {
    return `Not marked safe for ${profile.severity} severity.`;
  }

  if (["Burn", "Rash"].includes(profile.lesion) && isStrongActive(ingredient.name)) {
    return `Strong actives are avoided for ${profile.lesion} because they may irritate damaged or reactive skin.`;
  }

  if (profile.severity === "High" && isStrongActive(ingredient.name)) {
    return "High severity detected, so strong actives are blocked for safety.";
  }

  if (!ingredient.suitableFor.includes(profile.lesion)) {
    return `Main use is not for ${profile.lesion}.`;
  }

  return null;
}

function scoreIngredient(ingredient: IngredientKnowledge, profile: UserProfile) {
  let score = 0;
  const factors: string[] = [];
  const cautions: string[] = [];

  if (ingredient.suitableFor.includes(profile.lesion)) {
    score += 30;
    factors.push(`lesion match: ${profile.lesion}`);
  }

  if (ingredient.riskSafe.includes(profile.severity)) {
    score += 20;
    factors.push(`safe for ${profile.severity} severity`);
  }

  if (ingredient.skinTypeSuitable.includes(profile.skinType)) {
    score += 15;
    factors.push(`matches ${profile.skinType} skin`);
  }

  if (ingredient.environmentSuitable.includes(profile.environment)) {
    score += 10;
    factors.push(`matches ${profile.environment} environment`);
  }

  score += evidenceScores[ingredient.evidenceLevel];
  factors.push(`${ingredient.evidenceLevel} evidence level`);

  const irritationBonus = (5 - ingredient.irritationScore) * 2;
  score += irritationBonus;
  factors.push(`irritation bonus: ${irritationBonus}`);

  if (profile.age < 18 && isStrongActive(ingredient.name)) {
    score -= 10;
    cautions.push("Use strong actives carefully for younger users.");
    factors.push("age under 18 reduced strong active score");
  }

  if (profile.age > 50) {
    if (isSoothingBarrierHydrating(ingredient)) {
      score += 8;
      factors.push("age over 50 boosted barrier-support ingredient");
    }
    if (isStrongActive(ingredient.name)) {
      score -= 8;
      factors.push("age over 50 reduced strong active score");
    }
  }

  if (profile.gender === "Female" && ingredient.name === "Adapalene") {
    cautions.push("Avoid retinoid-type products during pregnancy unless advised by a clinician.");
  }

  if (profile.skinType === "Sensitive") {
    if (isStrongActive(ingredient.name)) {
      score -= 10;
      cautions.push("Sensitive skin may react more strongly to active ingredients.");
      factors.push("sensitive skin reduced strong active score");
    }
    if (isSoothingBarrierHydrating(ingredient)) {
      score += 8;
      factors.push("sensitive skin boosted soothing/barrier ingredient");
    }
  }

  if (
    profile.skinType === "Oily" &&
    ["Niacinamide", "Salicylic Acid", "Benzoyl Peroxide", "Azelaic Acid"].includes(
      ingredient.name
    )
  ) {
    score += 8;
    factors.push("oily skin preference boost");
  }

  if (profile.lesion === "Acne" && acneCoreIngredients.includes(ingredient.name)) {
    score += 8;
    factors.push("core acne-support ingredient boost");
  }

  if (
    profile.skinType === "Dry" &&
    ["Hyaluronic Acid", "Aloe Vera", "Centella Asiatica", "Zinc Oxide"].includes(
      ingredient.name
    )
  ) {
    score += 8;
    factors.push("dry skin hydration/barrier boost");
  }

  if (
    profile.skinType === "Combination" &&
    ["Niacinamide", "Azelaic Acid"].includes(ingredient.name)
  ) {
    score += 5;
    factors.push("combination skin balance boost");
  }

  if (profile.environment === "Humid") {
    const hasLightProduct = ingredient.productType.some((type) =>
      ["gel", "serum", "cleanser", "wash"].some((word) =>
        type.toLowerCase().includes(word)
      )
    );
    if (hasLightProduct) {
      score += 5;
      factors.push("humid environment lightweight product boost");
    }
  }

  if (profile.environment === "Dry" && isSoothingBarrierHydrating(ingredient)) {
    score += 8;
    factors.push("dry environment hydration/barrier boost");
  }

  if (
    profile.environment === "Polluted" &&
    ["Niacinamide", "Azelaic Acid", "Centella Asiatica"].includes(ingredient.name)
  ) {
    score += 7;
    factors.push("polluted environment support boost");
  }

  if (
    profile.sunExposure === "High" &&
    ["Adapalene", "Salicylic Acid"].includes(ingredient.name)
  ) {
    score -= 8;
    cautions.push("High sun exposure: use sunscreen and be cautious with photosensitizing or exfoliating actives.");
    factors.push("high sun exposure reduced active score");
  }

  if (!profile.usesSkincareProducts && isStrongActive(ingredient.name)) {
    score -= 5;
    cautions.push("Introduce actives slowly because the user does not currently use skincare products.");
    factors.push("new skincare user reduced strong active score");
  }

  if (
    includesAny(profile.previousSkinIssues, ["rash", "eczema", "dermatitis", "allergy"])
  ) {
    if (isStrongActive(ingredient.name)) {
      score -= 10;
      factors.push("previous irritation history reduced strong active score");
    }
    if (isSoothingBarrierHydrating(ingredient)) {
      score += 8;
      factors.push("previous irritation history boosted barrier support");
    }
  }

  if (includesAny(profile.previousSkinIssues, ["acne"])) {
    if (profile.lesion === "Acne" && acneCoreIngredients.includes(ingredient.name)) {
      score += 5;
    }
    factors.push("previous acne history considered");
  }

  if (
    includesAny(profile.geneticIssues, ["sensitivity", "eczema", "allergy", "dermatitis"])
  ) {
    if (isStrongActive(ingredient.name)) {
      score -= 10;
      factors.push("family/genetic sensitivity reduced strong active score");
    }
    if (isSoothingBarrierHydrating(ingredient)) {
      score += 8;
      factors.push("family/genetic sensitivity boosted barrier support");
    }
  }

  return { confidence: capScore(score), factors, cautions };
}

function buildProfileWarnings(profile: UserProfile): string[] {
  const warnings: string[] = [];

  if (profile.severity === "High") {
    warnings.push("High severity detected. Dermatologist advice is recommended.");
  }

  if (profile.sunExposure === "High") {
    warnings.push("High sun exposure detected. Daily sunscreen is important, especially with active ingredients.");
  }

  if (!profile.usesSkincareProducts) {
    warnings.push("No current skincare product use noted. Introduce active ingredients slowly.");
  }

  if (
    includesAny(profile.geneticIssues, ["sensitivity", "eczema", "allergy", "dermatitis"])
  ) {
    warnings.push("Family/genetic sensitivity history detected. Irritating ingredients were reduced.");
  }

  if (
    includesAny(profile.previousSkinIssues, ["rash", "eczema", "dermatitis", "allergy"])
  ) {
    warnings.push("Previous irritation-related skin issues detected. Soothing and barrier ingredients were prioritized.");
  }

  return warnings;
}

function addAvoid(avoid: AvoidItem[], name: string, reason: string) {
  if (!avoid.some((item) => item.name === name)) {
    avoid.push({ name, reason });
  }
}

function conflictKey(first: string, second: string): string {
  return [first, second].sort().join("|");
}

function detectConflicts(recommended: IngredientRecommendation[]): string[] {
  const names = recommended.map((item) => item.name);
  const conflicts = new Set<string>();

  recommended.forEach((item) => {
    const knowledge = ingredientKnowledgeBase.find(
      (ingredient) => ingredient.name === item.name
    );

    knowledge?.conflictsWith.forEach((conflictName) => {
      if (names.includes(conflictName)) {
        const key = conflictKey(item.name, conflictName);
        conflicts.add(
          conflictReasons[key] ||
            `${item.name} should not be combined with ${conflictName} because it may increase irritation.`
        );
      }
    });
  });

  return Array.from(conflicts);
}

export function generateRecommendations(
  profile: UserProfile = getUserProfile()
): RecommendationResult {
  const recommended: IngredientRecommendation[] = [];
  const avoid: AvoidItem[] = [];

  ingredientKnowledgeBase.forEach((ingredient) => {
    const blockingReason = getBlockingReason(ingredient, profile);

    if (blockingReason) {
      addAvoid(avoid, ingredient.name, blockingReason);
      return;
    }

    const { confidence, factors, cautions } = scoreIngredient(ingredient, profile);

    recommended.push({
      name: ingredient.name,
      productType: chooseProductType(ingredient, profile),
      percentage: getPercentage(ingredient, profile),
      confidence,
      benefits: ingredient.benefits,
      reason: factors.slice(0, 4).join("; "),
      cautions,
      profileFactorsConsidered: factors,
    });
  });

  recommended.sort((first, second) => second.confidence - first.confidence);
  const topRecommended = recommended.slice(0, 5);

  return {
    recommended: topRecommended,
    avoid,
    conflicts: detectConflicts(topRecommended),
    profileWarnings: buildProfileWarnings(profile),
    disclaimer: DISCLAIMER,
  };
}
