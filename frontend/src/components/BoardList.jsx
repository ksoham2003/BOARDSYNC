import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import BoardCard from './BoardCard';
import api from '../utils/api';
import { Card, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const BoardList = ({ list, cards, boardId }) => {
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingList, setIsEditingList] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);

  const { setNodeRef } = useDroppable({
    id: list._id,
    data: {
      type: 'List',
      list,
    }
  });

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    try {
      await api.post(`/boards/${boardId}/cards`, {
        title: newCardTitle,
        listId: list._id
      });
      setNewCardTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to create card', err);
    }
  };

  const handleUpdateList = async (e) => {
    e.preventDefault();
    if (!listTitle.trim()) return;
    try {
      await api.put(`/boards/${boardId}/lists/${list._id}`, { title: listTitle });
      setIsEditingList(false);
    } catch (err) {
      console.error('Failed to update list', err);
    }
  };

  const handleDeleteList = async () => {
    if (!window.confirm(`Delete list "${list.title}" and all its tasks?`)) return;
    try {
      await api.delete(`/boards/${boardId}/lists/${list._id}`);
    } catch (err) {
      console.error('Failed to delete list', err);
    }
  };

  return (
    <Card className="w-80 shrink-0 max-h-full flex flex-col bg-zinc-950 border-zinc-800 shadow-2xl">
      <CardHeader className="p-3 flex-row items-center justify-between border-b border-zinc-900 space-y-0">
        {isEditingList ? (
          <form onSubmit={handleUpdateList} className="flex items-center gap-1.5 w-full">
            <Input 
              className="h-7 text-xs bg-black border-zinc-700 text-white"
              value={listTitle} 
              onChange={(e) => setListTitle(e.target.value)} 
              autoFocus
            />
            <Button type="submit" size="sm" className="h-7 px-2 bg-white text-black"><Check className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-zinc-400" onClick={() => setIsEditingList(false)}><X className="h-3.5 w-3.5" /></Button>
          </form>
        ) : (
          <>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-white">{list.title}</h3>
              {list.createdBy && (
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Avatar className="h-3.5 w-3.5 border border-zinc-800">
                    {list.createdBy?.avatar && <AvatarImage src={list.createdBy.avatar} alt={list.createdBy.name} />}
                    <AvatarFallback className="bg-zinc-800 text-white text-[7px]">
                      {list.createdBy?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>By: {list.createdBy.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-zinc-400 hover:text-white"
                onClick={() => setIsEditingList(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-zinc-400 hover:text-red-400"
                onClick={handleDeleteList}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </CardHeader>
      
      <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-[60px]" ref={setNodeRef}>
        <SortableContext items={cards.map(c => c._id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <BoardCard key={card._id} card={card} boardId={boardId} />
          ))}
        </SortableContext>
      </div>

      <div className="p-2 border-t border-zinc-900">
        {isAdding ? (
          <form onSubmit={handleAddCard} className="space-y-2">
            <Input 
              className="h-8 text-xs bg-black border-zinc-800 text-white"
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title..."
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="h-7 text-xs bg-white text-black font-bold">Add Card</Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-zinc-400" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button 
            variant="ghost" 
            className="w-full justify-start text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 h-8"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add a card
          </Button>
        )}
      </div>
    </Card>
  );
};

export default BoardList;
