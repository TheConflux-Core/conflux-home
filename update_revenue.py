import json
import datetime

with open('/home/calo/.openclaw/shared/portfolio/revenue.json', 'r') as f:
    data = json.load(f)

new_product = {
    "product_id": "product-0301",
    "name": "100 AI Prompts for Healthcare Practice Administrators",
    "price": 29.00,
    "launch_date": "2026-03-20",
    "total_revenue": 0.00,
    "total_sales": 0,
    "channels": {
        "gumroad": {
            "url": None,
            "revenue": 0.00,
            "sales": 0,
            "last_sync": None
        },
        "etsy": {
            "url": None,
            "revenue": 0.00,
            "sales": 0,
            "last_sync": None
        }
    }
}

data['products'].append(new_product)
data['updated_at'] = datetime.datetime.utcnow().isoformat() + 'Z'

with open('/home/calo/.openclaw/shared/portfolio/revenue.json', 'w') as f:
    json.dump(data, f, indent=2)

print('Added product-0301 to revenue tracking')