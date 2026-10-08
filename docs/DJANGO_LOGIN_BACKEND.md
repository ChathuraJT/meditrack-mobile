# Django Login Backend and Current-User API

This document describes the authentication implementation currently present in
the Django backend.

## Important implementation note

The mobile API does **not** currently use JWT or Django REST Framework token
authentication. It creates a Django database-backed session and returns the
session key as an access token:

```text
Authorization: Bearer <session-key>
```

The session key is accepted only by the custom
`MobileSessionAuthentication` class. It is not a JWT and must not be decoded as
one.

## 1. Django login view

The implementation is in
`backend/accounts/mobile_api.py` in the `mobile_login` view.

### Endpoint

```http
POST /mobile/auth/login/
Content-Type: application/json
```

### Request

```json
{
  "username": "username-or-email",
  "password": "user-password"
}
```

The login view:

- Accepts a username or email address.
- Performs case-insensitive matching.
- Trims the username/email identifier.
- Does not trim or modify the password.
- Rejects missing, non-string, overlong, or invalid values.
- Supports an exact username when multiple accounts share an email.
- Checks the password with Django's `check_password()`.
- Rejects inactive users.
- Rejects users whose `is_approved` value is false.
- Applies an anonymous login throttle of `10/min`.

### Successful response

```http
200 OK
Cache-Control: no-store
```

```json
{
  "access_token": "32-character-django-session-key",
  "token_type": "Bearer",
  "expires_at": "2026-10-15T16:50:00+00:00",
  "user": {
    "id": 123,
    "username": "patient-one",
    "email": "patient@example.com",
    "role": "patient",
    "doctorID": null,
    "lab_name": null,
    "license_id": null,
    "lab_address": null
  }
}
```

The session stores:

```text
mobile_user_id
mobile_auth_hash
```

The session expiry is controlled by `MOBILE_SESSION_AGE` in seconds. If that
setting is not defined, the implementation defaults to seven days.

### Error responses

Missing or invalid fields:

```http
400 Bad Request
```

```json
{
  "error": "Username and password are required."
}
```

Invalid credentials:

```http
401 Unauthorized
```

```json
{
  "error": "Invalid username or password."
}
```

Pending or unapproved account:

```http
403 Forbidden
```

```json
{
  "error": "Your account is pending administrator approval."
}
```

If an email is shared by multiple accounts and no exact username is supplied,
the server returns an invalid-credentials response rather than signing in an
ambiguous account.

## 2. Django login serializer

There is no dedicated login serializer in the current backend. The login view
reads and validates `request.data` directly.

The current file `backend/accounts/serializers.py` contains a `UserSerializer`
for user-model serialization:

```py
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "birthday",
            "NIC_number",
            "degrees",
            "university",
            "working_hospital",
            "created_at",
            "updated_at",
            "lab_name",
            "lab_address",
            "license_id",
        ]
```

This serializer is not used by `mobile_login`, `mobile_me`, or
`mobile_logout`. The mobile endpoints use the internal `profile(user)` helper
in `mobile_api.py` instead.

The serializer file also contains a `create()` function outside the serializer
class. It is therefore not the `UserSerializer.create()` method. If serializer-
based user creation is required later, move it inside the serializer class and
ensure every listed model field exists before using it.

## 3. Django URL configuration

### Project URL configuration

`backend/medicare_project/urls.py` includes the mobile URL module:

```py
from django.urls import include, path

urlpatterns = [
    path("mobile/", include("accounts.mobile_urls")),
    # Existing routes...
]
```

### Authentication and profile routes

`backend/accounts/mobile_urls.py` defines:

```py
from django.urls import path
from accounts.mobile_api import (
    mobile_doctors,
    mobile_login,
    mobile_logout,
    mobile_me,
)

urlpatterns = [
    path("auth/login/", mobile_login),
    path("auth/me/", mobile_me),
    path("auth/logout/", mobile_logout),
    path("doctors/", mobile_doctors),
]
```

The resulting endpoints are:

