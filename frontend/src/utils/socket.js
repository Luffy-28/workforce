import { io } from 'socket.io-client';

// REPLACE: Set REACT_APP_SOCKET_URL in .env
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => console.log('Socket.IO connected'));
    socket.on('disconnect', () => console.log('Socket.IO disconnected'));
  }
  return socket;
};

export const getSocket = () => socket;
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
