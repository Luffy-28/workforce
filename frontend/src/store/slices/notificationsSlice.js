import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('notifications'); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try { await api.put(`notifications/${id}/read`); return id; }
  catch (err) { return rejectWithValue(err.message); }
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try { await api.put('notifications/read-all'); }
  catch (err) { return rejectWithValue(err.message); }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], loading: false },
  reducers: {
    addNotification: (state, { payload }) => { state.items.unshift(payload); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => { state.items = payload; })
      .addCase(markRead.fulfilled, (state, { payload }) => {
        const n = state.items.find(n => n._id === payload);
        if (n) n.isRead = true;
      })
      .addCase(markAllRead.fulfilled, (state) => { state.items.forEach(n => { n.isRead = true; }); });
  },
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
