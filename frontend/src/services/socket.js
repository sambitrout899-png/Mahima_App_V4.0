// src/services/socket.js (frontend)
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000'; // if server and browser run on same PC
// If you test on a mobile device/emulator, replace with your machine IP: http://192.168.x.y:3000

let socket;

export function connectSocket(userId) {
  if (socket && socket.connected) return socket;
  socket = io(SERVER_URL, { transports: ['websocket'] });
  socket.on('connect', () => {
    console.log('socket connected', socket.id);
    socket.emit('register', userId);
  });
  socket.on('disconnect', () => console.log('socket disconnected'));
  return socket;
}

export function getSocket() { return socket; }
