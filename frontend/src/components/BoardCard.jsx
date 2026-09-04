import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import api from '../utils/api';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const BoardCard = ({ card, boardId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: {
      type: 'Card',
      card,
    },
    disabled: isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 1,
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.put(`/boards/${boardId}/cards/${card._id}`, { title, description });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update card', err);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this task card?')) return;
    try {
      await api.delete(`/boards/${boardId}/cards/${card._id}`);
    } catch (err) {
      console.error('Failed to delete card', err);
    }
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="task-card" onPointerDown={(e) => e.stopPropagation()}>
        <Card className="p-3 space-y-2 bg-zinc-900 border-white shadow-xl">
          <form onSubmit={handleUpdate} className="space-y-2">
            <Input
              className="text-xs h-8 bg-black border-zinc-800 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="w-full rounded-md border border-zinc-800 bg-black text-white px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white min-h-[60px]"
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-zinc-400 hover:text-white" onClick={() => setIsEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button type="submit" size="sm" className="h-7 px-2 bg-white text-black hover:bg-zinc-200">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
    >
      <Card className="p-3 bg-zinc-950 border-zinc-800 hover:border-zinc-500 transition-colors shadow-md cursor-grab active:cursor-grabbing space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-bold text-xs leading-snug text-white">
            {card.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-zinc-400 hover:text-white" 
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-zinc-400 hover:text-red-400" 
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {card.description && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {card.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4 border border-zinc-700">
              {card.createdBy?.avatar && <AvatarImage src={card.createdBy.avatar} alt={card.createdBy.name} />}
              <AvatarFallback className="bg-zinc-800 text-white text-[8px]">
                {card.createdBy?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span>By: {card.createdBy?.name || 'Unknown'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BoardCard;
