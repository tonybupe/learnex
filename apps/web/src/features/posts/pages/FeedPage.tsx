// pages/FeedPage.tsx
/**
 * Feed Page - Main feed view for displaying posts
 * Shows a list of posts from followed users and classes
 */

import { useCallback, useEffect, useRef } from "react"
import AppShell from "@/components/layout/AppShell"
import { useFeed } from "../hooks/useFeed"
import FeedComposer from "../components/feed/FeedComposer"
import FeedList from "../components/feed/FeedList"
import { useToast } from "@/features/posts/hooks/useToast"

import "../styles/posts.css"

export default function FeedPage() {
  const toast = useToast()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const { 
    posts, 
    loading, 
    loadingMore,
    hasMore,
    error,
    reload, 
    loadMore,
    addPost,
    updatePost,
    removePost
  } = useFeed({
    autoLoad: true,
    initialLimit: 20,
    sortBy: 'latest'
  })

  // Handle infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    observer.observe(loadMoreRef.current)
    
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadMore])

  // Handle post creation
  const handlePostCreated = useCallback((newPost: any) => {
    if (newPost) {
      addPost(newPost)
      toast.success("Post created successfully!", { duration: 3000 })
    }
  }, [addPost, toast])

  // Handle post update (for likes, comments, etc.)
  const handlePostUpdate = useCallback((updatedPost: any) => {
    if (updatedPost) {
      updatePost(updatedPost.id, updatedPost)
    }
  }, [updatePost])

  // Handle post deletion
  const handlePostDelete = useCallback((postId: number) => {
    removePost(postId)
    toast.info("Post deleted", { duration: 2000 })
  }, [removePost, toast])

  // Handle retry on error
  const handleRetry = useCallback(() => {
    reload()
  }, [reload])

  return (
    <AppShell>
      <div className="page-section">
        <div className="feed-container">
          {/* Feed Composer - Create new post */}
          <FeedComposer 
            onCreated={handlePostCreated}
            placeholder="What's on your mind?"
          />
          
          {/* Feed List - Display posts */}
          <FeedList
            posts={posts}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            error={error}
            onRetry={handleRetry}
          />
          
          {/* Infinite scroll trigger */}
          {hasMore && !loading && !loadingMore && (
            <div ref={loadMoreRef} className="feed-scroll-trigger" />
          )}
          
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="feed-loading-more">
              <div className="spinner" />
              <span>Loading more posts...</span>
            </div>
          )}
          
          {/* End of feed message */}
          {!hasMore && posts.length > 0 && (
            <div className="feed-end-message">
              <span>✨ You've seen everything ✨</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}