import json
from pathlib import Path


VALID_LESIONS = ["Acne", "Burn", "Rash", "Wart"]
VALID_SEVERITIES = ["Low", "Medium", "High"]
VALID_SKIN_TYPES = ["Oily", "Dry", "Sensitive", "Combination", "Normal"]
VALID_ENVIRONMENTS = ["Humid", "Hot", "Dry", "Polluted"]

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "ingredients.json"
DISCLAIMER = "This is general skincare guidance and not a medical diagnosis."

EVIDENCE_POINTS = {"High": 15, "Medium": 10, "Low": 5}
STRONG_ACTIVES = ["Salicylic Acid", "Benzoyl Peroxide", "Adapalene", "Tea Tree Oil"]
SOOTHING_BARRIER = [
    "Aloe Vera",
    "Zinc Oxide",
    "Centella Asiatica",
    "Hyaluronic Acid",
    "Niacinamide",
]
OILY_SUPPORT = ["Niacinamide", "Salicylic Acid", "Benzoyl Peroxide", "Azelaic Acid"]
ACNE_CORE = ["Niacinamide", "Salicylic Acid", "Benzoyl Peroxide", "Azelaic Acid", "Adapalene"]
DRY_SUPPORT = ["Hyaluronic Acid", "Aloe Vera", "Centella Asiatica", "Zinc Oxide"]
POLLUTION_SUPPORT = ["Niacinamide", "Azelaic Acid", "Centella Asiatica"]

CONFLICT_REASONS = {
    tuple(sorted(["Salicylic Acid", "Adapalene"])): "may increase irritation, dryness, and redness.",
    tuple(sorted(["Benzoyl Peroxide", "Salicylic Acid"])): "may increase dryness and irritation.",
    tuple(sorted(["Benzoyl Peroxide", "Adapalene"])): "may reduce tolerance and increase irritation.",
    tuple(sorted(["Tea Tree Oil", "Benzoyl Peroxide"])): "may increase irritation risk.",
    tuple(sorted(["Tea Tree Oil", "Adapalene"])): "may increase irritation risk.",
    tuple(sorted(["Azelaic Acid", "Salicylic Acid"])): "can be too exfoliating for some users.",
    tuple(sorted(["Niacinamide", "Benzoyl Peroxide"])): "is usually possible but may need cautious introduction.",
}


class RecommendationError(Exception):
    """Clear beginner-friendly errors from the recommendation engine."""


def load_ingredients():
    if not DATA_FILE.exists():
        raise RecommendationError(f"Missing data file: {DATA_FILE}")

    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as error:
        raise RecommendationError("The ingredients data file contains invalid JSON.") from error


def normalize_choice(value, valid_values, field_name):
    if value is None:
        raise RecommendationError(f"Missing {field_name}.")

    cleaned = str(value).strip().lower()
    for valid in valid_values:
        if valid.lower() == cleaned:
            return valid

    raise RecommendationError(
        f"Invalid {field_name} '{value}'. Use one of: {', '.join(valid_values)}."
    )


def normalize_list(values):
    if not values:
        return []
    return [str(value).strip() for value in values if str(value).strip()]


def lower_list(values):
    return [value.lower() for value in normalize_list(values)]


def clamp_score(score):
    return max(0, min(100, round(score)))


def get_product_type(ingredient, environment):
    product_type = ingredient.get("product_type", "")
    if isinstance(product_type, list):
        if environment == "Humid":
            for item in product_type:
                if any(word in item.lower() for word in ["gel", "serum", "cleanser"]):
                    return item
        return product_type[0] if product_type else "Skincare product"
    return product_type or "Skincare product"


def get_percentage(ingredient, lesion):
    percentage = ingredient.get("recommended_percentage", "")
    if isinstance(percentage, dict):
        return percentage.get(lesion) or percentage.get("default") or "Use as directed"
    return percentage or "Use as directed"


def get_category(name):
    if name in ["Aloe Vera", "Centella Asiatica"]:
        return "Soothing"
    if name == "Zinc Oxide":
        return "Barrier"
    if name == "Hyaluronic Acid":
        return "Hydrating"
    if name == "Niacinamide":
        return "Barrier"
    return "Active"


