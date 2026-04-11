from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.class_member import ClassMember
from app.models.class_room import ClassRoom
from app.models.conversation import Conversation
from app.models.conversation_participant import ConversationParticipant
from app.models.lesson import Lesson
from app.models.lesson_resource import LessonResource
from app.models.live_session import LiveSession
from app.models.media_file import MediaFile
from app.models.message import Message
from app.models.notification import Notification
from app.models.post import Post
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.report import Report
from app.models.session_attendance import SessionAttendance
from app.models.subject import Subject
from app.models.user import User


def safe_float(value) -> float:
    return float(value or 0)


def get_user_activity_stats(db: Session, user_id: int) -> dict:
    posts_count = db.query(func.count(Post.id)).filter(Post.author_id == user_id).scalar() or 0
    lessons_count = db.query(func.count(Lesson.id)).filter(Lesson.teacher_id == user_id).scalar() or 0
    quizzes_created_count = db.query(func.count(Quiz.id)).filter(Quiz.teacher_id == user_id).scalar() or 0
    quiz_attempts_count = db.query(func.count(QuizAttempt.id)).filter(QuizAttempt.learner_id == user_id).scalar() or 0
    messages_sent_count = db.query(func.count(Message.id)).filter(Message.sender_id == user_id).scalar() or 0
    classes_joined_count = db.query(func.count(ClassMember.id)).filter(
        ClassMember.learner_id == user_id,
        ClassMember.status == "active"
    ).scalar() or 0
    live_sessions_attended_count = db.query(func.count(SessionAttendance.id)).filter(
        SessionAttendance.learner_id == user_id,
        SessionAttendance.status == "present"
    ).scalar() or 0
    live_sessions_hosted_count = db.query(func.count(LiveSession.id)).filter(
        LiveSession.teacher_id == user_id
    ).scalar() or 0

    return {
        "user_id": user_id,
        "posts_count": posts_count,
        "lessons_count": lessons_count,
        "quizzes_created_count": quizzes_created_count,
        "quiz_attempts_count": quiz_attempts_count,
        "messages_sent_count": messages_sent_count,
        "classes_joined_count": classes_joined_count,
        "live_sessions_attended_count": live_sessions_attended_count,
        "live_sessions_hosted_count": live_sessions_hosted_count,
    }


def get_class_performance_stats(db: Session, class_id: int) -> dict:
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise ValueError("Class not found")

    learners_count = db.query(func.count(ClassMember.id)).filter(
        ClassMember.class_id == class_id,
        ClassMember.status == "active"
    ).scalar() or 0

    lessons_count = db.query(func.count(Lesson.id)).filter(Lesson.class_id == class_id).scalar() or 0
    quizzes_count = db.query(func.count(Quiz.id)).filter(Quiz.class_id == class_id).scalar() or 0

    quiz_attempts_count = (
        db.query(func.count(QuizAttempt.id))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.class_id == class_id)
        .scalar() or 0
    )

    average_quiz_score = (
        db.query(func.avg(QuizAttempt.score))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.class_id == class_id)
        .scalar()
    )

    live_sessions_count = db.query(func.count(LiveSession.id)).filter(
        LiveSession.class_id == class_id
    ).scalar() or 0

    attendance_count = (
        db.query(func.count(SessionAttendance.id))
        .join(LiveSession, LiveSession.id == SessionAttendance.live_session_id)
        .filter(LiveSession.class_id == class_id)
        .scalar() or 0
    )

    posts_count = db.query(func.count(Post.id)).filter(Post.class_id == class_id).scalar() or 0

    return {
        "class_id": class_id,
        "class_title": classroom.title,
        "learners_count": learners_count,
        "lessons_count": lessons_count,
        "quizzes_count": quizzes_count,
        "quiz_attempts_count": quiz_attempts_count,
        "average_quiz_score": safe_float(average_quiz_score),
        "live_sessions_count": live_sessions_count,
        "attendance_count": attendance_count,
        "posts_count": posts_count,
    }


def get_lesson_engagement(db: Session, lesson_id: int) -> dict:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise ValueError("Lesson not found")

    resources_count = db.query(func.count(LessonResource.id)).filter(
        LessonResource.lesson_id == lesson_id
    ).scalar() or 0

    conversation = db.query(Conversation).filter(
        Conversation.conversation_type == "lesson_thread",
        Conversation.lesson_id == lesson_id
    ).first()

    discussion_message_count = 0
    if conversation:
        discussion_message_count = db.query(func.count(Message.id)).filter(
            Message.conversation_id == conversation.id,
            Message.is_deleted.is_(False)
        ).scalar() or 0

    return {
        "lesson_id": lesson.id,
        "lesson_title": lesson.title,
        "class_id": lesson.class_id,
        "resources_count": resources_count,
        "discussion_message_count": discussion_message_count,
        "created_by_teacher_id": lesson.teacher_id,
    }


