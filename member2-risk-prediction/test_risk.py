from risk_module import predict_risk

test_cases = [
    ("acne", 0.92),
    ("rashes", 0.80),
    ("warts", 0.76),
    ("burns", 0.88),
    ("acne", 0.40)
]

for condition, confidence in test_cases:
    risk, message = predict_risk(condition, confidence)
    print("Condition:", condition)
    print("Confidence:", confidence)
    print("Risk Level:", risk)
    print("Message:", message)
    print("----------------------")