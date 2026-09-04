import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Mail, Crown } from 'lucide-react';
import api from '../utils/api';
import socket from '../utils/socket';
import BoardList from '../components/BoardList';
import BoardCard from '../components/BoardCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card } from '../components/ui/card';

const BoardView = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchBoardData();

    socket.connect();
    socket.emit('join-board', boardId);

    socket.on('card-created', (newCard) => {
      setCards((prev) => [...prev, newCard]);
    });

    socket.on('card-updated', (updatedCard) => {
      setCards((prev) => prev.map(c => c._id === updatedCard._id ? updatedCard : c));
    });

    socket.on('list-created', (newList) => {
      setLists((prev) => [...prev.filter(l => l._id !== newList._id), newList]);
    });

    socket.on('list-updated', (updatedList) => {
      setLists((prev) => prev.map(l => l._id === updatedList._id ? updatedList : l));
    });

    socket.on('list-deleted', ({ listId: deletedListId }) => {
      setLists((prev) => prev.filter(l => l._id !== deletedListId));
      setCards((prev) => prev.filter(c => c.listId !== deletedListId));
    });

    socket.on('card-deleted', ({ cardId: deletedCardId }) => {
      setCards((prev) => prev.filter(c => c._id !== deletedCardId));
    });

    return () => {
      socket.emit('leave-board', boardId);
      socket.off('card-created');
      socket.off('card-updated');
      socket.off('list-created');
      socket.off('list-updated');
      socket.off('list-deleted');
      socket.off('card-deleted');
      socket.disconnect();
    };
  }, [boardId]);

  const fetchBoardData = async () => {
    try {
      const res = await api.get(`/boards/${boardId}`);
      setBoard(res.data.board);
      setLists(res.data.lists);
      setCards(res.data.cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await api.post(`/boards/${boardId}/lists`, { title: newListTitle });
      setNewListTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await api.post(`/boards/${boardId}/invite`, { email: inviteEmail });
      setInviteSuccess(res.data.message || 'Invitation sent successfully!');
      setInviteError('');
      setInviteEmail('');
      fetchBoardData();
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite user');
      setInviteSuccess('');
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'Card') {
      setActiveCard(active.data.current.card);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCard = active.data.current?.type === 'Card';
    const isOverCard = over.data.current?.type === 'Card';
    const isOverList = over.data.current?.type === 'List';

    if (!isActiveCard) return;

    setCards((prev) => {
      const activeCardIndex = prev.findIndex(c => c._id === activeId);
      const activeCardObj = prev[activeCardIndex];

      if (isOverCard) {
        const overCardIndex = prev.findIndex(c => c._id === overId);
        const overCardObj = prev[overCardIndex];

        if (activeCardObj.listId !== overCardObj.listId) {
          const newCards = [...prev];
          newCards[activeCardIndex] = { ...activeCardObj, listId: overCardObj.listId };
          return newCards;
        }
      }

      if (isOverList) {
        if (activeCardObj.listId !== overId) {
          const newCards = [...prev];
          newCards[activeCardIndex] = { ...activeCardObj, listId: overId };
          return newCards;
        }
      }

      return prev;
    });
  };

  const handleDragEnd = async (event) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    
    const activeCardObj = cards.find(c => c._id === activeId);
    if (!activeCardObj) return;

    const isOverCard = over.data.current?.type === 'Card';
    const isOverList = over.data.current?.type === 'List';

    let targetListId = activeCardObj.listId;
    let newOrder = activeCardObj.order;

    if (isOverCard) {
      const overCardObj = cards.find(c => c._id === overId);
      targetListId = overCardObj.listId;
      
      const listCards = cards.filter(c => c.listId === targetListId).sort((a,b) => a.order - b.order);
      const overCardIndex = listCards.findIndex(c => c._id === overId);
      
      if (overCardIndex === 0) {
        newOrder = listCards[0].order - 65536;
      } else if (overCardIndex === listCards.length - 1) {
        newOrder = listCards[listCards.length - 1].order + 65536;
      } else {
        newOrder = (listCards[overCardIndex - 1].order + listCards[overCardIndex].order) / 2;
      }
    } else if (isOverList) {
      targetListId = overId;
      const listCards = cards.filter(c => c.listId === targetListId).sort((a,b) => a.order - b.order);
      newOrder = listCards.length > 0 ? listCards[listCards.length - 1].order + 65536 : 65536;
    }

    if (activeCardObj.listId === targetListId && activeCardObj.order === newOrder) return;

    try {
      setCards(prev => prev.map(c => c._id === activeId ? { ...c, listId: targetListId, order: newOrder } : c));
      
      await api.put(`/boards/${boardId}/cards/${activeId}`, {
        listId: targetListId,
        order: newOrder
      });
    } catch (err) {
      console.error(err);
      fetchBoardData();
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 bg-black min-h-screen">Loading board...</div>;
  if (!board) return <div className="p-8 text-center text-red-500 bg-black min-h-screen">Board not found</div>;

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col bg-black text-white overflow-hidden">
      {/* Board Header */}
      <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">{board.title}</h1>
          
          {/* Room Owner */}
          {/* <Badge variant="outline" className="flex items-center gap-2 py-1 px-3 border-zinc-700 bg-zinc-900 text-white">
            <span className="text-xs text-zinc-400">Room Owner:</span>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4 border border-zinc-700">
                {board.owner?.avatar && <AvatarImage src={board.owner.avatar} alt={board.owner.name} />}
                <AvatarFallback className="bg-zinc-800 text-white text-[8px]">
                  {board.owner?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <strong className="text-white text-xs">{board.owner?.name || 'Owner'}</strong>
            </div>
          </Badge> */}

          {/* Members */}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Members:</span>
            <div className="flex -space-x-2">
              {board.members.map((m, i) => (
                <Avatar key={i} className="h-7 w-7 border-2 border-black" title={`${m.user?.name} (${m.role})`}>
                  {m.user?.avatar && <AvatarImage src={m.user.avatar} alt={m.user.name} />}
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                    {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={showInviteModal} onOpenChange={(open) => { setShowInviteModal(open); setInviteError(''); setInviteSuccess(''); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-white text-black hover:bg-zinc-200 font-bold flex items-center gap-1.5 text-xs">
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add Member by Email</DialogTitle>
            </DialogHeader>
            {inviteError ? (
              <div className="text-red-400 text-xs font-medium">{inviteError}</div>
            ) : inviteSuccess ? (
              <div className="text-emerald-400 text-xs font-medium">{inviteSuccess}</div>
            ) : null}
            <form onSubmit={handleInvite} className="space-y-4 pt-2">
              <Input 
                type="email"
                autoFocus
                placeholder="Teammate's email address..." 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setShowInviteModal(false); setInviteSuccess(''); setInviteError(''); }} className="text-zinc-400 hover:text-white">Close</Button>
                <Button type="submit" className="bg-white text-black hover:bg-zinc-200 font-bold">Add Member</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Board Canvas */}
      <div className="flex-1 p-6 flex gap-6 overflow-x-auto items-start bg-black">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {lists.map(list => (
            <BoardList
              key={list._id}
              list={list}
              boardId={boardId}
              cards={cards.filter(c => c.listId === list._id).sort((a,b) => a.order - b.order)}
              socket={socket}
            />
          ))}

          <Card className="w-80 shrink-0 p-3 bg-zinc-950/70 border-dashed border-zinc-800">
            <form onSubmit={handleCreateList} className="space-y-2">
              <Input 
                className="h-9 text-xs bg-black border-zinc-800 text-white placeholder:text-zinc-500" 
                placeholder="Add another list..." 
                value={newListTitle}
                onChange={e => setNewListTitle(e.target.value)}
              />
              {newListTitle && (
                <Button type="submit" size="sm" className="w-full bg-white text-black hover:bg-zinc-200 font-bold text-xs">
                  <Plus className="h-4 w-4 mr-1" /> Add List
                </Button>
              )}
            </form>
          </Card>

          <DragOverlay>
            {activeCard ? <BoardCard card={activeCard} boardId={boardId} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default BoardView;
