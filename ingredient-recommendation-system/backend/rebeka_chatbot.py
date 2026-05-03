import re

from recommendation_engine import DISCLAIMER, RecommendationError, generate_recommendations


INGREDIENT_NAMES = [
    "Niacinamide",
    "Salicylic Acid",
    "Aloe Vera",
    "Zinc Oxide",
    "Benzoyl Peroxide",
    "Azelaic Acid",
    "Adapalene",
    "Tea Tree Oil",
    "Centella Asiatica",
    "Hyaluronic Acid",
]

LESION_GUIDANCE = {
    "Burn": {
        "terms": ["burn", "burns", "skin burn"],
        "recommended": ["Aloe Vera", "Zinc Oxide", "Centella Asiatica", "Hyaluronic Acid"],
        "avoid": ["Salicylic Acid", "Benzoyl Peroxide", "Adapalene", "Tea Tree Oil"],
        "reason": "burn-prone skin usually needs soothing, hydration, and barrier protection",
    },
    "Acne": {
        "terms": ["acne", "pimple", "pimples"],
        "recommended": ["Niacinamide", "Salicylic Acid", "Benzoyl Peroxide", "Azelaic Acid", "Adapalene"],
        "avoid": ["heavy fragrance", "strong irritants", "unnecessary oils"],
        "reason": "these ingredients can support oil control, clogged pores, bacteria, and inflammation",
    },
    "Rash": {
        "terms": ["rash", "rashes"],
        "recommended": ["Aloe Vera", "Zinc Oxide", "Centella Asiatica", "Hyaluronic Acid"],
        "avoid": ["Salicylic Acid", "Benzoyl Peroxide", "Adapalene", "Tea Tree Oil", "Fragrance"],
        "reason": "rash-prone skin usually needs soothing and barrier repair",
    },
    "Wart": {
        "terms": ["wart", "warts"],
        "recommended": ["Salicylic Acid", "Tea Tree Oil"],
        "avoid": ["moisturizer-only treatment as the main treatment", "fragrance"],
        "reason": "wart guidance focuses on keratolytic/removal support",
    },
}

CONFLICT_PAIRS = {
    tuple(sorted(["Salicylic Acid", "Adapalene"])): "not recommended together because it may increase irritation, dryness, and redness.",
    tuple(sorted(["Benzoyl Peroxide", "Salicylic Acid"])): "may increase dryness and irritation.",
    tuple(sorted(["Benzoyl Peroxide", "Adapalene"])): "may reduce tolerance and increase irritation.",
    tuple(sorted(["Tea Tree Oil", "Benzoyl Peroxide"])): "may increase irritation risk.",
    tuple(sorted(["Tea Tree Oil", "Adapalene"])): "may increase irritation risk.",
    tuple(sorted(["Azelaic Acid", "Salicylic Acid"])): "is a mild conflict because it may be too exfoliating for some users.",
    tuple(sorted(["Niacinamide", "Benzoyl Peroxide"])): "is a caution combination, so introduce slowly and monitor irritation.",
}


def response(message, result=None, intent="general"):
    payload = {
        "bot": "Rebeka",
        "intent": intent,
        "message": f"{message} {DISCLAIMER}",
        "suggestions": [
            "What should I avoid?",
            "Why did you recommend Niacinamide?",
            "Can I use Salicylic Acid with Adapalene?",
        ],
    }
    if result:
        payload["result"] = result
    return payload


def normalize(text):
    return re.sub(r"\s+", " ", text.lower().strip())


def detect_lesion(text):
    for lesion, data in LESION_GUIDANCE.items():
        if any(term in text for term in data["terms"]):
            return lesion
    return ""


def detect_ingredients(text):
    found = []
    for name in INGREDIENT_NAMES:
        if name.lower() in text:
            found.append(name)
    return found


