import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Section } from '../../types';

type DraggableSectionItemProps = {
  section: Section;
  dragContextId?: string;
  duration?: string;
  onEdit?: (sectionId: string) => void;
};

const DraggableSectionItem: React.FC<DraggableSectionItemProps> = ({ 
  section, 
  dragContextId, 
  duration,
  onEdit
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
    data: {
      sortable: {
        containerId: dragContextId || 'default',
      },
    },
  });

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(section.id);
  };

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
      sx={{
        display: 'flex',
        alignItems: 'center',
        my: 1,
        p: 1,
        cursor: 'grab',
        position: 'relative',
        marginBottom: '8px',
        '&:active': { cursor: 'grabbing' }
      }}
    >
      <Box sx={{ 
        width: 8, 
        height: 8, 
        borderRadius: '50%', 
        backgroundColor: section.color,
        mr: 1
      }} />
      <Typography variant="body2" sx={{ fontWeight: 600, color: section.color }}>
        {section.title}
      </Typography>
      {duration && (
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          ({duration})
        </Typography>
      )}
      <Box sx={{ flexGrow: 1, height: '1px', backgroundColor: 'divider', ml: 2 }} />
      {onEdit && (
        <IconButton
          size="small"
          onClick={handleEdit}
          sx={{ 
            ml: 1,
            p: 0.25,
            opacity: 0.7,
            '&:hover': { opacity: 1, color: 'primary.main' }
          }}
        >
          <Edit sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default DraggableSectionItem;
