#!/bin/bash
# Test script for email endpoint

echo "Testing email endpoint..."
echo ""

# Replace with your actual domain
DOMAIN="atscareeros.com"

# Create a test email
TEST_EMAIL="From: test@example.com
To: jobs@${DOMAIN}
Subject: You applied for Software Engineer at Google

You applied for Software Engineer at Google.
Application ID: 12345
"

echo "Sending test email to https://${DOMAIN}/api/jobs/inbound-email"
echo ""

curl -X POST "https://${DOMAIN}/api/jobs/inbound-email" \
  -H "Content-Type: text/plain" \
  -d "$TEST_EMAIL" \
  -v

echo ""
echo "Check your backend logs for the response!"
