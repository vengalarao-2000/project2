# Google Photos Integration Checklist

## Prerequisites

### 1. Environment Variables (Required in `packages/api/src/.env`)

- ✅ `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID
- ✅ `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret
- ⚠️ `GOOGLE_REDIRECT_URI` - **CRITICAL**: Must match exactly what's configured in Google Cloud Console
  - Default: `http://localhost:3000/oauth2callback`
  - Must be added to "Authorized redirect URIs" in Google Cloud Console

### 2. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", ensure you have:
   - `http://localhost:3000/oauth2callback` (for development)
6. Under "APIs & Services > Library", enable:
   - ✅ **Google Photos Picker API** (required)
   - ✅ **Google OAuth2 API** (usually auto-enabled)

## Flow Check

### Step 1: Connect Page → OAuth Initiation

- **File**: `packages/web/src/components/Connect.jsx`
- **Action**: User clicks "Google Photos" button
- **Expected**: Redirects to `${API_BASE}/auth/google`
- ✅ Working if: Browser redirects to Google OAuth consent screen

### Step 2: OAuth Callback

- **File**: `packages/api/src/routes/authRoutes.js`
- **Endpoint**: `GET /oauth2callback`
- **Expected**:
  1. Receives authorization code from Google
  2. Exchanges code for access tokens
  3. Stores tokens in session cookie
  4. Redirects to `${FRONTEND_ORIGIN}/dashboard`
- ✅ Working if: You land on dashboard page after signing in

### Step 3: Dashboard → Create Picker Session

- **File**: `packages/web/src/components/Dashboard.jsx`
- **Action**: User clicks "Pick from Google Photos" button
- **Endpoint**: `GET /api/picker/create-session`
- **Middleware**: `requireGoogle` (checks for session tokens)
- **Expected**:
  1. Creates Google Photos Picker session
  2. Returns `pickerUri` and `sessionId`
  3. Opens picker in popup window
- ✅ Working if: Google Photos picker popup opens

### Step 4: Poll for Selected Photos

- **File**: `packages/web/src/components/Dashboard.jsx`
- **Endpoint**: `GET /api/picker/poll-session?sessionId=xxx`
- **Expected**:
  1. Polls every 2 seconds
  2. When `mediaItemsSet === true`, fetches selected photos
  3. Returns photo metadata (id, baseUrl, thumbUrl, etc.)
  4. Closes popup
  5. Saves photos to session via `POST /api/session/draft`
- ✅ Working if: Selected photos appear in "Unprocessed Items" section

## Common Issues & Fixes

### Issue 1: "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"

**Fix**: Create `.env` file at `packages/api/src/.env` with required variables

### Issue 2: "Redirect URI mismatch"

**Error**: "redirect_uri_mismatch" in OAuth flow
**Fix**:

1. Check `GOOGLE_REDIRECT_URI` in `.env` matches Google Cloud Console
2. In Google Cloud Console, add the exact redirect URI to "Authorized redirect URIs"
3. Common mistake: Trailing slash differences (`/oauth2callback` vs `/oauth2callback/`)

### Issue 3: "not_authenticated_google" (401 error)

**Cause**: Session tokens not found or expired
**Fix**:

1. Check if cookies are being sent (`credentials: "include"` in fetch calls)
2. Verify session cookie is set after OAuth callback
3. Check `SESSION_SECRET` in `.env` is set (defaults to "dev-secret")

### Issue 4: "Popup blocked"

**Cause**: Browser blocking popup windows
**Fix**: Allow popups for your domain, or check if popup was blocked

### Issue 5: Google Photos Picker API not enabled

**Error**: "API not enabled" or 403 error
**Fix**: Enable "Google Photos Picker API" in Google Cloud Console

### Issue 6: Session tokens expired

**Cause**: Access token expired and refresh token not working
**Fix**:

- Check if `access_type: "offline"` is set in OAuth request (✅ it is)
- User may need to re-authenticate

## Testing Steps

1. **Start the API server**:

   ```bash
   cd packages/api
   npm run dev
   ```

   ✅ Should start without errors

2. **Start the web server**:

   ```bash
   cd packages/web
   npm run dev
   ```

   ✅ Should start on http://localhost:5173

3. **Test OAuth Flow**:

   - Navigate to `/connect`
   - Click "Google Photos"
   - Sign in with Google
   - ✅ Should redirect to `/dashboard`

4. **Test Picker**:

   - Click "Pick from Google Photos" button
   - ✅ Popup should open with Google Photos picker
   - Select photos and click "Select"
   - ✅ Photos should appear in "Unprocessed Items" section

5. **Debug Endpoint** (Optional):
   - Visit `http://localhost:3000/api/debug/session`
   - ✅ Should return `{"hasTokens": true}` if authenticated

## Code Files Involved

### Backend

- `packages/api/src/routes/authRoutes.js` - OAuth endpoints
- `packages/api/src/routes/pickerRoutes.js` - Photos picker endpoints
- `packages/api/src/services/googleAuth.js` - OAuth client setup
- `packages/api/src/middleware/auth.js` - Authentication middleware

### Frontend

- `packages/web/src/components/Connect.jsx` - OAuth initiation
- `packages/web/src/components/Dashboard.jsx` - Picker integration
- `packages/web/src/config/api.js` - API base URL configuration
