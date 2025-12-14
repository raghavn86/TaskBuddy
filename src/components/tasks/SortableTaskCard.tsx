import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Task, TaskCategory } from '../../types';

type SortableTaskCardProps = {
  task: Task;
  categories?: TaskCategory[];
  isTemplate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
  onAssign: (userId: string | null) => void;
  onAddSectionAbove?: () => void;
  dragContextId?: string; // Add drag context ID for cross-container dragging
  onNotesClick?: () => void;
};

// Simplified SortableTaskCard with minimal configuration
const SortableTaskCard: React.FC<SortableTaskCardProps> = (props) => {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.task.id,
    data: {
      // Include the container ID for cross-container dragging
      sortable: {
        containerId: props.dragContextId || 'default',
      },
    },
  });
  
  // Basic styles for drag and drop
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const, // Type assertion to make TypeScript happy
    marginBottom: '8px',
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      {...listeners} // Apply listeners to the entire container
    >
      <TaskCard
        {...props}
        isDragging={isDragging}
        // No drag handle props since the entire card is draggable now
      />
    </div>
  );
};

export default SortableTaskCard;
