# Vercel Deployment Setup

## Environment Variables Configuration

For the screenshot upload feature to work on your deployed Vercel site, you need to configure the ImgBB API key as an environment variable.

### Step 1: Get Your ImgBB API Key

If you haven't already:
1. Go to https://api.imgbb.com/
2. Click "Get API Key"
3. Sign up with your email (free, no credit card required)
4. Copy your API key

Your current API key (from .env file): `1369fa0365731b13c5330a26fedf569c`

### Step 2: Configure Environment Variable in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (`zengmgrids` or whatever it's named)
3. Click on "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add a new environment variable:
   - **Name**: `VITE_IMGBB_API_KEY`
   - **Value**: `1369fa0365731b13c5330a26fedf569c` (or your ImgBB API key)
   - **Environments**: Check all three boxes (Production, Preview, Development)
6. Click "Save"

### Step 3: Redeploy

After adding the environment variable, you need to trigger a new deployment:
1. Go to "Deployments" tab
2. Click the three dots (...) on your latest deployment
3. Click "Redeploy"
4. Select "Use existing Build Cache" (faster) or redeploy from scratch

Alternatively, just push a new commit to trigger a deployment.

### Verification

To verify the environment variable is working on Vercel:
1. Open your deployed site's browser console
2. When you attempt to take a screenshot, check the console logs
3. You should see: `Environment check: { hasKey: true, keyLength: 32, ... }`
4. If `hasKey: false`, the environment variable is not configured correctly

### Important Notes

- Environment variables starting with `VITE_` are embedded into the client-side bundle at build time
- Changing environment variables requires a rebuild/redeploy
- The .env file is NOT deployed to Vercel - it's only for local development
- Never commit API keys to git (they're in .env which is .gitignored)

## Current Environment Variables

These are configured in your .env file (local development only):

```env
VITE_DEBUG=true
VITE_IMGBB_API_KEY=1369fa0365731b13c5330a26fedf569c
```

Both should be added to Vercel's environment variables for the deployed site to work correctly.
