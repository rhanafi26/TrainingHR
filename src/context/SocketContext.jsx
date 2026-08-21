import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io/',
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected to:', SOCKET_URL);
      setIsConnected(true);
      socketRef.current.emit('register-user', user.id);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event) => {
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  };

  const value = { socket: socketRef.current, isConnected, emit, on, off };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
