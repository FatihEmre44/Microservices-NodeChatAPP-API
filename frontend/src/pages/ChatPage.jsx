import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatAPI, userAPI } from '../services/api';
import { getSocket } from '../services/socket';
import './ChatPage.css';

/* ── Helpers ── */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getRoomName(room, myPhone, userCache = {}) {
  if (room.groupName) return room.groupName;
  if (room.participants) {
    const other = room.participants.find((p) => p !== myPhone);
    if (!other) return 'Unknown';
    return userCache[other] || other;
  }
  return 'Chat';
}

function getRoomId(room) {
  if (!room) return null;
  // createOrFindRoom returns { roomType, room: {...} }
  return room._id || room.room?._id;
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const phoneNumber = user?.phoneNumber;

  // ── State ──
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Modals
  const [showNewChat, setShowNewChat] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  // New chat form
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatError, setNewChatError] = useState('');

  // Group form
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState('');
  const [groupError, setGroupError] = useState('');

  // Profile
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // User search
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // User cache
  const [usersCache, setUsersCache] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Load rooms ── */
  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const res = await chatAPI.getRooms();
      const data = res.data || {};
      const allRooms = [
        ...(Array.isArray(data) ? data : []),
        ...(Array.isArray(data.directRooms) ? data.directRooms : []),
        ...(Array.isArray(data.groupRooms) ? data.groupRooms : []),
      ];
      setRooms(allRooms);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /* ── Fetch unknown user profiles ── */
  useEffect(() => {
    const unknownPhones = new Set();
    
    // Check rooms
    rooms.forEach((r) => {
      if (r.participants) {
        r.participants.forEach((p) => {
          if (p !== phoneNumber && !usersCache[p]) {
            unknownPhones.add(p);
          }
        });
      }
    });

    // Check messages
    messages.forEach((m) => {
      if (m.senderId && m.senderId !== phoneNumber && !usersCache[m.senderId]) {
        unknownPhones.add(m.senderId);
      }
    });

    if (unknownPhones.size > 0) {
      const phones = Array.from(unknownPhones);
      phones.forEach((p) => {
        // Optimistic update to prevent spam
        setUsersCache((prev) => ({ ...prev, [p]: p }));
        userAPI.getUser(p)
          .then((res) => {
            if (res.data?.name) {
              setUsersCache((prev) => ({ ...prev, [p]: res.data.name }));
            }
          })
          .catch(() => {});
      });
    }
  }, [rooms, messages, usersCache, phoneNumber]);

  /* ── Load user profile ── */
  useEffect(() => {
    if (!phoneNumber) return;
    userAPI.getUser(phoneNumber)
      .then((res) => {
        setProfile(res.data);
        setProfileName(res.data?.name || '');
        setProfileBio(res.data?.bio || '');
      })
      .catch(() => {});
  }, [phoneNumber]);

  /* ── Load messages for active room ── */
  useEffect(() => {
    if (!activeRoom) return;
    let cancelled = false;
    const roomId = getRoomId(activeRoom);
    if (!roomId) return;

    async function load() {
      try {
        setLoadingMessages(true);
        const res = await chatAPI.getRoomMessages(roomId);
        if (!cancelled) setMessages(res.data || []);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeRoom]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Socket.io listener ── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleNewMessage(msg) {
      const roomId = getRoomId(activeRoom);
      if (activeRoom && msg.roomId === roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
      loadRooms();
    }

    socket.on('newMessage', handleNewMessage);
    return () => socket.off('newMessage', handleNewMessage);
  }, [activeRoom, loadRooms]);

  /* ── Send message ── */
  async function handleSend(e) {
    e.preventDefault();
    const content = messageInput.trim();
    const roomId = getRoomId(activeRoom);
    if (!content || !roomId) return;

    setMessageInput('');
    const socket = getSocket();

    if (socket?.connected) {
      socket.emit('sendMessage', { roomId, content }, (ack) => {
        if (!ack?.success) console.error('sendMessage failed:', ack?.message);
      });
    } else {
      try {
        await chatAPI.sendMessage(roomId, content);
        const res = await chatAPI.getRoomMessages(roomId);
        setMessages(res.data || []);
      } catch (err) {
        console.error('Send failed:', err);
      }
    }
  }

  /* ── New direct chat ── */
  async function handleNewChat(e) {
    e.preventDefault();
    const target = newChatPhone.trim();
    if (!target) return;
    setNewChatError('');

    try {
      const res = await chatAPI.createOrFindRoom(target);
      // Response: { data: { roomType, room } }
      const roomData = res.data?.room || res.data;
      setShowNewChat(false);
      setNewChatPhone('');
      await loadRooms();
      setActiveRoom(roomData);
    } catch (err) {
      setNewChatError(err.message || 'Failed to create chat');
    }
  }

  /* ── New group chat ── */
  async function handleNewGroup(e) {
    e.preventDefault();
    const name = groupName.trim();
    const participants = groupParticipants
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (!name) { setGroupError('Group name is required'); return; }
    if (participants.length < 1) { setGroupError('Add at least one participant'); return; }
    setGroupError('');

    try {
      const res = await chatAPI.createGroupRoom(name, participants);
      setShowGroupChat(false);
      setGroupName('');
      setGroupParticipants('');
      await loadRooms();
      setActiveRoom(res.data);
    } catch (err) {
      setGroupError(err.message || 'Failed to create group');
    }
  }

  /* ── Profile save ── */
  async function handleProfileSave() {
    setProfileSaving(true);
    try {
      const res = await userAPI.updateUser(phoneNumber, {
        name: profileName.trim() || phoneNumber,
        bio: profileBio.trim(),
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Profile update failed:', err);
    } finally {
      setProfileSaving(false);
    }
  }

  /* ── User search ── */
  async function handleUserSearch(e) {
    e?.preventDefault();
    const q = userSearchQuery.trim();
    if (!q) return;
    setUserSearchLoading(true);
    try {
      const res = await userAPI.searchUsers(q);
      const data = res.data;
      setUserSearchResults(Array.isArray(data) ? data : data?.users || data?.docs || []);
    } catch (err) {
      console.error('Search failed:', err);
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }

  async function startChatWithUser(targetPhone) {
    try {
      const res = await chatAPI.createOrFindRoom(targetPhone);
      const roomData = res.data?.room || res.data;
      setShowUserSearch(false);
      setUserSearchQuery('');
      setUserSearchResults([]);
      await loadRooms();
      setActiveRoom(roomData);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  }

  /* ── Filter rooms ── */
  const filteredRooms = rooms.filter((r) => {
    if (!sidebarSearch.trim()) return true;
    const name = getRoomName(r, phoneNumber, usersCache).toLowerCase();
    return name.includes(sidebarSearch.toLowerCase());
  });

  /* ── Group messages by date ── */
  function groupMessagesByDate(msgs) {
    const groups = [];
    let currentDate = null;
    for (const msg of msgs) {
      const date = formatDate(msg.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ type: 'date', date });
      }
      groups.push({ type: 'message', ...msg });
    }
    return groups;
  }

  const displayName = profile?.name || phoneNumber;

  return (
    <div className="chat-layout">
      {/* ════════ SIDEBAR ════════ */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-user" onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
            <div className="avatar avatar-sm">
              {getInitials(displayName)}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-name">{displayName}</span>
              <span className="sidebar-phone">{phoneNumber}</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="icon-btn" title="Search users" onClick={() => setShowUserSearch(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            </button>
            <button className="icon-btn" title="New group" onClick={() => setShowGroupChat(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </button>
            <button className="icon-btn" title="New chat" onClick={() => setShowNewChat(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
            </button>
            <button className="icon-btn" title="Logout" onClick={logout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-input-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search chats..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} />
          </div>
        </div>

        {/* Room list */}
        <div className="room-list">
          {loadingRooms ? (
            <div className="room-skeleton">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-item">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-text">
                    <div className="skeleton-line w60" />
                    <div className="skeleton-line w40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="empty-rooms">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <p>No chats yet</p>
              <span>Start a new conversation</span>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const rid = getRoomId(room);
              const isGroup = !!room.groupName;
              return (
                <button
                  key={rid}
                  className={`room-item ${getRoomId(activeRoom) === rid ? 'active' : ''}`}
                  onClick={() => setActiveRoom(room)}
                >
                  <div className={`avatar ${isGroup ? 'avatar-group' : ''}`}>
                    {isGroup ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                    ) : (
                      getInitials(getRoomName(room, phoneNumber, usersCache))
                    )}
                  </div>
                  <div className="room-info">
                    <div className="room-name">{getRoomName(room, phoneNumber, usersCache)}</div>
                    <div className="room-meta">
                      {isGroup && <span className="room-badge">Group · {room.participants?.length || 0}</span>}
                      {!isGroup && <span className="room-badge">Direct</span>}
                    </div>
                  </div>
                  {room.updatedAt && (
                    <span className="room-time">{formatTime(room.updatedAt)}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ════════ MAIN CHAT AREA ════════ */}
      <main className="chat-main">
        {!activeRoom ? (
          <div className="chat-empty">
            <div className="chat-empty-inner animate-fade-in">
              <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="var(--primary)" opacity="0.08"/>
                <path d="M24 8C15.16 8 8 14.83 8 23.25c0 2.96.87 5.72 2.37 8.05L8 40l9.07-2.3A16.07 16.07 0 0024 38.5C32.84 38.5 40 31.67 40 23.25S32.84 8 24 8z" fill="var(--primary)" opacity="0.15"/>
              </svg>
              <h2>WPClone Web</h2>
              <p>Send and receive messages without keeping your phone online.</p>
              <span>Select a chat or start a new conversation</span>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="chat-back-btn" onClick={() => setActiveRoom(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className={`avatar avatar-sm ${activeRoom.groupName ? 'avatar-group' : ''}`}>
                {activeRoom.groupName ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                ) : (
                  getInitials(getRoomName(activeRoom, phoneNumber, usersCache))
                )}
              </div>
              <div className="chat-header-info">
                <h3>{getRoomName(activeRoom, phoneNumber, usersCache)}</h3>
                {activeRoom.groupName && activeRoom.participants && (
                  <span className="chat-header-sub">
                    {activeRoom.participants.join(', ')}
                  </span>
                )}
                {!activeRoom.groupName && (
                  <span className="chat-header-sub">Direct message</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {loadingMessages ? (
                <div className="messages-loading">
                  <div className="spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div className="messages-empty">
                  <p>No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                groupMessagesByDate(messages).map((item, idx) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`date-${idx}`} className="message-date-divider">
                        <span>{item.date}</span>
                      </div>
                    );
                  }
                  const isMine = item.senderId === phoneNumber;
                  return (
                    <div key={item._id || idx} className={`message-row ${isMine ? 'sent' : 'received'}`}>
                      <div className="message-bubble">
                        {!isMine && activeRoom.groupName && (
                          <span className="message-sender">{usersCache[item.senderId] || item.senderId}</span>
                        )}
                        <span className="message-content">{item.content}</span>
                        <span className="message-time">{formatTime(item.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-bar" onSubmit={handleSend}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </>
        )}
      </main>

      {/* ════════ NEW DIRECT CHAT MODAL ════════ */}
      {showNewChat && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowNewChat(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Chat</h3>
              <button className="icon-btn" onClick={() => { setShowNewChat(false); setNewChatError(''); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleNewChat} className="modal-body">
              <p className="modal-desc">Enter a phone number to start a direct conversation.</p>
              <div className="input-group">
                <div className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.66 2.35a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.75.3 1.54.53 2.35.66A2 2 0 0122 16.92z"/></svg>
                </div>
                <input type="text" placeholder="+90 555 000 0000" value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value)} autoFocus />
              </div>
              {newChatError && <div className="modal-error">{newChatError}</div>}
              <button type="submit" className="btn-primary" disabled={!newChatPhone.trim()}>Start Chat</button>
            </form>
          </div>
        </div>
      )}

      {/* ════════ NEW GROUP CHAT MODAL ════════ */}
      {showGroupChat && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowGroupChat(false)}>
          <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Group</h3>
              <button className="icon-btn" onClick={() => { setShowGroupChat(false); setGroupError(''); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleNewGroup} className="modal-body">
              <p className="modal-desc">Create a group with multiple participants.</p>
              <div className="input-group">
                <div className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <input type="text" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <div className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </div>
                <input type="text" placeholder="Phone numbers (comma separated)" value={groupParticipants} onChange={(e) => setGroupParticipants(e.target.value)} />
              </div>
              {groupError && <div className="modal-error">{groupError}</div>}
              <button type="submit" className="btn-primary" disabled={!groupName.trim()}>Create Group</button>
            </form>
          </div>
        </div>
      )}

      {/* ════════ PROFILE MODAL ════════ */}
      {showProfile && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowProfile(false)}>
          <div className="modal modal-profile animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Profile</h3>
              <button className="icon-btn" onClick={() => setShowProfile(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-avatar-large">
                <div className="avatar avatar-lg">{getInitials(profileName || phoneNumber)}</div>
              </div>
              <div className="profile-phone">{phoneNumber}</div>
              {profile?.status && <div className="profile-status-badge">{profile.status}</div>}

              <label className="input-label">Display Name</label>
              <div className="input-group">
                <input type="text" placeholder="Your name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>

              <label className="input-label">Bio</label>
              <div className="input-group">
                <input type="text" placeholder="About yourself..." value={profileBio} onChange={(e) => setProfileBio(e.target.value)} />
              </div>

              <button className="btn-primary" onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ USER SEARCH MODAL ════════ */}
      {showUserSearch && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowUserSearch(false)}>
          <div className="modal modal-search animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Find Users</h3>
              <button className="icon-btn" onClick={() => { setShowUserSearch(false); setUserSearchResults([]); setUserSearchQuery(''); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleUserSearch} className="search-form">
                <div className="input-group">
                  <div className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" placeholder="Search by name or phone..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} autoFocus />
                </div>
                <button type="submit" className="btn-primary btn-sm" disabled={userSearchLoading || !userSearchQuery.trim()}>
                  {userSearchLoading ? '...' : 'Search'}
                </button>
              </form>

              <div className="search-results">
                {userSearchResults.length === 0 && !userSearchLoading && (
                  <p className="search-empty">Search for users to start a conversation</p>
                )}
                {userSearchResults.map((u) => (
                  <div key={u.phoneNumber || u._id} className="search-result-item">
                    <div className="avatar avatar-sm">{getInitials(u.name || u.phoneNumber)}</div>
                    <div className="search-result-info">
                      <span className="search-result-name">{u.name || u.phoneNumber}</span>
                      <span className="search-result-phone">{u.phoneNumber}</span>
                      {u.bio && <span className="search-result-bio">{u.bio}</span>}
                    </div>
                    <button className="btn-chat-sm" onClick={() => startChatWithUser(u.phoneNumber)}>
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
