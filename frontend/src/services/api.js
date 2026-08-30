const API_CONFIG = {
  AUTH_URL: 'http://localhost:4001',
  USER_URL: 'http://localhost:4002',
  CHAT_URL: 'http://localhost:4003',
};

/** Generic fetch wrapper with auth header injection and token refresh */
async function apiFetch(baseUrl, path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

  // If 401, try refreshing the token once
  if (res.status === 401 && !options._retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch(baseUrl, path, { ...options, _retried: true });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_CONFIG.AUTH_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ══════════════════════════════════════
   Auth Service (port 4001)
   ══════════════════════════════════════ */
export const authAPI = {
  register(phoneNumber) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  login(phoneNumber) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  upsert(phoneNumber) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/upsert', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  verify(phoneNumber, code) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/verify', {
      method: 'PATCH',
      body: JSON.stringify({ phoneNumber, code }),
    });
  },

  getMe() {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/me');
  },

  getByPhone(phoneNumber) {
    return apiFetch(API_CONFIG.AUTH_URL, `/auth?phoneNumber=${encodeURIComponent(phoneNumber)}`);
  },

  refresh(refreshToken) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  updateStatus(phoneNumber, status) {
    return apiFetch(API_CONFIG.AUTH_URL, '/auth/status', {
      method: 'PATCH',
      body: JSON.stringify({ phoneNumber, status }),
    });
  },
};

/* ══════════════════════════════════════
   User Service (port 4002)
   ══════════════════════════════════════ */
export const userAPI = {
  getUsers(page = 1, limit = 20) {
    return apiFetch(API_CONFIG.USER_URL, `/users?page=${page}&limit=${limit}`);
  },

  getUser(phoneNumber) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}`);
  },

  createUser(phoneNumber, name) {
    return apiFetch(API_CONFIG.USER_URL, '/users', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, name: name || phoneNumber }),
    });
  },

  searchUsers(query, page = 1, limit = 20) {
    return apiFetch(API_CONFIG.USER_URL, `/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },

  updateUser(phoneNumber, data) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updatePhoto(phoneNumber, photo) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}/photo`, {
      method: 'PATCH',
      body: JSON.stringify({ photo }),
    });
  },

  updateBio(phoneNumber, bio) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}/bio`, {
      method: 'PATCH',
      body: JSON.stringify({ bio }),
    });
  },

  updateStatus(phoneNumber, status) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deactivateUser(phoneNumber) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}/deactivate`, {
      method: 'PATCH',
    });
  },

  deleteUser(phoneNumber) {
    return apiFetch(API_CONFIG.USER_URL, `/users/${encodeURIComponent(phoneNumber)}`, {
      method: 'DELETE',
    });
  },
};

/* ══════════════════════════════════════
   Chat Service (port 4003)
   ══════════════════════════════════════ */
export const chatAPI = {
  getRooms() {
    return apiFetch(API_CONFIG.CHAT_URL, '/chats/rooms');
  },

  getRoomMessages(roomId, since = null) {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return apiFetch(API_CONFIG.CHAT_URL, `/chats/rooms/${roomId}/messages${query}`);
  },

  createOrFindRoom(otherPhoneNumber) {
    return apiFetch(API_CONFIG.CHAT_URL, '/chats/rooms', {
      method: 'POST',
      body: JSON.stringify({ otherPhoneNumber }),
    });
  },

  createGroupRoom(groupName, participants) {
    return apiFetch(API_CONFIG.CHAT_URL, '/chats/group', {
      method: 'POST',
      body: JSON.stringify({ groupName, participants }),
    });
  },

  sendMessage(roomId, content) {
    return apiFetch(API_CONFIG.CHAT_URL, `/chats/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};
