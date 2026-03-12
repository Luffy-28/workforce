import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  } catch (err) { return rejectWithValue(err.message || 'Login failed'); }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('auth/me'); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await api.post('auth/logout'); } catch { }
  localStorage.clear();
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.patch('users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  } catch (err) { return rejectWithValue(err.message); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {
    logout: (state) => { state.user = null; state.initialized = true; localStorage.clear(); },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, { payload }) => { state.loading = false; state.user = payload.user; state.initialized = true; })
      .addCase(loginUser.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(fetchMe.fulfilled, (state, { payload }) => { state.user = payload; state.initialized = true; })
      .addCase(fetchMe.rejected, (state) => { state.initialized = true; localStorage.clear(); })
      .addCase(updateProfile.fulfilled, (state, { payload }) => { state.user = payload; })
      .addCase(logoutUser.fulfilled, (state) => { state.user = null; state.initialized = true; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
