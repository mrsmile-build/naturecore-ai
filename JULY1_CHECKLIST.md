# Nature Core AI — July 1 Render Revival Checklist

## Step 1 — Wake up Render
Go to render.com → your service → Manual Deploy → Deploy latest commit
Wait 3-5 minutes for it to build

## Step 2 — Test backend is alive
curl https://naturecore-ai.onrender.com/
Should return: {"status":"Nature Core AI API Running","version":"2.0"}

## Step 3 — Test these pages in order
1. https://mrsmile-build.github.io/naturecore-ai/
   → Landing page with Features, Pricing, Contact

2. https://mrsmile-build.github.io/naturecore-ai/auth.html
   → Sign in with mrsmile4569@gmail.com

3. https://mrsmile-build.github.io/naturecore-ai/onboard.html
   → Onboarding quiz (6 steps)

4. https://mrsmile-build.github.io/naturecore-ai/app.html
   → Main app - plants should load, AI should work

5. https://mrsmile-build.github.io/naturecore-ai/academy.html
   → Academy levels

6. https://mrsmile-build.github.io/naturecore-ai/wisdom.html
   → African wisdom, signs, symbols

## Step 4 — Test AI chat
Ask: "What plants help diabetes?"
Should give structured expert answer

## Step 5 — Test Formulation Assistant
Click "Acne cream" quick button
Should generate a formula

## Step 6 — Test Academy
Click "Take Exam" on Level 1
Should generate 10 questions

## Step 7 — Give yourself admin access
Go to Supabase SQL Editor and run:
UPDATE profiles 
SET is_premium = true, 
    level = 4,
    premium_expiry = '2099-12-31'
WHERE email = 'mrsmile4569@gmail.com';

## Step 8 — Run more plants
cd ~/naturecore-ai && node runPopulate.js
(Adds more plants to database)

## What's working:
✅ Landing page professional
✅ Auth (signup/login/settings)
✅ 172+ African medicinal plants
✅ AI chat with PubMed citations
✅ Formulation Assistant
✅ Academy with exams and certificates
✅ African Wisdom page
✅ Onboarding quiz
✅ PWA (installable)
✅ Paystack payment

## What needs Render to test:
- AI chat responses
- Formulation generation
- Exam question generation
- Smart plant lookup

## Issues to fix when Render is back:
1. Test level-gated AI (free vs premium difference)
2. Test question count per account
3. Confirm PubMed citations showing in responses
4. Test onboarding saves to Supabase

## Current GitHub:
https://github.com/mrsmile-build/naturecore-ai

## Live site:
https://mrsmile-build.github.io/naturecore-ai/