def get_quiz_analytics(db: Session, quiz_id: int) -> dict:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise ValueError("Quiz not found")

    attempts_count = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.quiz_id == quiz_id
    ).scalar() or 0

    submitted_count = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.status == "submitted"
    ).scalar() or 0

    average_score = db.query(func.avg(QuizAttempt.score)).filter(
        QuizAttempt.quiz_id == quiz_id
    ).scalar()

    highest_score = db.query(func.max(QuizAttempt.score)).filter(
        QuizAttempt.quiz_id == quiz_id
    ).scalar()

    lowest_score = db.query(func.min(QuizAttempt.score)).filter(
        QuizAttempt.quiz_id == quiz_id
    ).scalar()

    pass_count = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.score >= 50
    ).scalar() or 0

    pass_rate_percent = (pass_count / attempts_count * 100) if attempts_count > 0 else 0

    return {
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "class_id": quiz.class_id,
        "attempts_count": attempts_count,
        "submitted_count": submitted_count,
        "average_score": safe_float(average_score),
        "highest_score": safe_float(highest_score),
        "lowest_score": safe_float(lowest_score),
        "pass_rate_percent": float(pass_rate_percent),
    }


def get_live_session_analytics(db: Session, live_session_id: int) -> dict:
    session = db.query(LiveSession).filter(LiveSession.id == live_session_id).first()
    if not session:
        raise ValueError("Live session not found")

    attendance_count = db.query(func.count(SessionAttendance.id)).filter(
        SessionAttendance.live_session_id == live_session_id
    ).scalar() or 0

    present_count = db.query(func.count(SessionAttendance.id)).filter(
        SessionAttendance.live_session_id == live_session_id,
        SessionAttendance.status == "present"
    ).scalar() or 0

    absent_count = db.query(func.count(SessionAttendance.id)).filter(
        SessionAttendance.live_session_id == live_session_id,
        SessionAttendance.status == "absent"
    ).scalar() or 0

    return {
        "live_session_id": session.id,
        "title": session.title,
        "class_id": session.class_id,
        "status": session.status,
        "attendance_count": attendance_count,
        "present_count": present_count,
        "absent_count": absent_count,
    }


def get_teacher_dashboard_summary(db: Session, teacher_id: int) -> dict:
    classes_count = db.query(func.count(ClassRoom.id)).filter(
        ClassRoom.teacher_id == teacher_id
    ).scalar() or 0

    lessons_count = db.query(func.count(Lesson.id)).filter(
        Lesson.teacher_id == teacher_id
    ).scalar() or 0

    quizzes_count = db.query(func.count(Quiz.id)).filter(
        Quiz.teacher_id == teacher_id
    ).scalar() or 0

    posts_count = db.query(func.count(Post.id)).filter(
        Post.author_id == teacher_id
    ).scalar() or 0

    live_sessions_count = db.query(func.count(LiveSession.id)).filter(
        LiveSession.teacher_id == teacher_id
    ).scalar() or 0

    class_ids = [
        row.id
        for row in db.query(ClassRoom).filter(ClassRoom.teacher_id == teacher_id).all()
    ]

    total_learners = 0
    total_quiz_attempts = 0
    average_quiz_score = 0.0

    if class_ids:
        total_learners = db.query(func.count(ClassMember.id)).filter(
            ClassMember.class_id.in_(class_ids),
            ClassMember.status == "active"
        ).scalar() or 0

        total_quiz_attempts = (
            db.query(func.count(QuizAttempt.id))
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .filter(Quiz.class_id.in_(class_ids))
            .scalar() or 0
        )

        average_quiz_score_val = (
            db.query(func.avg(QuizAttempt.score))
            .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
            .filter(Quiz.class_id.in_(class_ids))
            .scalar()
        )
        average_quiz_score = safe_float(average_quiz_score_val)

    return {
        "teacher_id": teacher_id,
        "classes_count": classes_count,
        "lessons_count": lessons_count,
        "quizzes_count": quizzes_count,
        "posts_count": posts_count,
        "live_sessions_count": live_sessions_count,
        "total_learners": total_learners,
        "total_quiz_attempts": total_quiz_attempts,
        "average_quiz_score": average_quiz_score,
    }


