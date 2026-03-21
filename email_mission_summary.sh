#!/bin/bash
# Email mission summary to Don

set -e

PRODUCT_ID="product-0301"
MISSION_ID="mission-0301"
ATTACHMENTS_DIR="/home/calo/.openclaw/shared/products/${PRODUCT_ID}"
TO_EMAIL="theconflux303@gmail.com"  # Don's email? Use shift2bass? The user didn't specify. Use shift2bass as per earlier.
SUBJECT="Mission ${MISSION_ID} Summary & Files for ${PRODUCT_ID}"

BODY=$(cat <<EOF
Mission Summary:

Mission ID: ${MISSION_ID}
Title: Build and launch AI Prompt Pack for Healthcare Practice Administrators
Status: Complete
Product: ${PRODUCT_ID} - "100 AI Prompts for Healthcare Practice Administrators"
Launch Date: 2026-03-20
Price: $29
Channels: Gumroad, Etsy
Price: $29

Files attached:
- Source prompts: source/prompts.md
- Prompt pack PDF source: artifacts/prompt-pack.md
- Gumroad listing: listings/gumroad.md
- Etsy listing: listings/etsy.md

All launch assets are ready for manual upload to Gumroad and Etsy.
Social posts generated and queued in Buffer (pending slot availability).

Next steps: Upload listings and assets to respective platforms.
EOF
)

# Send email with attachments
cd /home/calo/.openclaw
GOG_KEYRING_PASSWORD="Nolimit@i26Lng" gog mail send \
  --to "${TO_EMAIL}" \
  --subject "${SUBJECT}" \
  --body "${BODY}" \
  --attach "${ATTACHMENTS_DIR}/source/prompts.md" \
  --attach "${ATTACHMENTS_DIR}/artifacts/prompt-pack.md" \
  --attach "${ATTACHMENTS_DIR}/listings/gumroad.md" \
  --attach "${ATTACHMENTS_DIR}/listings/etsy.md" \
  --account theconflux303@gmail.com

echo "Email sent."