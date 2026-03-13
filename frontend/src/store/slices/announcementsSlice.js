import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAnnouncements = createAsyncThunk(
  'announcements/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/announcements');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const createAnnouncement = createAsyncThunk(
  'announcements/create',
  async (announcementData, { rejectWithValue }) => {
    try {
      const response = await api.post('/announcements', announcementData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const announcementsSlice = createSlice({
  name: 'announcements',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    addAnnouncement: (state, action) => {
      state.items.unshift(action.payload);
      if (state.items.length > 10) state.items.pop();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch announcements';
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        // Handled by socket ideally, but adding here just in case
        const exists = state.items.find(i => i._id === action.payload._id);
        if (!exists) {
          state.items.unshift(action.payload);
          if (state.items.length > 10) state.items.pop();
        }
      });
  },
});

export const { addAnnouncement } = announcementsSlice.actions;
export default announcementsSlice.reducer;
