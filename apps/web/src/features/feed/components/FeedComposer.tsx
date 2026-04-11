import { useState } from "react"
import { Image, Send } from "lucide-react"

import { api } from "@/api/client"
import { endpoints } from "@/api/endpoints"


export default function FeedComposer() {

  const [content, setContent] = useState("")
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [mediaIds, setMediaIds] = useState<number[]>([])

  async function handleUpload(file: File) {

    const formData = new FormData()
    formData.append("file", file)

    try {

      setUploading(true)

      const res = await api.post(
        endpoints.media.upload,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      )

      setMediaIds((prev) => [...prev, res.data.id])

    } catch (err) {

      console.error("Media upload failed", err)

    } finally {

      setUploading(false)

    }

  }

  async function handleSubmit() {

    if (!content.trim() && mediaIds.length === 0) return

    try {

      setSubmitting(true)

      await api.post(endpoints.posts.create, {
        content,
        media_ids: mediaIds
      })

      setContent("")
      setMediaIds([])

      window.dispatchEvent(new Event("feed:refresh"))

    } catch (err) {

      console.error("Post creation failed", err)

    } finally {

      setSubmitting(false)

    }

  }

  return (

    <div className="card feed-composer">

      <textarea
        className="feed-textarea"
        placeholder="Share something with your class..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="feed-composer-actions">

        <label className="media-upload">

          <Image size={18} />

          <input
            type="file"
            hidden
            onChange={(e) => {

              const file = e.target.files?.[0]

              if (file) handleUpload(file)

            }}
          />

        </label>

        <button
          className="btn btn-primary"
          disabled={submitting}
          onClick={handleSubmit}
        >

          <Send size={16} />

          Post

        </button>

      </div>

    </div>

  )

}