import json

def evaluate_startup(startup):
    """
    실제 기업 평가용 로직.
    기술력, 시장성, 실행력, 성장성, 리스크 5가지 항목.
    총점은 100점 만점 기준.
    """
    weights = {
        "tech": 0.25,
        "market": 0.25,
        "team": 0.20,
        "growth": 0.20,
        "risk": 0.10,
    }

    tech = (
        startup.get("tech_innovation", 0) * 0.4 +
        startup.get("tech_difficulty", 0) * 0.3 +
        startup.get("tech_scalability", 0) * 0.3
    )

    market = (
        startup.get("market_size", 0) * 0.4 +
        startup.get("competition_intensity", 0) * 0.3 +
        startup.get("market_growth", 0) * 0.3
    )

    team = (
        startup.get("founder_experience", 0) * 0.4 +
        startup.get("execution_speed", 0) * 0.3 +
        startup.get("team_synergy", 0) * 0.3
    )

    growth = (
        startup.get("user_growth_rate", 0) * 0.5 +
        startup.get("revenue_potential", 0) * 0.5
    )

    risk = (
        startup.get("financial_risk", 0) * 0.5 +
        startup.get("regulation_risk", 0) * 0.5
    )

    # 종합 점수 계산
    total = (
        tech * weights["tech"] +
        market * weights["market"] +
        team * weights["team"] +
        growth * weights["growth"] -
        risk * weights["risk"]
    )

    return {
        "기술력 점수": round(tech, 2),
        "시장성 점수": round(market, 2),
        "팀/실행력 점수": round(team, 2),
        "성장성 점수": round(growth, 2),
        "리스크 점수": round(risk, 2),
        "총점": round(total, 2)
    }


if __name__ == "__main__":
    # 실전 테스트 예시 — 여기 값만 바꿔서 다양한 기업 평가 가능
    startup = {
        "tech_innovation": 90,
        "tech_difficulty": 80,
        "tech_scalability": 85,
        "market_size": 70,
        "competition_intensity": 50,
        "market_growth": 80,
        "founder_experience": 95,
        "execution_speed": 85,
        "team_synergy": 88,
        "user_growth_rate": 75,
        "revenue_potential": 90,
        "financial_risk": 30,
        "regulation_risk": 40,
    }

    result = evaluate_startup(startup)

    print("\n🚀 실전 스타트업 평가 결과\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))
