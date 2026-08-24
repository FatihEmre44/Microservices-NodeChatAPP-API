# Chat Service API

Real-time chat microservice for the WPCLONE project. Supports direct messages, group rooms, and real-time messaging via Socket.io. Communicates with other services (auth, user) through RabbitMQ events.

## Base URL

- **REST API**: `http://localhost:4003/chats`
- **Socket.io**: `ws://localhost:4003`
- **Health check**: `http://localhost:4003/health`

## Authentication

All REST endpoints under `/chats` and all Socket.io connections require a valid JWT token issued by the auth service.

### REST API

Include the token in the `Authorization` header:

```http
Authorization: Bearer <access-token>
```

### Socket.io

Pass the token during the handshake:

```js
const socket = io('ws://localhost:4003', {
  auth: { token: '<access-token>' },
});
```

Alternatively, use the `Authorization` header:

```js
const socket = io('ws://localhost:4003', {
  extraHeaders: { Authorization: 'Bearer <access-token>' },
});
```

---

## REST Endpoints

### 1. Health check

**GET** `/health`

Returns the service status. No authentication required.

Response:

```json
{
  "status": "ok",
  "service": "chatservice"
}
```

---

### 2. Get rooms

**GET** `/chats/rooms`

List all direct and group rooms for the authenticated user.

Headers:

```http
Authorization: Bearer <access-token>
```

Response:

```json
{
  "success": true,
  "data": {
    "directRooms": [
      {
        "_id": "664a1b2c3d4e5f6a7b8c9d0e",
        "participants": ["+905551234567", "+905559876543"],
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "groupRooms": [
      {
        "_id": "664a1b2c3d4e5f6a7b8c9d0f",
        "participants": ["+905551234567", "+905559876543", "+905551112233"],
        "adminIds": ["+905551234567"],
        "groupName": "Project Team",
        "groupPhoto": null,
        "createdAt": "2025-01-15T11:00:00.000Z",
        "updatedAt": "2025-01-15T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. Create or find direct room

**POST** `/chats/rooms`

Create a new direct room between the authenticated user and another phone number. If a room already exists, it is returned instead.

Headers:

```http
Authorization: Bearer <access-token>
```

Request body:

```json
{
  "otherPhoneNumber": "+905559876543"
}
```

Response (`201 Created`):

```json
{
  "success": true,
  "message": "Room ready",
  "data": {
    "roomType": "direct",
    "room": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "participants": ["+905551234567", "+905559876543"],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

Validation:

- `otherPhoneNumber` is required and must be a non-empty string.
- `otherPhoneNumber` must differ from the authenticated user's phone number.

---

### 4. Create group room

**POST** `/chats/group`

Create a new group room. The authenticated user is automatically added as a participant and admin.

Headers:

```http
Authorization: Bearer <access-token>
```

Request body:

```json
{
  "groupName": "Project Team",
  "participants": ["+905559876543", "+905551112233"],
  "adminIds": ["+905559876543"],
  "groupPhoto": "https://example.com/photo.jpg"
}
```

| Field          | Type     | Required | Description                                            |
|----------------|----------|----------|--------------------------------------------------------|
| `groupName`    | string   | Yes      | Name of the group                                      |
| `participants` | string[] | Yes      | Phone numbers to add (owner is added automatically)    |
| `adminIds`     | string[] | No       | Additional admins (owner is always an admin)           |
| `groupPhoto`   | string   | No       | URL to the group photo                                 |

Response (`201 Created`):

```json
{
  "success": true,
  "message": "Group room created",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0f",
    "participants": ["+905551234567", "+905559876543", "+905551112233"],
    "adminIds": ["+905551234567", "+905559876543"],
    "groupName": "Project Team",
    "groupPhoto": "https://example.com/photo.jpg",
    "createdAt": "2025-01-15T11:00:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

Validation:

- `groupName` is required and must be a non-empty string.
- The group must have at least two participants (including the owner).

---

### 5. Get room messages

**GET** `/chats/rooms/:roomId/messages`

Retrieve messages in a room. The authenticated user must be a participant.

Headers:

```http
Authorization: Bearer <access-token>
```

Query parameters:

| Parameter | Type   | Required | Description                                          |
|-----------|--------|----------|------------------------------------------------------|
| `since`   | string | No       | ISO 8601 timestamp; returns only messages after this |

Example request:

```
GET /chats/rooms/664a1b2c3d4e5f6a7b8c9d0e/messages?since=2025-01-15T10:30:00.000Z
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d10",
      "roomId": "664a1b2c3d4e5f6a7b8c9d0e",
      "roomType": "direct",
      "senderId": "+905551234567",
      "content": "Hello!",
      "createdAt": "2025-01-15T10:31:00.000Z",
      "updatedAt": "2025-01-15T10:31:00.000Z"
    }
  ]
}
```

---

### 6. Send message via REST

**POST** `/chats/rooms/:roomId/messages`

Send a message to a room. The authenticated user must be a participant.

Headers:

```http
Authorization: Bearer <access-token>
```

Request body:

```json
{
  "content": "Hello!"
}
```

Response (`201 Created`):

```json
{
  "success": true,
  "message": "Message added",
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d10",
    "roomId": "664a1b2c3d4e5f6a7b8c9d0e",
    "roomType": "direct",
    "senderId": "+905551234567",
    "content": "Hello!",
    "createdAt": "2025-01-15T10:31:00.000Z",
    "updatedAt": "2025-01-15T10:31:00.000Z"
  }
}
```

---

## Socket.io Events

### Connection

On successful connection, the server automatically joins the socket to all group rooms the user is a participant of. Multi-device is supported — multiple sockets for the same phone number are tracked independently.

### Client → Server

#### `sendMessage`

Send a real-time message. The server validates room access, persists the message, and broadcasts it.

Payload:

```json
{
  "roomId": "664a1b2c3d4e5f6a7b8c9d0e",
  "content": "Hello!"
}
```

Acknowledgement callback:

```json
// Success
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d10",
    "roomId": "664a1b2c3d4e5f6a7b8c9d0e",
    "roomType": "direct",
    "senderId": "+905551234567",
    "content": "Hello!",
    "createdAt": "2025-01-15T10:31:00.000Z"
  }
}

