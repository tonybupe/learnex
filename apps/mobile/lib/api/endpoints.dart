/// Mirrors the web app's src/api/endpoints.ts so backend route changes
/// can be reflected in one place.
class Endpoints {
  Endpoints._();

  // Auth
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const forgotPassword = '/auth/forgot-password';
  static const resetPassword = '/auth/reset-password';
  static const me = '/users/me';

  // Users
  static const users = '/users';
  static String userById(int id) => '/users/$id';

  // Posts (social feed)
  static const posts = '/posts';
  static String postById(int id) => '/posts/$id';
  static String postLike(int id) => '/posts/$id/like';
  static String postComments(int id) => '/posts/$id/comments';
  static const postsMedia = '/posts/media';

  // Classes
  static const classes = '/classes';
  static String classById(int id) => '/classes/$id';
  static String classJoin(int id) => '/classes/$id/join';
  static String classLeave(int id) => '/classes/$id/leave';
  static String classMembers(int id) => '/classes/$id/members';
  static String classChat(int id) => '/classes/$id/chat';

  // Lessons
  static const lessons = '/lessons';
  static String lessonById(int id) => '/lessons/$id';
  static const lessonsAiGenerate = '/lessons/ai/generate';
  static String lessonResources(int id) => '/lessons/$id/resources';
  static String lessonDiscussion(int id) => '/lessons/$id/discussion';

  // Quizzes
  static const quizzes = '/quizzes';
  static String quizById(int id) => '/quizzes/$id';
  static const quizzesAiGenerate = '/quizzes/ai/generate';
  static String quizStart(int id) => '/quizzes/$id/start';
  static String quizSubmit(int id, int attemptId) =>
      '/quizzes/$id/attempts/$attemptId/submit';
  static String quizAiGrade(int id, int attemptId) =>
      '/quizzes/$id/attempts/$attemptId/ai-grade';
  static String quizAttempts(int id) => '/quizzes/$id/attempts';

  // Subjects
  static const subjects = '/subjects';

  // Discovery
  static const discoveryHome = '/discovery/home';
  static const trendingTeachers = '/discovery/trending-teachers';
  static const publicClasses = '/discovery/public-classes';

  // Messaging
  static const conversations = '/messages/conversations';
  static String messagesWith(int userId) => '/messages/$userId';
  static String wsMessages(int userId) => '/ws/messages/$userId';

  // Notifications
  static const notifications = '/notifications';
  static String notificationRead(int id) => '/notifications/$id/read';
  static const notificationsReadAll = '/notifications/read-all';

  // Live sessions
  static const liveSessions = '/live-sessions';
  static String liveSessionById(int id) => '/live-sessions/$id';

  // Analytics
  static const dashboardAdmin = '/analytics/dashboard/admin';
  static const dashboardTeacher = '/analytics/dashboard/teacher';
  static const dashboardLearner = '/analytics/dashboard/learner';
}
