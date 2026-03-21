import json
import datetime

with open('/home/calo/.openclaw/shared/portfolio/portfolio.json', 'r') as f:
    data = json.load(f)

new_product = {
    "product_id": "product-0301",
    "name": "100 AI Prompts for Healthcare Practice Administrators",
    "type": "prompt_pack",
    "status": "published",
    "niche": "healthcare_admin",
    "prompt_count": 100,
    "price": 29,
    "launch_date": "2026-03-20",
    "revenue": 0,
    "sales": 0,
    "channels": ["gumroad", "etsy"],
    "notes": "AI Prompt Pack for Healthcare Practice Administrators, verified by Quanta.",
    "annual_revenue_target": 5000
}

data['products'].append(new_product)
data['updated_at'] = datetime.datetime.utcnow().isoformat() + 'Z'

with open('/home/calo/.openclaw/shared/portfolio/portfolio.json', 'w') as f:
    json.dump(data, f, indent=2)

print('Added product-0301 to portfolio')