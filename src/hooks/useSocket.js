import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3777';

export function useSocket(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect if we have a userId indicating logged-in state
    if (!userId) return;

    const socket = io(URL, {
      auth: {
        userId,
      },
      transports: ['websocket', 'polling'], // Fallback to polling if needed
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.io] Connected successfully!');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected.');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return { socket: socketRef.current, isConnected };
}