| Method | URL | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/mobile/auth/login/` | Public, throttled | Create a mobile session |
| `GET` | `/mobile/auth/me/` | Bearer session token | Return the current user |
| `POST` | `/mobile/auth/logout/` | Bearer session token | Delete the current mobile session |
| `GET` | `/mobile/doctors/` | Bearer session token | Return a paginated professional directory |

There is no `/api/auth/` route in the current Django URL configuration. A
client using `/api/auth/login/` will receive a routing failure until aliases or
new versioned routes are added.

The existing web-compatible routes remain separate:

```text
POST /login/
POST /create-user/
```

`/login/` uses the older `accounts.views.login_user` view and returns a profile
without an access token. It is not the same contract as
`/mobile/auth/login/`.

## 4. Current-user endpoint

### Endpoint

```http
GET /mobile/auth/me/
Authorization: Bearer <session-key>
```

### Successful response

```json
{
  "user": {
    "id": 123,
    "username": "patient-one",
    "email": "patient@example.com",
    "role": "patient",
    "doctorID": null,
    "lab_name": null,
    "license_id": null,
    "lab_address": null
  }
}
```

The endpoint is protected by:

```py
@authentication_classes([MobileSessionAuthentication])
@permission_classes([IsAuthenticated])
```

`MobileSessionAuthentication`:

1. Reads the `Authorization` header.
2. Requires exactly two parts.
3. Requires the `Bearer` scheme.
4. Requires a 32-character lowercase hexadecimal session key.
5. Loads the session from Django's database-backed session store.
6. Loads the user from `mobile_user_id`.
7. Verifies that the user is active and approved.
8. Compares the stored session authentication hash with the current user's
   session authentication hash.
9. Deletes the session when the account access state has changed.

Expired, malformed, revoked, or invalid sessions return `401 Unauthorized`.

## 5. Logout endpoint

### Request

```http
POST /mobile/auth/logout/
Authorization: Bearer <session-key>
```

### Response

```json
{
  "message": "Signed out."
}
```

The view deletes `request.auth`, which is the authenticated Django session.
After logout, the same access token must no longer authenticate requests.

## 6. User/profile model

The configured user model is `accounts.User`:

```py
class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True, null=True)
    NIC_number = models.CharField(max_length=12, unique=True, blank=True, null=True)
    birthday = models.DateField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True, null=True)
    degrees = models.CharField(max_length=100, blank=True, null=True)
    university = models.CharField(max_length=100, blank=True, null=True)
    working_hospital = models.CharField(max_length=150, blank=True, null=True)
    doctorID = models.CharField(max_length=50, blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    lab_name = models.CharField(max_length=150, blank=True, null=True)
    lab_address = models.CharField(max_length=255, blank=True, null=True)
    license_id = models.CharField(max_length=50, blank=True, null=True)
```

Current role choices are:

```text
doctor
patient
lab
```

The mobile profile helper returns:

```text
id
username
email
role
doctorID
lab_name
license_id
lab_address
```

It intentionally does not return passwords, password hashes, NIC numbers,
birthdays, or other private fields.

## 7. Relevant Django settings

### Custom user model

```py
AUTH_USER_MODEL = "accounts.User"
```

### REST Framework

The current global REST Framework configuration is:

```py
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "UNAUTHENTICATED_TOKEN": None,
}
```

Because the global authentication list is empty, the mobile views explicitly
declare `MobileSessionAuthentication` with `@authentication_classes(...)`.
Other protected endpoints must do the same or configure a project-wide
authentication class.

### Session configuration

The project includes Django session support:

```py
INSTALLED_APPS = [
    "django.contrib.sessions",
    # ...
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # ...
]
```

The mobile authentication implementation uses:

```py
from django.contrib.sessions.backends.db import SessionStore
```

No JWT package, JWT signing key, refresh-token endpoint, or JWT configuration is
present in the current settings.

### Mobile session lifetime

The mobile login view reads:

```py
seconds = getattr(settings, "MOBILE_SESSION_AGE", 7 * 24 * 60 * 60)
```

To set an explicit lifetime, add a server-side setting:

```py
MOBILE_SESSION_AGE = 7 * 24 * 60 * 60
```

Do not place session secrets or database credentials in frontend or mobile
configuration.

### CORS and deployment settings

The current settings enable credentials and define development origins:

```py
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

For staging and production, replace permissive development settings such as
`DEBUG = True` and `ALLOWED_HOSTS = ["*"]` with explicit deployment values.
Use HTTPS and secure WebSockets in production.

## 8. Client request example

After login, retain `access_token` and attach it to protected requests:

```ts
const response = await fetch(`${API_BASE_URL}/mobile/auth/me/`, {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
});
```

The token is a server-side session key. The client must treat it as opaque,
must not decode it, and must clear it after logout, expiry, or a `401` response.

## 9. Current implementation gaps

The current backend does not yet provide:

- `/api/auth/login/`, `/api/auth/refresh/`, or `/api/auth/logout/`.
- JWT access and refresh tokens.
- Refresh-token rotation or refresh-token reuse detection.
- A dedicated login serializer.
- A `/api/me/` route; the current route is `/mobile/auth/me/`.
- Clinical patient, prescription, medication, adherence, or recovery endpoints.
- Role values named `laboratory` or `administrator`; the current model uses
  `lab` and does not define an administrator role choice.

The Next.js client must therefore use the `/mobile/` session contract as written
above, unless the backend later introduces a versioned JWT contract.
