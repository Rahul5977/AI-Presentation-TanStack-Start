import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DragEndEvent } from '@dnd-kit/core'

import OutlineSlideCard from '@/components/outline/OutlineSlideCard'
import type { OutlineSlide } from '@/components/outline/types'

type OutlineSlideListProps = {
  slides: OutlineSlide[]
  savingSlideId: string | null
  onSlideChange: (slide: OutlineSlide) => void
  onDeleteSlide: (slideId: string) => void
  onReorder: (slideIds: string[]) => void
}

type SortableCardProps = {
  slide: OutlineSlide
  isSaving: boolean
  onSlideChange: (slide: OutlineSlide) => void
  onDeleteSlide: (slideId: string) => void
}

function SortableCard({
  slide,
  isSaving,
  onSlideChange,
  onDeleteSlide,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: slide.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <OutlineSlideCard
        slide={slide}
        isSaving={isSaving}
        dragHandleProps={{ ...attributes, ...listeners }}
        onChange={onSlideChange}
        onDelete={onDeleteSlide}
      />
    </div>
  )
}

export default function OutlineSlideList({
  slides,
  savingSlideId,
  onSlideChange,
  onDeleteSlide,
  onReorder,
}: OutlineSlideListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = slides.map((slide) => slide.id)
    const oldIndex = currentIds.indexOf(String(active.id))
    const newIndex = currentIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(currentIds, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slides.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {slides.map((slide) => (
            <SortableCard
              key={slide.id}
              slide={slide}
              isSaving={savingSlideId === slide.id}
              onSlideChange={onSlideChange}
              onDeleteSlide={onDeleteSlide}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
