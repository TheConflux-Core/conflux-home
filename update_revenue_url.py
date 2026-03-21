import json
import datetime

with open('/home/calo/.openclaw/shared/portfolio/revenue.json', 'r') as f:
    data = json.load(f)

for product in data['products']:
    if product['product_id'] == 'product-0101':
        product['channels']['gumroad']['url'] = 'https://theconflux.gumroad.com/l/100_ai_prompts_for_financial_advisors'
        product['channels']['etsy']['url'] = None  # keep null
        break

data['updated_at'] = datetime.datetime.utcnow().isoformat() + 'Z'

with open('/home/calo/.openclaw/shared/portfolio/revenue.json', 'w') as f:
    json.dump(data, f, indent=2)

print('Updated Gumroad URL for product-0101 in revenue.json')