import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('expirationDate');
  localStorage.removeItem('username');
  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
};

const setAuthStorage = (token, username) => {
  localStorage.setItem('token', token);
  localStorage.setItem('expirationDate', new Date(Date.now() + 3600 * 1000).toISOString());
  localStorage.setItem('username', username);
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.headers = { 'Content-Type': 'application/json' };
    try {
      const { data } = await axios.post(`${API_BASE_URL}/rest-auth/login/`, { username, password });
      setAuthStorage(data.key, username);
      return { token: data.key, username };
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (
    { username, email, password1, password2, gender, phone_number },
    { rejectWithValue }
  ) => {
    axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
    axios.defaults.xsrfCookieName = 'csrftoken';
    try {
      const { data } = await axios.post(`${API_BASE_URL}/rest-auth/registration/`, {
        username,
        email,
        password1,
        password2,
        gender,
        phone_number,
      });
      setAuthStorage(data.key, username);
      return { token: data.key, username };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  clearAuthStorage();
  axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
  axios.defaults.xsrfCookieName = 'csrftoken';
  try {
    await axios.post(`${API_BASE_URL}/rest-auth/logout/`, {});
  } catch (e) {
    // ignore
  }
  return null;
});

export const checkAuthState = createAsyncThunk('auth/checkState', () => {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const exp = localStorage.getItem('expirationDate');
  if (!token || !username) return null;
  const expirationDate = new Date(exp);
  if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
    clearAuthStorage();
    return null;
  }
  return { token, username };
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    username: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.token = payload.token;
        state.username = payload.username;
        state.error = null;
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.token = payload.token;
        state.username = payload.username;
        state.error = null;
      })
      .addCase(signup.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.username = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkAuthState.fulfilled, (state, { payload }) => {
        if (payload) {
          state.token = payload.token;
          state.username = payload.username;
        } else {
          state.token = null;
          state.username = null;
        }
      })
      .addCase(logout.rejected, () => {});
  },
});

export const { resetError } = authSlice.actions;
export default authSlice.reducer;
