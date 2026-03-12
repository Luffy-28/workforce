import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchInventory = createAsyncThunk('inventory/fetchAll', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`inventory${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const createInventoryItem = createAsyncThunk('inventory/create', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('inventory', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateInventoryItem = createAsyncThunk('inventory/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await api.put(`inventory/${id}`, payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const deleteInventoryItem = createAsyncThunk('inventory/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`inventory/${id}`); return id; }
  catch (err) { return rejectWithValue(err.message); }
});

export const fetchRequests = createAsyncThunk('inventory/fetchRequests', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`inventory/requests${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const createRequest = createAsyncThunk('inventory/createRequest', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('inventory/requests', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const approveRequest = createAsyncThunk('inventory/approveRequest', async (id, { rejectWithValue }) => {
  try { const { data } = await api.put(`inventory/requests/${id}/approve`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const deliverRequest = createAsyncThunk('inventory/deliverRequest', async (id, { rejectWithValue }) => {
  try { const { data } = await api.put(`inventory/requests/${id}/deliver`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const rejectRequest = createAsyncThunk('inventory/rejectRequest', async ({ id, reason }, { rejectWithValue }) => {
  try { const { data } = await api.put(`inventory/requests/${id}/reject`, { reason }); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const fetchInventoryLogs = createAsyncThunk('inventory/fetchLogs', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('inventory/logs'); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: { items: [], requests: [], logs: [], loading: false, error: null },
  reducers: {
    updateItemRealtime: (state, { payload }) => {
      const idx = state.items.findIndex(i => i._id === payload._id);
      if (idx !== -1) state.items[idx] = payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => { state.loading = true; })
      .addCase(fetchInventory.fulfilled, (state, { payload }) => { state.loading = false; state.items = payload; })
      .addCase(fetchInventory.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })
      .addCase(createInventoryItem.fulfilled, (state, { payload }) => { state.items.unshift(payload); })
      .addCase(updateInventoryItem.fulfilled, (state, { payload }) => {
        const idx = state.items.findIndex(i => i._id === payload._id);
        if (idx !== -1) state.items[idx] = payload;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, { payload }) => { state.items = state.items.filter(i => i._id !== payload); })
      .addCase(fetchRequests.fulfilled, (state, { payload }) => { state.requests = payload; })
      .addCase(createRequest.fulfilled, (state, { payload }) => { state.requests.unshift(payload); })
      .addCase(approveRequest.fulfilled, (state, { payload }) => {
        const idx = state.requests.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.requests[idx] = payload;
      })
      .addCase(deliverRequest.fulfilled, (state, { payload }) => {
        const idx = state.requests.findIndex(r => r._id === payload.request?._id);
        if (idx !== -1) state.requests[idx] = payload.request;
        if (payload.updatedItem) {
          const iIdx = state.items.findIndex(i => i._id === payload.updatedItem._id);
          if (iIdx !== -1) state.items[iIdx] = payload.updatedItem;
        }
      })
      .addCase(rejectRequest.fulfilled, (state, { payload }) => {
        const idx = state.requests.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.requests[idx] = payload;
      })
      .addCase(fetchInventoryLogs.fulfilled, (state, { payload }) => { state.logs = payload; });
  },
});

export const { updateItemRealtime } = inventorySlice.actions;
export default inventorySlice.reducer;
