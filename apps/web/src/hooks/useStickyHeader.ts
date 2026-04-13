import { useEffect, useRef, useState } from "react"

export function useStickyHeader() {
  const [shrunk, setShrunk] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const lastY = useRef(0)

  useEffect(() => {
    // Find the scrollable shell-main element
    const el = document.querySelector(".shell-main") as HTMLElement
    if (!el) return

    const onScroll = () => {
      const y = el.scrollTop
      if (y > 80 && y > lastY.current) setShrunk(true)
      else if (y < lastY.current - 30) setShrunk(false)
      lastY.current = y
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return { shrunk, mainRef }
}