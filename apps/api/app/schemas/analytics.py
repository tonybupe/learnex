from pydantic import BaseModel


class UserActivityStatsResponse(BaseModel):
    user_id: int
    posts_count: int
    lessons_count: int
    quizzes_created_count: int
    quiz_attempts_count: int
    messages_sent_count: int
    classes_joined_count: int
    live_sessions_attended_count: int
    live_sessions_hosted_count: int


class ClassPerformanceStatsResponse(BaseModel):
    class_id: int
    class_title: str
    learners_count: int
    lessons_count: int
    quizzes_count: int
    quiz_attempts_count: int
    average_quiz_score: float
    live_sessions_count: int
    attendance_count: int
    posts_count: int


class LessonEngagementResponse(BaseModel):
    lesson_id: int
    lesson_title: str
    class_id: int
    resources_count: int
    discussion_message_count: int
    created_by_teacher_id: int


class QuizAnalyticsResponse(BaseModel):
    quiz_id: int
    quiz_title: str
    class_id: int
    attempts_count: int
    submitted_count: int
    average_score: float
    highest_score: float
    lowest_score: float
    pass_rate_percent: float


class LiveSessionAnalyticsResponse(BaseModel):
    live_session_id: int
    title: str
    class_id: int
    status: str
    attendance_count: int
    present_count: int
    absent_count: int


class TeacherDashboardSummaryResponse(BaseModel):
    teacher_id: int
    classes_count: int
    lessons_count: int
    quizzes_count: int
    posts_count: int
    live_sessions_count: int
    total_learners: int
    total_quiz_attempts: int
    average_quiz_score: float


class AdminPlatformHealthSummaryResponse(BaseModel):
    total_users: int
    total_teachers: int
    total_learners: int
    total_admins: int
    total_classes: int
    total_subjects: int
    total_posts: int
    total_lessons: int
    total_quizzes: int
    total_quiz_attempts: int
    total_live_sessions: int
    total_messages: int
    total_reports: int
    open_reports: int
    resolved_reports: int
    total_media_files: int


class LearnerDashboardSummaryResponse(BaseModel):
    learner_id: int
    enrolled_classes_count: int
    lesson_count: int
    quiz_count: int
    quiz_attempts_count: int
    average_quiz_score: float
    upcoming_live_sessions_count: int
    unread_notifications_count: int
    unread_messages_count: int