def build_profile(profile):
    normalized = {
        "age": int(profile.get("age", 22)),
        "gender": str(profile.get("gender", "Female")).strip().title(),
        "skinType": normalize_choice(
            profile.get("skinType") or profile.get("skin_type") or "Oily",
            VALID_SKIN_TYPES,
            "skin type",
        ),
        "lesion": normalize_choice(profile.get("lesion"), VALID_LESIONS, "lesion"),
        "severity": normalize_choice(profile.get("severity"), VALID_SEVERITIES, "severity"),
        "environment": normalize_choice(
            profile.get("environment") or "Humid",
            VALID_ENVIRONMENTS,
            "environment",
        ),
        "allergies": normalize_list(profile.get("allergies", [])),
        "previousSkinIssues": normalize_list(profile.get("previousSkinIssues", [])),
        "geneticIssues": normalize_list(profile.get("geneticIssues", [])),
        "usesSkincareProducts": bool(profile.get("usesSkincareProducts", True)),
        "sunExposure": str(profile.get("sunExposure", "Medium")).strip().title(),
    }
    return normalized


def block_reason(ingredient, profile):
    name = ingredient["ingredient"]
    lesion = profile["lesion"]
    severity = profile["severity"]
    allergy_names = lower_list(profile["allergies"])

    if name.lower() in allergy_names:
        return "User allergy history detected."
    if lesion in ingredient.get("avoid_for", []):
        return f"Not suitable for {lesion} in this knowledge base."
    if severity not in ingredient.get("risk_safe", []):
        return f"Not marked safe for {severity} severity."
    if lesion not in ingredient.get("suitable_for", []):
        return f"Main use is not for {lesion}."
    if lesion in ["Burn", "Rash"] and name in STRONG_ACTIVES:
        return f"Strong actives are avoided for {lesion} because they may irritate damaged or reactive skin."
    if severity == "High" and name in STRONG_ACTIVES:
        return "High severity detected, so strong actives are avoided unless advised by a clinician."

    return ""


def add_adjustment(score, amount, factors, text):
    factors.append(text)
    return score + amount


def score_ingredient(ingredient, profile):
    name = ingredient["ingredient"]
    lesion = profile["lesion"]
    severity = profile["severity"]
    skin_type = profile["skinType"]
    environment = profile["environment"]
    age = profile["age"]
    category = get_category(name)
    score = 0
    cautions = []
    factors = []

    if lesion in ingredient.get("suitable_for", []):
        score = add_adjustment(score, 30, factors, f"Matches {lesion}.")
    if severity in ingredient.get("risk_safe", []):
        score = add_adjustment(score, 20, factors, f"Safe for {severity} severity.")
    if skin_type in ingredient.get("skin_type_suitable", []):
        score = add_adjustment(score, 15, factors, f"Suitable for {skin_type} skin.")
    if environment in ingredient.get("environment_suitable", []):
        score = add_adjustment(score, 10, factors, f"Suitable for {environment} environment.")

    evidence = ingredient.get("evidence_level", "Low")
    score = add_adjustment(score, EVIDENCE_POINTS.get(evidence, 5), factors, f"{evidence} evidence level.")

    irritation_bonus = (5 - int(ingredient.get("irritation_score", 3))) * 2
    score = add_adjustment(score, irritation_bonus, factors, f"Irritation safety bonus {irritation_bonus}.")

    if age < 18 and name in STRONG_ACTIVES:
        score -= 10
        cautions.append("Use strong actives carefully for younger users.")
        factors.append("Age under 18 reduced strong active score.")
    if age > 50:
        if name in SOOTHING_BARRIER or category in ["Soothing", "Barrier", "Hydrating"]:
            score += 8
            factors.append("Age over 50 prioritized soothing or barrier support.")
        if name in STRONG_ACTIVES:
            score -= 8
            factors.append("Age over 50 reduced strong active score.")

    if profile["gender"] == "Female" and name == "Adapalene":
        cautions.append("Avoid retinoid-type products during pregnancy unless advised by a clinician.")

    if skin_type == "Sensitive":
        if name in STRONG_ACTIVES:
            score -= 10
            cautions.append("Sensitive skin may react more easily to strong actives.")
            factors.append("Sensitive skin reduced strong active score.")
        if name in SOOTHING_BARRIER or category in ["Soothing", "Barrier", "Hydrating"]:
            score += 8
            factors.append("Sensitive skin prioritized soothing or barrier support.")
    if skin_type == "Oily" and name in OILY_SUPPORT:
        score += 8
        factors.append("Oily skin support ingredient.")
    if lesion == "Acne" and name in ACNE_CORE:
        score += 8
        factors.append("Core acne-support ingredient.")
    if skin_type == "Dry" and name in DRY_SUPPORT:
        score += 8
        factors.append("Dry skin prioritized hydration or barrier support.")
    if skin_type == "Combination" and name in ["Niacinamide", "Azelaic Acid"]:
        score += 5
        factors.append("Combination skin support ingredient.")

    product_type = get_product_type(ingredient, environment)
    if environment == "Humid" and any(word in product_type.lower() for word in ["gel", "serum", "cleanser"]):
        score += 5
        factors.append("Humid environment prefers lightweight product types.")
    if environment == "Dry" and (name in SOOTHING_BARRIER or category in ["Barrier", "Hydrating"]):
        score += 8
        factors.append("Dry environment prioritized hydration or barrier support.")
    if environment == "Polluted" and name in POLLUTION_SUPPORT:
        score += 7
        factors.append("Polluted environment support ingredient.")

    if profile["sunExposure"] == "High" and name in ["Adapalene", "Salicylic Acid"]:
        score -= 8
        cautions.append("Use daily sunscreen and avoid unnecessary sun exposure with this ingredient.")
        factors.append("High sun exposure reduced exfoliating or retinoid-type active score.")

    if not profile["usesSkincareProducts"] and name in STRONG_ACTIVES:
        score -= 5
        cautions.append("Introduce active ingredients slowly because the user is not already using skincare products.")
        factors.append("New skincare user reduced strong active score.")

    previous = " ".join(lower_list(profile["previousSkinIssues"]))
    genetic = " ".join(lower_list(profile["geneticIssues"]))
    reactive_words = ["rash", "eczema", "allergy", "dermatitis", "sensitivity"]

    if any(word in previous for word in reactive_words):
        if name in STRONG_ACTIVES:
            score -= 10
            factors.append("Previous reactive skin issue reduced strong active score.")
        if name in SOOTHING_BARRIER or category in ["Soothing", "Barrier", "Hydrating"]:
            score += 8
            factors.append("Previous reactive skin issue prioritized soothing or barrier support.")

    if any(word in genetic for word in reactive_words):
        if name in STRONG_ACTIVES:
            score -= 10
            factors.append("Family/genetic sensitivity history reduced strong active score.")
        if name in SOOTHING_BARRIER or category in ["Soothing", "Barrier", "Hydrating"]:
            score += 8
            factors.append("Family/genetic sensitivity history prioritized soothing or barrier support.")

    if "acne" in previous and lesion == "Acne" and name in ACNE_CORE:
        score += 5
        factors.append("Previous acne history supports acne-focused ingredient.")

    reason = f"{name} was recommended because it matches {lesion}, fits the safety checks, and scored well for the user's profile."

    return {
        "name": name,
        "productType": product_type,
        "percentage": get_percentage(ingredient, lesion),
        "confidence": clamp_score(score),
        "benefits": ingredient.get("benefits", []),
        "reason": reason,
        "cautions": cautions,
        "profileFactorsConsidered": factors[:8],
        "_conflictsWith": ingredient.get("conflicts_with", []),
    }


