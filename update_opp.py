import json

with open('/home/calo/.openclaw/shared/opportunities/opportunity-0103.json', 'r') as f:
    data = json.load(f)

data['opportunity_id'] = 'opp-0103'
data['title'] = 'Test Opportunity for Vector Approval'
data['market'] = 'test'
data['segment'] = 'test'
data['source'] = 'test'
data['status'] = 'scored'
data['summary'] = {
    "problem": "Test",
    "audience": "Test",
    "format": "prompt_pack",
    "solution": "Test"
}
data['evidence'] = {
    "demand_notes": ["Test"],
    "pricing_notes": ["Test"],
    "competition_notes": ["Test"],
    "research_refs": []
}
data['scores'] = {
    "revenue_potential": 10,
    "demand_confidence": 10,
    "distribution_ease": 10,
    "competition": 5,
    "build_complexity": 5,
    "time_to_launch": 2,
    "opportunity_score": 20.0,
    "expected_value": None
}
data['decision_ref'] = None
data['mission_ref'] = None
data['product_ref'] = None

with open('/home/calo/.openclaw/shared/opportunities/opportunity-0103.json', 'w') as f:
    json.dump(data, f, indent=2)

print('Updated opportunity-0103.json')