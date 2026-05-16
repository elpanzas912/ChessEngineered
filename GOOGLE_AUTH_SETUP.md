# Google Auth Setup for ChessPeps

## Status
Google OAuth is currently **disabled** in your Supabase project.

## How to Enable

### 1. Go to Supabase Dashboard
- URL: https://app.supabase.com/project/mvvnqkixgxjblgyrnvte
- Navigate to: **Authentication** → **Providers**

### 2. Enable Google Provider
- Find **Google** in the list
- Toggle **Enable**

### 3. Get Google OAuth Credentials
You need to create OAuth 2.0 credentials in Google Cloud Console:

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen:
   - User Type: External
   - App name: ChessPeps
   - User support email: your email
   - Developer contact: your email
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: ChessPeps Web
   - Authorized redirect URIs: `https://mvvnqkixgxjblgyrnvte.supabase.co/auth/v1/callback`
   - Also add for local dev: `http://localhost:8080/openings.html`
7. Copy **Client ID** and **Client Secret**

### 4. Configure in Supabase
- Paste **Client ID** in Supabase Google provider settings
- Paste **Client Secret** in Supabase Google provider settings
- Save

### 5. Test
1. Open http://localhost:8080/openings.html
2. Click **Log in**
3. Click **Continue with Google**
4. Should redirect to Google sign-in page

## Troubleshooting

If Google button doesn't work:
- Check browser console for errors
- Verify Client ID and Secret are correct
- Ensure redirect URI matches exactly
- Check that Google provider is enabled in Supabase

## Current Implementation
The frontend code is ready and includes:
- Google OAuth button in login modal
- Proper redirect handling
- Session persistence
- Works on both `openings.html` and `opening.html`
