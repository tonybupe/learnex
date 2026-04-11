// src/pages/shared/MessagingPage.tsx
import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { MessageThread } from "@/features/messaging/components/MessageThread";
import { useAuth } from "@/features/auth/useAuth"; // Changed from useCurrentUser
import { useUnreadMessages } from "@/features/messaging/hooks/useUnreadMessages";
import "@/features/messaging/messaging.css";

export default function MessagingPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const { user, isAuthenticated, isLoading } = useAuth(); // Use useAuth instead
  const { totalUnread } = useUnreadMessages();

  // Update document title with unread count
  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Messages - Learnex`;
    } else {
      document.title = "Messages - Learnex";
    }
    
    return () => {
      document.title = "Learnex";
    };
  }, [totalUnread]);

  // Show loading state
  if (isLoading) {
    return (
      <AppShell>
        <div className="messaging-page loading">
          <div className="messaging-layout">
            <div className="conversation-list-skeleton" />
            <div className="message-thread-skeleton" />
          </div>
        </div>
      </AppShell>
    );
  }

  // Show unauthenticated state
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="messaging-page error">
          <div className="error-container">
            <h2>Unable to load messages</h2>
            <p>Please log in to access your conversations</p>
            <button onClick={() => window.location.href = "/auth/login"}>
              Go to Login
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Ensure we have a user
  if (!user) {
    return null;
  }

  return (
    <AppShell>
      <div className="messaging-page">
        <div className="messaging-layout">
          {/* Conversations Sidebar */}
          <aside className="messaging-sidebar" aria-label="Conversations list">
            <ConversationList
              currentUserId={user.id}
              activeConversationId={conversationId}
              onSelectConversation={setConversationId}
            />
          </aside>

          {/* Message Thread Area */}
          <main className="messaging-main" aria-label="Message thread">
            {conversationId ? (
              <MessageThread
                conversationId={conversationId}
                currentUserId={user.id}
              />
            ) : (
              <div className="message-thread empty" role="status">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h2 className="empty-title">Select a conversation</h2>
                  <p className="empty-sub">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                  {totalUnread > 0 && (
                    <p className="empty-unread" aria-live="polite">
                      You have {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  );
}