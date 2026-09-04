import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const AcceptInvite = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInviteDetails();
  }, [boardId]);

  const fetchInviteDetails = async () => {
    try {
      const res = await api.get(`/boards/${boardId}/invite-details`);
      setDetails(res.data);
      if (res.data.status === 'active') {
        navigate(`/b/${boardId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      await api.post(`/boards/${boardId}/accept-invite`);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/b/${boardId}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 bg-black min-h-screen">Loading invitation...</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-black tracking-wider text-white uppercase">
            ROOM INVITATION
          </CardTitle>
          <CardDescription className="text-zinc-400">
            You've been invited to join a collaborative task board.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-xs border border-red-900 bg-red-950/50 p-3 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-white">Invitation Accepted!</h3>
              <p className="text-xs text-zinc-400">Redirecting to board room...</p>
            </div>
          ) : (
            details && (
              <div className="space-y-6">
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Board Room</span>
                  <h3 className="text-xl font-black text-white">{details.title}</h3>
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                    <Avatar className="h-6 w-6 border border-zinc-700">
                      {details.owner?.avatar && <AvatarImage src={details.owner.avatar} alt={details.owner.name} />}
                      <AvatarFallback className="bg-zinc-800 text-white text-[9px]">
                        {details.owner?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>Owner: <strong>{details.owner?.name}</strong></span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleAccept} 
                    disabled={accepting} 
                    className="w-full bg-white text-black hover:bg-zinc-200 font-bold py-6 text-sm"
                  >
                    {accepting ? 'Joining Room...' : 'Accept Invitation & Join Room'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')} 
                    className="w-full text-zinc-400 hover:text-white text-xs"
                  >
                    Decline & Go to Dashboard
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
