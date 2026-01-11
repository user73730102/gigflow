import { createContext, useState, useEffect } from "react";
// DELETE: import axios from "axios"; 
import api from "../api"; // <--- IMPORT THE CONFIGURED API
import { io } from "socket.io-client";
import toast from "react-hot-toast";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Connect socket when user logs in
  useEffect(() => {
    if (user && !socket) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);
      newSocket.emit("join", user._id || user.id);

      newSocket.on("notification", (data) => {
        toast.success(data.message, { duration: 5000 });
      });

      return () => newSocket.disconnect();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      // USE api HERE
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    // USE api HERE (Critical fix)
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data.user);
    toast.success("Logged in!");
  };

  const logout = async () => {
    // USE api HERE
    await api.post("/auth/logout");
    setUser(null);
    if(socket) socket.disconnect();
    setSocket(null);
    toast.success("Logged out");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};