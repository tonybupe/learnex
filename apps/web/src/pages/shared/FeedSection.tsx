// pages/shared/FeedSection.tsx
import { useCallback, useEffect } from "react"
import { useFeed } from "@/features/posts/hooks/useFeed"
import { useRealtimeFeed } from "@/features/posts/hooks/useRealtimeFeed"
import { useToast } from "@/features/posts/hooks/useToast"

import FeedComposer from "@/features/posts/components/feed/FeedComposer"
import FeedList from "@/features/posts/components/feed/FeedList"

import "@/features/posts/styles/posts.css"

export default function FeedSection() {
  const toast = useToast()
  const { 
    posts, 
    loading, 
    loadingMore,
    hasMore,
    error,
    reload, 
    loadMore 
  } = useFeed({
    autoLoad: true,
    initialLimit: 20,
    sortBy: 'latest'
  })

  // Debug: Log posts whenever they change
  useEffect(() => {
    console.log('[FeedSection] Posts updated:', {
      count: posts.length,
      posts: posts.map(p => ({ id: p.id, content: p.content?.substring(0, 50) })),
      loading,
      error
    })
  }, [posts, loading, error])

  // Debug: Log when feed loads
  useEffect(() => {
    if (!loading && !error) {
      console.log('[FeedSection] Feed loaded, posts count:', posts.length)
    }
  }, [loading, error, posts.length])

  // Real-time updates
  useRealtimeFeed({
    onUpdate: () => {
      console.log('[FeedSection] Real-time update received')
      toast.info("New content available!", {
        action: {
          label: "Refresh",
          onClick: () => reload()
        }
      })
    },
    onConnect: () => {
      console.log("[FeedSection] Connected to real-time feed")
    }
  })

  const handleRetry = useCallback(() => {
    console.log('[FeedSection] Retrying feed load')
    reload()
  }, [reload])

  const handlePostCreated = useCallback(() => {
    console.log('[FeedSection] Post created, reloading feed')
    toast.success("Post created successfully!")
    reload()
  }, [reload, toast])

  const handleLoadMore = useCallback(() => {
    console.log('[FeedSection] Loading more posts, current count:', posts.length)
    if (!loading && !loadingMore && hasMore) {
      loadMore()
    }
  }, [loading, loadingMore, hasMore, loadMore, posts.length])

  // Manual test to fetch posts directly
  const testFetch = async () => {
    console.log('[FeedSection] Manual fetch test')
    try {
      const token = localStorage.getItem('learnex_access_token')
      const response = await fetch('http://localhost:8000/api/v1/posts/feed?page=1&limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      console.log('[FeedSection] Manual fetch result:', {
        status: response.status,
        dataLength: Array.isArray(data) ? data.length : data.data?.length,
        data
      })
    } catch (err) {
      console.error('[FeedSection] Manual fetch error:', err)
    }
  }

  return (
    <div className="feed-container">
      <div className="feed-left" />
      
      <div className="feed-main">
        {/* Debug button - remove in production */}
        <button 
          onClick={testFetch}
          style={{ marginBottom: '10px', padding: '5px 10px', fontSize: '12px' }}
        >
          Test Fetch
        </button>
        
        <FeedComposer onCreated={handlePostCreated} />
        
        <FeedList
          posts={posts}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          error={error}
          onRetry={handleRetry}
        />
      </div>
      
      <div className="feed-right" />
    </div>
  )
}