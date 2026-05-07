def predict_risk(data):
    score = 0
    breakdown = []

    def add(points, reason):
        nonlocal score
        score += points
        breakdown.append(f"+{points} {reason}")

    condition = data.get("condition")
    symptoms = data.get("symptoms", {})
    profile = data.get("profile", {})

    # Condition base risk
    if condition == "Acne":
        add(15, "Acne base risk")
    elif condition == "Warts":
        add(20, "Warts base risk")
    elif condition == "Rashes":
        add(25, "Rashes base risk")
    elif condition == "Burns":
        add(35, "Burns base risk")

    # Pain
    if symptoms.get("pain") == "High":
        add(15, "High pain")
    elif symptoms.get("pain") == "Medium":
        add(8, "Medium pain")

    # Itching
    if symptoms.get("itching") == "Severe":
        add(15, "Severe itching")
    elif symptoms.get("itching") == "Moderate":
        add(8, "Moderate itching")

    # Redness
    if symptoms.get("redness") == "High":
        add(15, "High redness")
    elif symptoms.get("redness") == "Medium":
        add(8, "Medium redness")

    # Swelling
    if symptoms.get("swelling") == "Yes":
        add(12, "Swelling detected")

    # Duration
    duration = int(symptoms.get("duration", 0))

    if duration > 14:
        add(15, "Long duration")
    elif duration > 7:
        add(8, "Moderate duration")

    # Infection
    if profile.get("infection") == "Yes":
        add(20, "Infection signs")

    # Previous issue
    if profile.get("previousIssue") == "Yes":
        add(8, "Previous issue")

    # Sensitivity
    if profile.get("sensitivity") == "Sensitive":
        add(8, "Sensitive skin")

    # Sun exposure
    if profile.get("sunExposure") == "High":
        add(8, "High sun exposure")

    score = min(score, 100)

    # Final level
    if score <= 35:
        level = "Low"
        action = "Monitor condition and maintain skincare."
    elif score <= 70:
        level = "Medium"
        action = "Monitor symptoms carefully."
    else:
        level = "High"
        action = "Consult medical professional."

    return {
        "riskScore": score,
        "riskLevel": level,
        "riskConfidence": 82,
        "breakdown": breakdown,
        "suggestedAction": action,
        "disclaimer": "Decision-support only. Not a medical diagnosis."
    }