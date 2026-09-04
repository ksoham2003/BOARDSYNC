import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      await loginWithGoogle({
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture,
        googleId: decoded.sub
      });
      navigate('/');
    } catch (err) {
      setError('Google registration failed');
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
            Create an account or Sign up with Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="text-red-400 text-xs text-center border border-red-900 bg-red-950/50 p-2 rounded">{error}</div>}

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Registration Failed')}
              theme="filled_black"
              shape="pill"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full"></div>
            <span className="bg-zinc-950 px-3 text-[10px] text-zinc-500 uppercase tracking-widest absolute">or</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              type="text" 
              placeholder="Full Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              required 
            />
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
              Sign Up
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-xs text-zinc-500">
          Already have an account?&nbsp;<Link to="/login" className="text-white underline">Log in</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;
