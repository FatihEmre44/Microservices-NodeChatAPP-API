# Auth Service API

This service provides authentication endpoints for the WPCLONE project.

## Base URL

- http://localhost:4001/auth

## Endpoints

### 1. Register auth record

**POST** `/auth/register`

Create an auth record for a phone number.

Request body:

```json
{
  "phoneNumber": "+905551234567"
}
```

Response:

```json
{
  "success": true,
  "message": "Auth record created",
  "data": {
    "phoneNumber": "+905551234567",
    "status": "active"
  }
}
```

### 2. Upsert auth record

**POST** `/auth/upsert`

Ensure an auth record exists for the provided phone number.

Request body:

```json
{
  "phoneNumber": "+905551234567"
}
```

### 3. Login

**POST** `/auth/login`

Authenticate a user by phone number and return JWT tokens.

Request body:

```json
{
  "phoneNumber": "+905551234567"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "auth": {
      "phoneNumber": "+905551234567",
      "status": "active"
    },
    "accessToken": "<access-token>",
    "refreshToken": "<refresh-token>"
  }
}
```

### 4. Refresh tokens

**POST** `/auth/refresh`

Exchange a refresh token for a new access token and refresh token.

Request body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

### 5. Get current auth

**GET** `/auth/me`

Return the authenticated user's auth record.

Headers:

```http
Authorization: Bearer <access-token>
```

### 6. Verify auth

**PATCH** `/auth/verify`

Mark an auth record as verified.

Request body:

```json
{
  "code": "123456"
}
```

### 7. Update status

**PATCH** `/auth/status`

Update the auth status.

Request body:

```json
{
  "phoneNumber": "+905551234567",
  "status": "active"
}
```

### 8. Add refresh token

**POST** `/auth/token`

Add a refresh token to the auth record.

### 9. Remove refresh token

**DELETE** `/auth/token`

Remove a refresh token from the auth record.

### 10. Clear refresh tokens

**DELETE** `/auth/tokens`

Clear all refresh tokens for the auth record.

## Environment Variables

The service reads values from the local `.env` file in this folder.

Example:

```env
PORT=4001
MONGODB_URI=mongodb://127.0.0.1:27017/authservice
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Notes

- The service uses JWT-based authentication.
- Login returns both access and refresh tokens.
- Protected routes should use the `Authorization: Bearer <access-token>` header.
