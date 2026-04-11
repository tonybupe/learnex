export const endpoints = {

  /* ---------------- HEALTH ---------------- */

  health: "/health",

  /* ---------------- AUTH ---------------- */

  auth: {
    register: "/auth/register",
    login: "/auth/login",
  },

  /* ---------------- USERS ---------------- */

  users: {
    /* ===== CURRENT USER ===== */
    me: "/users/me",                         

    myProfile: "/users/me/profile",          
    updateMyProfile: "/users/me/profile",    

    /* ===== PUBLIC / ADMIN ===== */
    list: "/users",                          

    byId: (id: number) => `/users/${id}`, 
  },
  /* ---------------- SOCIAL ---------------- */

  social: {
    follow: (userId: number) => `/social/${userId}/follow`,
    followers: (userId: number) => `/social/${userId}/followers`,
    following: (userId: number) => `/social/${userId}/following`,
    stats: (userId: number) => `/social/${userId}/follow-stats`,
  },

  /* ---------------- SUBJECTS ---------------- */

  subjects: {
    list: "/subjects",
    create: "/subjects",
    get: (id: number) => `/subjects/${id}`,
    update: (id: number) => `/subjects/${id}`,
    delete: (id: number) => `/subjects/${id}`,
  },

  /* ---------------- CLASSES ---------------- */

  classes: {
    list: "/classes",
    create: "/classes",
    discover: "/classes/discover",
    get: (id: number) => `/classes/${id}`,
    update: (id: number) => `/classes/${id}`,
    delete: (id: number) => `/classes/${id}`,
    join: (id: number) => `/classes/${id}/join`,
    leave: (id: number) => `/classes/${id}/leave`,
    members: (id: number) => `/classes/${id}/members`,
  },

  /* ---------------- POSTS ---------------- */

  posts: {
    list: "/posts",
    create: "/posts",
    feed: "/posts/feed",
    mine: "/posts/mine",

    get: (id: number) => `/posts/${id}`,
    update: (id: number) => `/posts/${id}`,
    delete: (id: number) => `/posts/${id}`,

    attachments: (id: number) => `/posts/${id}/attachments`,

    comments: (id: number) => `/posts/${id}/comments`,

    react: (id: number) => `/posts/${id}/reactions`,
    removeReaction: (id: number) => `/posts/${id}/reactions`,

    save: (id: number) => `/posts/${id}/save`,
    unsave: (id: number) => `/posts/${id}/save`,
  },

  /* ---------------- LESSONS ---------------- */

  lessons: {
    list: "/lessons",
    create: "/lessons",
    get: (id: number) => `/lessons/${id}`,
    update: (id: number) => `/lessons/${id}`,
    delete: (id: number) => `/lessons/${id}`,

    resources: (id: number) => `/lessons/${id}/resources`,
  },

  /* ---------------- QUIZZES ---------------- */

  quizzes: {
    list: "/quizzes",
    create: "/quizzes",

    get: (id: number) => `/quizzes/${id}`,
    update: (id: number) => `/quizzes/${id}`,
    delete: (id: number) => `/quizzes/${id}`,

    questions: (id: number) => `/quizzes/${id}/questions`,

    start: (id: number) => `/quizzes/${id}/start`,

    submit: (quizId: number, attemptId: number) =>
      `/quizzes/${quizId}/attempts/${attemptId}/submit`,

    myAttempts: (quizId: number) => `/quizzes/${quizId}/attempts/mine`,
  },

  /* ---------------- LIVE SESSIONS ---------------- */

  liveSessions: {
    list: "/live-sessions",
    create: "/live-sessions",

    upcoming: "/live-sessions/upcoming",
    previous: "/live-sessions/previous",

    get: (id: number) => `/live-sessions/${id}`,
    update: (id: number) => `/live-sessions/${id}`,
    delete: (id: number) => `/live-sessions/${id}`,

    start: (id: number) => `/live-sessions/${id}/start`,
    end: (id: number) => `/live-sessions/${id}/end`,
    cancel: (id: number) => `/live-sessions/${id}/cancel`,

    join: (id: number) => `/live-sessions/${id}/join`,
    leave: (id: number) => `/live-sessions/${id}/leave`,

    attendance: (id: number) => `/live-sessions/${id}/attendance`,
  },

  /* ---------------- NOTIFICATIONS ---------------- */

  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread-count",

    markRead: (id: number) => `/notifications/${id}/read`,
    markSeen: (id: number) => `/notifications/${id}/seen`,

    markAllRead: "/notifications/mark-all-read",
    markAllSeen: "/notifications/mark-all-seen",

    reminders: "/notifications/reminders",
    createReminder: "/notifications/reminders",

    dispatchReminders: "/notifications/dispatch-reminders",
  },

  /* ---------------- MEDIA ---------------- */

  media: {
    upload: "/media/upload",

    list: "/media",
    get: (id: number) => `/media/${id}`,
    update: (id: number) => `/media/${id}`,
    delete: (id: number) => `/media/${id}`,

    byEntity: (type: string, id: number) =>
      `/media/entity/${type}/${id}`,

    adminAll: "/media/admin/all",
  },

  /* ---------------- DISCOVERY ---------------- */

  discovery: {
    home: "/discovery/home",
    trendingTeachers: "/discovery/trending-teachers",
    publicClasses: "/discovery/public-classes",
  },

  /* ---------------- SEARCH ---------------- */

  search: {
    global: "/search",

    users: "/search/users",
    subjects: "/search/subjects",
    classes: "/search/classes",
    posts: "/search/posts",
    lessons: "/search/lessons",
    quizzes: "/search/quizzes",
    liveSessions: "/search/live-sessions",
    media: "/search/media",
  },

  /* ---------------- MESSAGING ---------------- */

  messaging: {
    startDirect: "/messaging/direct",

    classDiscussion: (classId: number) =>
      `/messaging/class/${classId}`,

    lessonDiscussion: (lessonId: number) =>
      `/messaging/lesson/${lessonId}`,

    list: "/messaging",

    conversation: (id: number) => `/messaging/${id}`,

    participants: (id: number) =>
      `/messaging/${id}/participants`,

    messages: (id: number) =>
      `/messaging/${id}/messages`,

    sendMessage: (id: number) =>
      `/messaging/${id}/messages`,

    editMessage: (id: number) =>
      `/messaging/messages/${id}`,

    deleteMessage: (id: number) =>
      `/messaging/messages/${id}`,

    markRead: (id: number) =>
      `/messaging/${id}/read`,

    unreadCount: (id: number) =>
      `/messaging/${id}/unread-count`,

    totalUnread: "/messaging/unread/total",
  },

};