// Error
{
  "success": false,
  "message": "Room not found or access denied"
}
```

### Server → Client

#### `newMessage`

Emitted when a new message is sent in a room the user is a participant of.

Payload:

```json
{
  "_id": "664a1b2c3d4e5f6a7b8c9d10",
  "roomId": "664a1b2c3d4e5f6a7b8c9d0e",
  "roomType": "direct",
  "senderId": "+905551234567",
  "content": "Hello!",
  "createdAt": "2025-01-15T10:31:00.000Z"
}
```

**Delivery behavior:**

| Room Type | Sender's socket | Sender's other devices | Other participants |
|-----------|-----------------|------------------------|--------------------|
| `direct`  | ✅ receives      | ✅ receives             | ✅ receives         |
| `group`   | ✅ (via room broadcast) | ✅ (via room broadcast) | ✅ (via room broadcast) |

---

## Data Models

### DirectRoom

| Field          | Type     | Description                                  |
|----------------|----------|----------------------------------------------|
| `_id`          | ObjectId | Unique room identifier                       |
| `participants` | string[] | Exactly 2 phone numbers                      |
| `createdAt`    | Date     | Auto-generated timestamp                     |
| `updatedAt`    | Date     | Auto-generated timestamp                     |

### GroupRoom

| Field          | Type     | Description                                  |
|----------------|----------|----------------------------------------------|
| `_id`          | ObjectId | Unique room identifier                       |
| `participants` | string[] | At least 2 phone numbers                     |
| `adminIds`     | string[] | Phone numbers with admin privileges          |
| `groupName`    | string   | Display name for the group                   |
| `groupPhoto`   | string   | Optional URL to group photo                  |
| `createdAt`    | Date     | Auto-generated timestamp                     |
| `updatedAt`    | Date     | Auto-generated timestamp                     |

### Message

| Field       | Type     | Description                                     |
|-------------|----------|-------------------------------------------------|
| `_id`       | ObjectId | Unique message identifier                       |
| `roomId`    | ObjectId | Reference to DirectRoom or GroupRoom             |
| `roomType`  | string   | `"direct"` or `"group"`                          |
| `senderId`  | string   | Phone number of the sender                       |
| `content`   | string   | Message text content                             |
| `createdAt` | Date     | Auto-generated timestamp                         |
| `updatedAt` | Date     | Auto-generated timestamp                         |

### UserCache

Local cache of user profiles synced from the user service via RabbitMQ events.

| Field         | Type   | Description                           |
|---------------|--------|---------------------------------------|
| `phoneNumber` | string | Unique phone number (indexed)         |
| `name`        | string | Display name                          |
| `photo`       | string | Optional profile photo URL            |
| `createdAt`   | Date   | Auto-generated timestamp              |
| `updatedAt`   | Date   | Auto-generated timestamp              |

---

## RabbitMQ Integration

### Exchanges

| Exchange            | Type  | Purpose                                 |
|---------------------|-------|-----------------------------------------|
| `chat.events`       | topic | Publish chat-related events             |
| `auth.events`       | topic | Consume auth events (e.g. `auth.created`) |
| `user.events`       | topic | Consume user events (e.g. `user.updated`) |
| `chat.events.dlx`   | topic | Dead-letter exchange for failed messages |

### Queues

| Queue                | Bindings                                     | Description                    |
|----------------------|----------------------------------------------|--------------------------------|
| `chat.events.queue`  | `chat.#`, `auth.#`, `user.#`                 | Main consumer queue            |
| `chat.events.dlq`    | Bound to `chat.events.dlx`                   | Dead-letter queue              |

