# Environment Variables Setup

## Problem

The API server requires a `.env` file with Google OAuth credentials to run.

## Solution

Create a `.env` file at `packages/api/src/.env` with the following variables:

## Required Variables

```env
# Google OAuth Configuration (REQUIRED - server won't start without these)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-firebase-project-id.appspot.com

# GCP Project ID (if different from Firebase Project ID)
GOOGLE_PROJ_ID=your-gcp-project-id

# Server Configuration (Optional - has defaults)
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

# Session Configuration (Optional - has default)
SESSION_SECRET=your-random-secret-key-here

# Vertex AI Configuration (Optional - has defaults)
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
```

## Steps to Fix

1. **Create the file**: Create a new file named `.env` in `packages/api/src/` directory
2. **Add the variables**: Copy the template above and fill in your actual values
3. **Minimum required**: At minimum, you must have:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## Where to Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Configure the OAuth consent screen if you haven't already
6. Create an OAuth 2.0 Client ID for "Web application"
7. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
8. Copy the Client ID and Client Secret to your `.env` file

## File Location

The file should be located at:

```
packages/api/src/.env
```

Based on your project structure, the full path would be:

```
D:\Masters CSUEB\Sem -1\Web Systems\Project 2\project2_workplace\project2_final\project2\packages\api\src\.env
```

## Security Note

⚠️ **Never commit the `.env` file to git!** It contains sensitive credentials.
