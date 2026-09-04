import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 text-white shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-black tracking-wider text-white">
            BOARDSYNC
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Log in to access your collaborative task boards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-red-400 text-xs text-center border border-red-900 bg-red-950/50 p-2 rounded">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              required 
            />
            <Input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              required 
            />
            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-bold">
              Log In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-xs text-zinc-500">
          Don't have an account?&nbsp;<Link to="/register" className="text-white underline">Sign up</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
