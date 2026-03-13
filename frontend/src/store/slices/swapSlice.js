import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchSwapRequests = createAsyncThunk(
  'swap/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/shifts/swap');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const createSwapRequest = createAsyncThunk(
  'swap/create',
  async (swapData, { rejectWithValue }) => {
    try {
      const response = await api.post('/shifts/swap', swapData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const respondToSwap = createAsyncThunk(
  'swap/respond',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/shifts/swap/${id}/respond`, { status });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const approveSwap = createAsyncThunk(
  'swap/approve',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/shifts/swap/${id}/approve`, { status });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const swapSlice = createSlice({
  name: 'swap',
  initialState: {
    requests: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSwapRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSwapRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchSwapRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch swap requests';
      })
      .addCase(createSwapRequest.fulfilled, (state, action) => {
        state.requests.unshift(action.payload);
      })
      .addCase(respondToSwap.fulfilled, (state, action) => {
        const idx = state.requests.findIndex(r => r._id === action.payload._id);
        if (idx !== -1) state.requests[idx] = action.payload;
      })
      .addCase(approveSwap.fulfilled, (state, action) => {
        const idx = state.requests.findIndex(r => r._id === action.payload._id);
        if (idx !== -1) state.requests[idx] = action.payload;
      });
  },
});

export default swapSlice.reducer;