def detect_conflicts(recommended):
    names = [item["name"] for item in recommended]
    name_set = set(names)
    messages = []
    seen = set()

    for item in recommended:
        for conflict_name in item.get("_conflictsWith", []):
            if conflict_name in name_set:
                pair = tuple(sorted([item["name"], conflict_name]))
                if pair in seen:
                    continue
                seen.add(pair)
                reason = CONFLICT_REASONS.get(pair, "may increase irritation or reduce tolerance.")
                messages.append(f"{pair[0]} should not be combined with {pair[1]} because it {reason}")

    return messages


def generate_recommendations(profile=None):
    if profile is None:
        profile = {}

    normalized_profile = build_profile(profile)
    ingredients = load_ingredients()
    recommended = []
    avoid = []
    profile_warnings = []

    if normalized_profile["severity"] == "High":
        profile_warnings.append("High severity detected. Dermatologist advice is recommended.")
    if normalized_profile["sunExposure"] == "High":
        profile_warnings.append("High sun exposure detected. Daily sunscreen is important.")

    genetic = " ".join(lower_list(normalized_profile["geneticIssues"]))
    if any(word in genetic for word in ["sensitivity", "eczema", "allergy", "dermatitis"]):
        profile_warnings.append("Family/genetic sensitivity history detected, so irritation risk is weighted carefully.")

    for ingredient in ingredients:
        reason = block_reason(ingredient, normalized_profile)
        if reason:
            avoid.append({"name": ingredient["ingredient"], "reason": reason})
            continue

        recommended.append(score_ingredient(ingredient, normalized_profile))

    recommended.sort(key=lambda item: item["confidence"], reverse=True)
    recommended = recommended[:5]
    conflicts = detect_conflicts(recommended)

    for item in recommended:
        item.pop("_conflictsWith", None)

    if not recommended:
        raise RecommendationError("No safe recommendations found for this profile.")

    return {
        "recommended": recommended,
        "avoid": avoid,
        "conflicts": conflicts,
        "profileWarnings": profile_warnings,
        "disclaimer": DISCLAIMER,
        "knowledgeBaseType": "dermatology-informed knowledge base",
        "profile": normalized_profile,
    }


def recommend_ingredients(**profile):
    return generate_recommendations(profile)
