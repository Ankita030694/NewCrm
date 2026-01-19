#!/bin/bash

# Default phone number if not provided
PHONE="${1:-919876543210}"

echo "Testing Wati Webhook with phone: $PHONE"
echo "Sending 'Yes, I am interested' message..."

curl -X POST http://localhost:3000/api/webhooks/wati \
  -H "Content-Type: application/json" \
  -d '{
    "waId": "'"$PHONE"'",
    "text": "Yes, I am interested",
    "senderName": "Test User",
    "timestamp": 1234567890
  }'

echo -e "\n\nRequest sent. Check your local server logs and the lead status in Firestore."
