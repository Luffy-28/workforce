import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchShifts = createAsyncThunk('shifts/fetchAll', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`shifts${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const createShift = createAsyncThunk('shifts/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('shifts', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateShift = createAsyncThunk('shifts/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.put(`shifts/${id}`, payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const deleteShift = createAsyncThunk('shifts/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`shifts/${id}`); return id; }
  catch (err) { return rejectWithValue(err.message); }
});

export const respondToShift = createAsyncThunk('shifts/respond', async ({ id, status }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`shifts/${id}/respond`, { status }); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const bulkCreateShifts = createAsyncThunk('shifts/bulkCreate', async (shifts, { rejectWithValue }) => {
  try { const { data } = await api.post('shifts/bulk', { shifts }); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const fetchAvailability = createAsyncThunk('availability/fetchAll', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('availability'); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateAvailability = createAsyncThunk('availability/update', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('availability', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState: { items: [], availability: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShifts.pending, (state) => { state.loading = true; })
      .addCase(fetchShifts.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchShifts.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createShift.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(bulkCreateShifts.fulfilled, (state, { payload }) => { state.items = [...payload, ...state.items]; })
      .addCase(updateShift.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(s => s._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(respondToShift.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(s => s._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(deleteShift.fulfilled, (state, { payload }) => { state.items = state.items.filter(s => s._id !== payload); })
      .addCase(fetchAvailability.fulfilled, (state, { payload }) => { state.availability = payload; })
      .addCase(updateAvailability.fulfilled, (state, { payload }) => {
        const idx = state.availability.findIndex(a => a.date === payload.date);
        if (idx !== -1) state.availability[idx] = payload;
        else state.availability.push(payload);
      });
  },
});

export default shiftsSlice.reducer;
