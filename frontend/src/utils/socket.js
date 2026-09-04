import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true,
  autoConnect: false // Connect manually when entering a board
});

export default socket;
