'use client'

import { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

type EditableFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
  tag?: 'h2' | 'h3' | 'p' | 'span'
}

export default function EditableField({
  value,
  onChange,
  placeholder = 'Click to edit…',
  className,
  multiline = false,
  tag: Tag = 'p',
}: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null)
  const isComposingRef = useRef(false)

  // Sync external value changes without clobbering cursor position
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el && el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (!isComposingRef.current) {
      onChange(ref.current?.textContent ?? '')
    }
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).blur()
      }
    },
    [multiline],
  )

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false
        onChange(ref.current?.textContent ?? '')
      }}
      data-placeholder={placeholder}
      className={cn(
        'min-h-[1em] cursor-text rounded outline-none ring-0 transition-colors',
        'focus:bg-accent/30 focus:ring-1 focus:ring-ring/40',
        'empty:before:pointer-events-none empty:before:text-muted-foreground/50 empty:before:content-[attr(data-placeholder)]',
        className,
      )}
    />
  )
}
