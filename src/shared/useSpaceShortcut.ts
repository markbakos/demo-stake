import { useEffect, useEffectEvent } from 'react'

export function useSpaceShortcut(isEnabled: boolean, onShortcut: () => void) {
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!isEnabled) return
    event.preventDefault()
    onShortcut()
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
      if (document.querySelector('dialog[open]')) return
      const target = event.target
      if (target instanceof Element && target.closest('input, textarea, select, button, a[href], [contenteditable], [role="button"]')) return
      handleShortcut(event)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