### Published events

| Event                  | Routing Key            | Trigger                      |
|------------------------|------------------------|------------------------------|
| `chat.created`         | `chat.created`         | Direct room created          |
| `chat.group.created`   | `chat.group.created`   | Group room created           |
| `chat.message.created` | `chat.message.created` | Message sent via REST API    |

### Consumed events

| Event          | Action                                                |
|----------------|-------------------------------------------------------|
| `auth.created` | Creates or updates a UserCache record                 |
| `user.updated` | Updates the UserCache record with new name/photo      |

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error description"
}
```

| Status | Description                                         |
|--------|-----------------------------------------------------|
| `400`  | Validation error (missing field, invalid input)     |
| `401`  | Missing or invalid JWT token                        |
| `403`  | Not a participant of the requested room             |
| `404`  | Room or route not found                             |
| `500`  | Internal server error                               |

---

## Environment Variables

The service reads values from the local `.env` file in this folder.

```env
PORT=4003
MONGODB_URI=mongodb://127.0.0.1:27017/chatservice
JWT_SECRET=authservice-secret
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
USERSERVICE_URL=http://localhost:4002
```

| Variable          | Default                                    | Description                            |
|-------------------|--------------------------------------------|----------------------------------------|
| `PORT`            | `4003`                                     | HTTP server port                       |
| `MONGODB_URI`     | `mongodb://127.0.0.1:27017/chatservice`    | MongoDB connection string              |
| `JWT_SECRET`      | `authservice-secret`                       | Shared JWT secret with auth service    |
| `RABBITMQ_URL`    | `amqp://guest:guest@127.0.0.1:5672`        | RabbitMQ connection URL                |
| `USERSERVICE_URL` | `http://localhost:4002`                     | User service base URL for HTTP lookups |

---

## Run Locally

```bash
npm install
npm start
```

## Run with Docker Compose

From the project root:

```bash
docker compose up --build chatservice
```

This starts the chat service along with its MongoDB and RabbitMQ dependencies.