def get_admin_platform_health_summary(db: Session) -> dict:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_teachers = db.query(func.count(User.id)).filter(User.role == "teacher").scalar() or 0
    total_learners = db.query(func.count(User.id)).filter(User.role == "learner").scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    total_classes = db.query(func.count(ClassRoom.id)).scalar() or 0
    total_subjects = db.query(func.count(Subject.id)).scalar() or 0
    total_posts = db.query(func.count(Post.id)).scalar() or 0
    total_lessons = db.query(func.count(Lesson.id)).scalar() or 0
    total_quizzes = db.query(func.count(Quiz.id)).scalar() or 0
    total_quiz_attempts = db.query(func.count(QuizAttempt.id)).scalar() or 0
    total_live_sessions = db.query(func.count(LiveSession.id)).scalar() or 0
    total_messages = db.query(func.count(Message.id)).scalar() or 0
    total_reports = db.query(func.count(Report.id)).scalar() or 0
    open_reports = db.query(func.count(Report.id)).filter(Report.status == "open").scalar() or 0
    resolved_reports = db.query(func.count(Report.id)).filter(Report.status == "resolved").scalar() or 0
    total_media_files = db.query(func.count(MediaFile.id)).scalar() or 0

    return {
        "total_users": total_users,
        "total_teachers": total_teachers,
        "total_learners": total_learners,
        "total_admins": total_admins,
        "total_classes": total_classes,
        "total_subjects": total_subjects,
        "total_posts": total_posts,
        "total_lessons": total_lessons,
        "total_quizzes": total_quizzes,
        "total_quiz_attempts": total_quiz_attempts,
        "total_live_sessions": total_live_sessions,
        "total_messages": total_messages,
        "total_reports": total_reports,
        "open_reports": open_reports,
        "resolved_reports": resolved_reports,
        "total_media_files": total_media_files,
    }


def get_learner_dashboard_summary(db: Session, learner_id: int) -> dict:
    class_ids = [
        row.class_id
        for row in db.query(ClassMember)
        .filter(ClassMember.learner_id == learner_id, ClassMember.status == "active")
        .all()
    ]

    enrolled_classes_count = len(class_ids)
    lesson_count = 0
    quiz_count = 0
    upcoming_live_sessions_count = 0

    if class_ids:
        lesson_count = db.query(func.count(Lesson.id)).filter(
            Lesson.class_id.in_(class_ids),
            Lesson.status == "published"
        ).scalar() or 0

        quiz_count = db.query(func.count(Quiz.id)).filter(
            Quiz.class_id.in_(class_ids)
        ).scalar() or 0

        upcoming_live_sessions_count = db.query(func.count(LiveSession.id)).filter(
            LiveSession.class_id.in_(class_ids),
            LiveSession.status.in_(["scheduled", "live"])
        ).scalar() or 0

    quiz_attempts_count = db.query(func.count(QuizAttempt.id)).filter(
        QuizAttempt.learner_id == learner_id
    ).scalar() or 0

    average_quiz_score = db.query(func.avg(QuizAttempt.score)).filter(
        QuizAttempt.learner_id == learner_id
    ).scalar()

    unread_notifications_count = db.query(func.count(Notification.id)).filter(
        Notification.user_id == learner_id,
        Notification.is_read.is_(False)
    ).scalar() or 0

    participant_rows = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == learner_id
    ).all()

    unread_messages_count = 0
    for participant in participant_rows:
        if participant.last_read_message_id is None:
            unread_messages_count += db.query(func.count(Message.id)).filter(
                Message.conversation_id == participant.conversation_id,
                Message.sender_id != learner_id,
                Message.is_deleted.is_(False)
            ).scalar() or 0
        else:
            unread_messages_count += db.query(func.count(Message.id)).filter(
                Message.conversation_id == participant.conversation_id,
                Message.sender_id != learner_id,
                Message.is_deleted.is_(False),
                Message.id > participant.last_read_message_id
            ).scalar() or 0

    return {
        "learner_id": learner_id,
        "enrolled_classes_count": enrolled_classes_count,
        "lesson_count": lesson_count,
        "quiz_count": quiz_count,
        "quiz_attempts_count": quiz_attempts_count,
        "average_quiz_score": safe_float(average_quiz_score),
        "upcoming_live_sessions_count": upcoming_live_sessions_count,
        "unread_notifications_count": unread_notifications_count,
        "unread_messages_count": unread_messages_count,
    }