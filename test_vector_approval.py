#!/usr/bin/env python3
import json
import sys

def compute_opportunity_score(scores):
    """Raw product ratio formula"""
    rp = scores['revenue_potential']
    dc = scores['demand_confidence']
    de = scores['distribution_ease']
    cp = scores['competition']
    bc = scores['build_complexity']
    ttl = scores['time_to_launch']
    numerator = rp * dc * de
    denominator = cp * bc * ttl
    if denominator == 0:
        return None
    return numerator / denominator

def vector_decision(opportunity_score):
    if opportunity_score >= 20.0:
        return "APPROVE"
    else:
        return "REJECT"

def test():
    # Test cases
    test_cases = [
        {
            "name": "opp-0102 (HR & Recruiting)",
            "scores": {
                "revenue_potential": 8,
                "demand_confidence": 9,
                "distribution_ease": 9,
                "competition": 6,
                "build_complexity": 2,
                "time_to_launch": 2
            },
            "expected_score": 27.0,
            "expected_decision": "APPROVE"
        },
        {
            "name": "Low score example",
            "scores": {
                "revenue_potential": 5,
                "demand_confidence": 5,
                "distribution_ease": 5,
                "competition": 5,
                "build_complexity": 5,
                "time_to_launch": 5
            },
            "expected_score": 1.0,
            "expected_decision": "REJECT"
        },
        {
            "name": "High competition, low scores",
            "scores": {
                "revenue_potential": 3,
                "demand_confidence": 4,
                "distribution_ease": 5,
                "competition": 8,
                "build_complexity": 8,
                "time_to_launch": 8
            },
            "expected_score": 0.1171875,
            "expected_decision": "REJECT"
        },
        {
            "name": "Edge case: score exactly 20.0",
            "scores": {
                "revenue_potential": 10,
                "demand_confidence": 10,
                "distribution_ease": 10,
                "competition": 5,
                "build_complexity": 10,
                "time_to_launch": 10
            },
            "expected_score": 2.0,
            "expected_decision": "REJECT"
        }
    ]

    for case in test_cases:
        score = compute_opportunity_score(case['scores'])
        decision = vector_decision(score)
        print(f"Test: {case['name']}")
        print(f"  Computed score: {score:.4f} (expected: {case['expected_score']})")
        print(f"  Decision: {decision} (expected: {case['expected_decision']})")
        if abs(score - case['expected_score']) < 0.001 and decision == case['expected_decision']:
            print("  PASS")
        else:
            print("  FAIL")
        print()

if __name__ == "__main__":
    test()