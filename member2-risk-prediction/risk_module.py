def predict_risk(condition, confidence):
    condition = condition.lower()

    if confidence < 0.50:
        return "Uncertain", "Upload a clearer image or consult a dermatologist."

    if condition == "acne":
        return "Low", "Monitor the condition and follow basic skincare."

    elif condition in ["rash", "rashes"]:
        return "Medium", "Monitor the condition. If it persists or worsens, consult a dermatologist."

    elif condition == "warts":
        return "Medium", "Avoid self-treatment. Consult a dermatologist if it spreads."

    elif condition == "burns":
        return "High", "Consult a medical professional for further evaluation."

    else:
        return "Uncertain", "Condition not recognized."