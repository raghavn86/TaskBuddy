import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WellnessTaskCard from './WellnessTaskCard';
import { DisplayWellnessTask, WellnessCategory } from '../../types/wellness';

type SortableWellnessTaskCardProps = {
  task: DisplayWellnessTask;
  categories: WellnessCategory[];
  onEdit: (editSeries: boolean) => void;
  onDelete: (deleteSeries: boolean) => void;
  onToggleComplete: () => void;
};

const SortableWellnessTaskCard: React.FC<SortableWellnessTaskCardProps> = (props) => {
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
      task: props.task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    marginBottom: '8px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <WellnessTaskCard
        {...props}
        isDragging={isDragging}
      />
    </div>
  );
};

export default SortableWellnessTaskCard;