def detect_allergy(text):
    patterns = [
        r"allergic to ([a-zA-Z ]+)",
        r"allergy to ([a-zA-Z ]+)",
        r"i cannot use ([a-zA-Z ]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            raw = match.group(1).strip(" .?!")
            for name in INGREDIENT_NAMES:
                if name.lower() in raw:
                    return name
            return raw.title()
    return ""


def lesion_reply(lesion):
    data = LESION_GUIDANCE[lesion]
    recommended = ", ".join(data["recommended"])
    avoid = ", ".join(data["avoid"])
    extra = ""
    if lesion == "Wart":
        extra = " Please seek medical advice if it is painful, spreading, bleeding, or near sensitive areas."
    return (
        f"For {lesion.lower()}-related skin concerns, I would prioritize {recommended} because {data['reason']}. "
        f"I would avoid {avoid} because they may be unsuitable or irritating for this concern.{extra}"
    )


def explain_ingredient(text, result):
    ingredients = detect_ingredients(text)
    if not ingredients:
        top_names = ", ".join(item["name"] for item in result["recommended"][:3])
        return f"I recommended the top ingredients, especially {top_names}, because they scored best for lesion match, severity safety, skin type, environment, evidence level, and irritation risk."

    name = ingredients[0]
    for item in result["recommended"]:
        if item["name"] == name:
            benefits = ", ".join(item["benefits"][:3])
            return f"{name} was recommended because {item['reason']} Main benefits: {benefits}."

    for item in result["avoid"]:
        if item["name"] == name:
            return f"{name} is in the avoid group because {item['reason']}"

    return f"{name} is not a top recommendation for the current profile. I would check lesion type, severity, allergy history, and irritation risk before using it."


def avoid_reply(result):
    if not result["avoid"]:
        return "I did not find avoid ingredients for the current profile, but patch testing is still recommended."
    lines = [f"{item['name']} because {item['reason']}" for item in result["avoid"][:6]]
    return "For the current profile, I would avoid: " + "; ".join(lines) + "."


def conflict_reply(text, result):
    ingredients = detect_ingredients(text)
    if len(ingredients) >= 2:
        pair = tuple(sorted(ingredients[:2]))
        if pair in CONFLICT_PAIRS:
            return f"{pair[0]} with {pair[1]} is {CONFLICT_PAIRS[pair]}"
        return f"I did not find a major conflict between {ingredients[0]} and {ingredients[1]} in this knowledge base, but introduce products slowly."

    if result["conflicts"]:
        return "I found possible conflicts: " + "; ".join(result["conflicts"][:4])
    return "I did not find conflicts among the current recommended ingredients. Still introduce products slowly and patch test first."


def chat_with_rebeka(message, profile):
    text = normalize(message)

    if not text:
        return response("Please type a skincare question, and I will help with ingredient guidance.", intent="empty")

    if text in ["hi", "hello", "hey"] or text.startswith(("hi ", "hello ", "hey ")):
        return response(
            "Hi, I am Rebeka. I can help with suitable ingredients, avoid ingredients, allergy checks, and ingredient conflicts.",
            intent="greeting",
        )

    try:
        result = generate_recommendations(profile)
    except RecommendationError as error:
        return response(f"I could not prepare guidance because: {error}", intent="error")

    allergy = detect_allergy(text)
    if allergy:
        return response(
            f"I noted that allergy. You should avoid {allergy}, and I will exclude it from recommendations. Please update your allergy profile when the profile module is connected.",
            result=result,
            intent="allergy",
        )

    if "family" in text or "genetic" in text:
        return response(
            "Family or genetic skin history is useful because it can increase caution around irritation, eczema, dermatitis, or allergy-prone skin. I will weigh safety and tolerance before recommending strong active ingredients.",
            result=result,
            intent="family_history",
        )

    if "previous" in text or "history" in text or "before" in text:
        return response(
            "Previous skin issues matter because they can change how strongly I rank soothing ingredients versus active ingredients. Rash, eczema, allergy, or dermatitis history makes me more cautious with strong actives.",
            result=result,
            intent="previous_history",
        )

    lesion = detect_lesion(text)
    if lesion:
        return response(lesion_reply(lesion), result=result, intent="lesion_guidance")

    if "why" in text or "recommend" in text or "reason" in text or "why not" in text:
        return response(explain_ingredient(text, result), result=result, intent="explanation")

    if "avoid" in text or "unsafe" in text or "not use" in text:
        return response(avoid_reply(result), result=result, intent="avoid")

    if (
        "can i use" in text
        or "with" in text
        or "together" in text
        or "combine" in text
        or "mix" in text
        or "conflict" in text
    ):
        return response(conflict_reply(text, result), result=result, intent="conflict")

    if "show" in text or "list" in text or "ingredients" in text:
        names = ", ".join(item["name"] for item in result["recommended"])
        return response(f"For the current profile, my recommended ingredients are {names}.", result=result, intent="list")

    return response(
        "Can you tell me the lesion type? Acne, Burn, Rash, or Wart? I can then explain suitable ingredients, avoid items, and conflicts.",
        result=result,
        intent="fallback",
    )
