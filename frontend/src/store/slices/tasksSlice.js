import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`tasks${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const createTask = createAsyncThunk('tasks/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('tasks', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.put(`tasks/${id}`, payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`tasks/${id}`); return id; }
  catch (err) { return rejectWithValue(err.message); }
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; })
      .addCase(fetchTasks.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchTasks.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createTask.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(updateTask.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(t => t._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(deleteTask.fulfilled, (state, { payload }) => { state.items = state.items.filter(t => t._id !== payload); });
  },
});

export default tasksSlice.reducer;
