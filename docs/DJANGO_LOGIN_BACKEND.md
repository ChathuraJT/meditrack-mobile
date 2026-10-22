# Django authentication used by the Expo app

The current backend uses Django cookie sessions, not bearer access tokens.

- `GET /session/` returns `{ user, csrfToken }`; `user` is null when signed out.
- `POST /login/` accepts `{ username, password }` and sets the session cookie.
  Its response contains user fields at the top level, without `access_token`.
- `POST /logout/` revokes the cookie session.

The client includes cookies on every request and obtains a fresh CSRF token
from `/session/` before writes, sending it in `X-CSRFToken`. After login it
checks `/session/` again before opening protected screens. Startup restores
from the server session without requiring a legacy SecureStore bearer token.
Logout must succeed on the server before the app reports that it signed out.

## Local setup

Run Django from its backend directory:

```powershell
.\Venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Set the mobile project's ignored `.env` to the computer's current Wi-Fi IP:

```dotenv
EXPO_PUBLIC_DJANGO_API_URL=http://<computer-Wi-Fi-IP>:8000
```

Expo serves the application on port 8081; it does not serve the Django API.
Keep both servers running and fully reload Expo Go after environment changes.
Phone and computer must be on the same reachable network.

Browser previews additionally require the exact Expo origin in Django's
`CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. Use the same hostname for
Expo and Django so Django's SameSite cookies work during HTTP development.
Do not disable CSRF protection. Production requires HTTPS.

## Verification

Run `npm test`, `npm run typecheck`, and `npm run lint`. Device acceptance:
login with an existing approved account, reload and confirm restoration,
sign out, reload and confirm patient screens stay inaccessible. Check invalid
passwords, offline requests, and expired sessions. Unit tests do not establish
native cookie persistence or a real account's successful login.
