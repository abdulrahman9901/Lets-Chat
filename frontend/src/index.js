import React from 'react';
import  ReactDOM  from 'react-dom/client';
import App from './containers/App'
import { Provider } from 'react-redux'
import { compose, configureStore} from '@reduxjs/toolkit'
import  authReducer from './store/reducers/auth'
import  navReducer from './store/reducers/nav'
import  messagesReducer from './store/reducers/messages'
import thunk from 'redux-thunk'
import { BrowserRouter } from "react-router-dom";

const composeEnhancers=window._REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const reducer ={
  auth : authReducer ,
  nav : navReducer ,
  message :messagesReducer
}
const store = configureStore({
  reducer:reducer,
  middleware:getDefaultMiddleware => getDefaultMiddleware().concat(thunk),
  enhancers : composeEnhancers,
})

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>
);