import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchLeaves = createAsyncThunk(
  'leaves/fetchAll',
  async (params = '', { rejectWithValue }) => {
    try {
      const response = await api.get(`/leaves${params}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const submitLeaveRequest = createAsyncThunk(
  'leaves/submit',
  async (leaveData, { rejectWithValue }) => {
    try {
      const response = await api.post('/leaves', leaveData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const updateLeaveStatus = createAsyncThunk(
  'leaves/updateStatus',
  async ({ id, status, managerNote }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/leaves/${id}/status`, { status, managerNote });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const leavesSlice = createSlice({
  name: 'leaves',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearLeaveError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaves.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch leaves';
      })
      .addCase(submitLeaveRequest.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateLeaveStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i._id === action.payload._id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      });
  },
});

export const { clearLeaveError } = leavesSlice.actions;
export default leavesSlice.reducer;
