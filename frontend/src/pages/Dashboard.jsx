import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Users } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const Dashboard = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      setBoards(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await api.post('/boards', { title: newTitle });
      setBoards([...boards, res.data]);
      setOpenModal(false);
      setNewTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 bg-black min-h-screen">Loading your boards...</div>;

  return (
    <div className="min-h-[calc(100vh-61px)] bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">YOUR BOARDS</h1>
            <p className="text-zinc-400 text-xs mt-1">Real-time collaborative workspaces in monochrome black & white.</p>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200 font-bold text-xs">
                <Plus className="h-4 w-4 mr-1" /> Create Board
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Board</DialogTitle>
              </DialogHeader>
              <form onSubmit={createBoard} className="space-y-4 pt-2">
                <Input 
                  autoFocus
                  placeholder="Board title..." 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpenModal(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
                  <Button type="submit" className="bg-white text-black hover:bg-zinc-200 font-bold">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map(board => (
            <Link to={`/b/${board._id}`} key={board._id}>
              <Card className="h-44 flex flex-col justify-between p-6 bg-zinc-950 border-zinc-800 hover:border-white transition-all duration-200 cursor-pointer group shadow-xl">
                <div className="space-y-2">
                  <CardTitle className="text-lg font-bold text-white group-hover:underline">{board.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 border border-zinc-700">
                      {board.owner?.avatar && <AvatarImage src={board.owner.avatar} alt={board.owner.name} />}
                      <AvatarFallback className="bg-zinc-800 text-white text-[10px]">
                        {board.owner?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <CardDescription className="text-xs text-zinc-400">
                      Owner: {board.owner?.name || 'You'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-4 border-t border-zinc-900">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{board.members.length} member{board.members.length > 1 ? 's' : ''}</span>
                  </div>
                  <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-white text-[10px]">Active</Badge>
                </div>
              </Card>
            </Link>
          ))}

          <div 
            onClick={() => setOpenModal(true)}
            className="h-44 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/60 hover:border-zinc-500 transition-all flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-white gap-2"
          >
            <Plus className="h-8 w-8 text-white" />
            <span className="font-bold text-xs uppercase tracking-wider">Create Board</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
