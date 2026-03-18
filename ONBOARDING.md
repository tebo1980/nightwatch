# BaraTrust Nightwatch — Client Onboarding Guide

## What you need from the client before starting:

- Business name
- What they want the agent's name to be (or suggest Aria, Alex, Jordan, Casey)
- All cities and zip codes they serve
- Their services and rough price ranges for each
- Business hours
- Whether they offer emergency service
- Their Go High Level webhook URL (get from GHL under Settings > Integrations > Webhooks — can add later)

## Setup steps:

1. Log into nightwatch.baratrust.com
2. Click the + button in the top right
3. Fill in Step 1 — Business Basics (use info from client intake)
4. Fill in Step 2 — Service Area & Hours (be specific with zip codes)
5. Fill in Step 3 — Add every service they offer and a realistic price range for each
6. Fill in Step 4 — Paste the GHL webhook URL if they have it, or skip for now
7. Step 5 — Review the system prompt preview. Does it sound right? Does it know the business?
8. Click Save & Activate
9. Copy the embed code from the client card on the dashboard
10. Add the embed code to the client's website:
    - For cPanel HTML sites: paste just before the closing </body> tag
    - For WordPress: use a plugin like "Header and Footer Scripts"
    - For Wix/Squarespace: use their custom code injection feature
11. Open the client's website on your phone and test it
    - Click the chat button
    - Describe a problem (e.g. "my drain is clogged")
    - Make sure the agent asks good follow-up questions
    - Make sure the pricing sounds right
    - Go through the full flow and provide fake contact info
    - Confirm the test lead appears in the Nightwatch admin
12. If GHL is configured, click "Send Test Lead" and confirm it appears in GHL
13. Show the client the admin dashboard
    - Show them the Leads page
    - Show them how to read the conversation summary
    - Explain they will get a text notification for each new lead (configure this in GHL)
14. You're done. Nightwatch is live.

## What to do when GHL is not yet set up:

Leads are still saved in the Nightwatch database. You can manually enter them into whatever CRM the client uses. Set up GHL when they're ready — click Edit on the client card and add the webhook URL.

## Troubleshooting:

- Widget not appearing: Check that the embed code is in the right place and the clientId matches
- Agent giving wrong prices: Edit the client and update the pricing ranges in Step 3
- Leads not going to GHL: Click "Send Test Lead" — if that fails check the webhook URL is correct in GHL
- Agent seems confused: Check the service area and job types are filled in completely
