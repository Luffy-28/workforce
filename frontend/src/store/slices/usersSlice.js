import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchUsers = createAsyncThunk('users/fetchAll', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`users${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const createUser = createAsyncThunk('users/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('users', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateUser = createAsyncThunk('users/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.put(`users/${id}`, payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const deleteUser = createAsyncThunk('users/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`users/${id}`); return id; }
  catch (err) { return rejectWithValue(err.message); }
});

export const assignUserSite = createAsyncThunk('users/assignSite', async ({ id, site }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`users/${id}/assign-site`, { site }); return data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
});

const usersSlice = createSlice({
  name: 'users',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchUsers.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createUser.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(updateUser.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(u => u._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(deleteUser.fulfilled, (state, { payload }) => { state.items = state.items.filter(u => u._id !== payload); })
      .addCase(assignUserSite.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(u => u._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      });
  },
});

export default usersSlice.reducer;
