import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { authReducer } from './features/auth';
import navReducer from './store/reducers/nav';
import messagesReducer from './store/reducers/messages';

const store = configureStore({
  reducer: {
    auth: authReducer,
    nav: navReducer,
    message: messagesReducer,
  },
});

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>
);