import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(socketUrl, {
  withCredentials: true,
  autoConnect: false // Connect manually when entering a board
});

export default socket;
