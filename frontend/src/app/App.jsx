import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../features/auth';
import { checkAuthState, logout } from '../features/auth/authSlice';
import * as navActions from '../store/actions/nav';
import * as messagesActions from '../store/actions/messages';
import webSocketInstance from '../websocket';
import Chat from '../Containers/Chat';

const AUTH_EXPIRY_SEC = 3600;

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const isAuthenticated = !!token;
  const showAddChatPopup = useSelector((state) => state.nav.showAddChatPopup);
  const showAddMemeberPopup = useSelector((state) => state.nav.showAddMemeberPopup);
  const showJoinChatPopup = useSelector((state) => state.nav.showJoinChatPopup);
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    dispatch(checkAuthState());
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;
    const exp = localStorage.getItem('expirationDate');
    const expiry = exp ? new Date(exp).getTime() - Date.now() : AUTH_EXPIRY_SEC * 1000;
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => dispatch(logout()), Math.max(0, expiry));
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [token, dispatch]);

  useEffect(() => {
    webSocketInstance.addCallbacks(
      (messages) => dispatch(messagesActions.setMessages(messages)),
      (message) => dispatch(messagesActions.addMessages(message)),
      (username, token) => dispatch(messagesActions.getUserChats(username, token))
    );
  }, [dispatch]);

  const commonProps = {
    isAuthenticated,
    showAddChatPopup,
    showAddMemeberPopup,
    showJoinChatPopup,
    closeAddChatPopup: () => dispatch(navActions.closeAddChatPopup()),
    closeAddMemeberPopup: () => dispatch(navActions.closeAddMemeberPopup()),
    closeJoinChatPopup: () => dispatch(navActions.closeJoinChatPopup()),
    addMessage: (message) => dispatch(messagesActions.addMessages(message)),
    setMessages: (messages) => dispatch(messagesActions.setMessages(messages)),
    getChats: (username, token) => dispatch(messagesActions.getUserChats(username, token)),
  };

  return (
    <div>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/:chatID" element={<Chat {...commonProps} main={false} />} />
        <Route path="/" element={<Chat {...commonProps} main />} />
      </Routes>
    </div>
  );
}
