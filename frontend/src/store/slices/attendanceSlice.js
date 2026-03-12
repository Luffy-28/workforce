import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAttendance = createAsyncThunk('attendance/fetchAll', async (params = '', { rejectWithValue }) => {
  try { const { data } = await api.get(`attendance${params}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const fetchMyAttendance = createAsyncThunk('attendance/fetchMy', async (_, { rejectWithValue }) => {
  try { const { data } = await api.get('attendance/my'); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const clockIn = createAsyncThunk('attendance/clockIn', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('attendance/clock-in', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const clockOut = createAsyncThunk('attendance/clockOut', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('attendance/clock-out', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const breakStart = createAsyncThunk('attendance/breakStart', async (_, { rejectWithValue }) => {
  try { const { data } = await api.post('attendance/break-start', {}); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const breakEnd = createAsyncThunk('attendance/breakEnd', async (_, { rejectWithValue }) => {
  try { const { data } = await api.post('attendance/break-end', {}); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

// Adjustments
export const requestAdjustment = createAsyncThunk('attendance/requestAdjustment', async (payload, { rejectWithValue }) => {
  try { const { data } = await api.post('attendance/adjustments', payload); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const fetchAdjustments = createAsyncThunk('attendance/fetchAdjustments', async (status = 'pending', { rejectWithValue }) => {
  try { const { data } = await api.get(`attendance/adjustments?status=${status}`); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const processAdjustment = createAsyncThunk('attendance/processAdjustment', async ({ id, status, rejectionReason }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`attendance/adjustments/${id}/process`, { status, rejectionReason }); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

export const updateAttendanceStatus = createAsyncThunk('attendance/updateStatus', async ({ id, status, notes }, { rejectWithValue }) => {
  try { const { data } = await api.patch(`attendance/${id}/status`, { status, notes }); return data; }
  catch (err) { return rejectWithValue(err.message); }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    records: [],
    myRecords: [],
    adjustments: [],
    loading: false,
    error: null,
    clockedIn: false,
    onBreak: false
  },
  reducers: {
    setClockedIn: (state, { payload }) => { state.clockedIn = payload; },
    setOnBreak: (state, { payload }) => { state.onBreak = payload; },
    addRecord: (state, { payload }) => { state.records.unshift(payload); },
    clearAttendanceError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => { state.loading = true; })
      .addCase(fetchAttendance.fulfilled, (state, { payload }) => { state.loading = false; state.records = payload; })
      .addCase(fetchAttendance.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchMyAttendance.pending, (state) => { state.loading = true; })
      .addCase(fetchMyAttendance.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.myRecords = Array.isArray(payload) ? payload : [];
        const today = new Date().toDateString();
        const active = state.myRecords.find(r => new Date(r.date || r.signInTime).toDateString() === today && !r.signOutTime);
        state.clockedIn = !!active;
        state.onBreak = active?.status === 'on-break';
      })
      .addCase(fetchMyAttendance.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(clockIn.fulfilled, (state, { payload }) => { state.clockedIn = true; state.myRecords.unshift(payload); })
      .addCase(clockOut.fulfilled, (state) => { state.clockedIn = false; state.onBreak = false; })
      .addCase(breakStart.fulfilled, (state) => { state.onBreak = true; })
      .addCase(breakEnd.fulfilled, (state) => { state.onBreak = false; })

      .addCase(fetchAdjustments.fulfilled, (state, { payload }) => { state.adjustments = payload; })
      .addCase(processAdjustment.fulfilled, (state, { payload }) => {
        state.adjustments = state.adjustments.filter(a => a._id !== payload._id);
      })
      .addCase(updateAttendanceStatus.fulfilled, (state, { payload }) => {
        const idx = state.records.findIndex(r => r._id === payload._id);
        if (idx !== -1) state.records[idx] = payload;
      });
  },
});

export const { setClockedIn, setOnBreak, addRecord, clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
