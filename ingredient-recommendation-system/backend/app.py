from recommendation_engine import RecommendationError, generate_recommendations


def print_test_result(result):
    print("DermaSafe AI Ingredient Recommendation Test")
    print(result["disclaimer"])
    print()

    print("Recommended Ingredients")
    for item in result["recommended"]:
        print(f"- {item['name']}")
        print(f"  Product type: {item['productType']}")
        print(f"  Recommended percentage: {item['percentage']}")
        print(f"  Confidence score: {item['confidence']}")
        print(f"  Benefits: {', '.join(item['benefits'])}")
        print(f"  Reason: {item['reason']}")
        print()

    print("Avoid List")
    for item in result["avoid"]:
        print(f"- {item['name']}: {item['reason']}")
    print()

    print("Conflicts")
    if result["conflicts"]:
        for conflict in result["conflicts"]:
            print(f"- {conflict}")
    else:
        print("- No conflicts detected.")


if __name__ == "__main__":
    try:
        test_profile = {
            "age": 22,
            "gender": "Female",
            "skinType": "Oily",
            "lesion": "Acne",
            "severity": "Low",
            "environment": "Humid",
            "allergies": ["Tea Tree Oil"],
            "previousSkinIssues": ["Acne"],
            "geneticIssues": [],
            "usesSkincareProducts": True,
            "sunExposure": "Medium",
        }
        print_test_result(generate_recommendations(test_profile))
    except RecommendationError as error:
        print(f"Error: {error}")
