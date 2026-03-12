import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchSites = createAsyncThunk('sites/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const res = await api.get('sites');
        return res.data;
    } catch (err) { return rejectWithValue(err.response.data); }
});

export const createSite = createAsyncThunk('sites/create', async (data, { rejectWithValue }) => {
    try {
        const res = await api.post('sites', data);
        return res.data;
    } catch (err) { return rejectWithValue(err.response.data); }
});

export const updateSite = createAsyncThunk('sites/update', async ({ id, ...data }, { rejectWithValue }) => {
    try {
        const res = await api.patch(`sites/${id}`, data);
        return res.data;
    } catch (err) { return rejectWithValue(err.response.data); }
});

export const deleteSite = createAsyncThunk('sites/delete', async (id, { rejectWithValue }) => {
    try {
        await api.delete(`sites/${id}`);
        return id;
    } catch (err) { return rejectWithValue(err.response.data); }
});

const sitesSlice = createSlice({
    name: 'sites',
    initialState: { items: [], loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSites.pending, (s) => { s.loading = true; })
            .addCase(fetchSites.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
            .addCase(fetchSites.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
            .addCase(createSite.fulfilled, (s, a) => { s.items.push(a.payload); })
            .addCase(updateSite.fulfilled, (s, a) => {
                const idx = s.items.findIndex(i => i._id === a.payload._id);
                if (idx !== -1) s.items[idx] = a.payload;
            })
            .addCase(deleteSite.fulfilled, (s, a) => {
                s.items = s.items.filter(i => i._id !== a.payload);
            });
    }
});

export default sitesSlice.reducer;
