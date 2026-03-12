import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isOpen: false,
    alertId: null,   // ← links modal back to callback registry in alert.js
    title: '',
    message: '',
    buttons: [],     // Only { text, style, index } — NO onPress functions
};

const alertSlice = createSlice({
    name: 'alert',
    initialState,
    reducers: {
        showAlert: (state, action) => {
            state.isOpen = true;
            state.alertId = action.payload.alertId;
            state.title = action.payload.title;
            state.message = action.payload.message;
            state.buttons = action.payload.buttons || [{ text: 'OK', style: 'default', index: 0 }];
        },
        hideAlert: (state) => {
            state.isOpen = false;
            state.alertId = null;
            state.title = '';
            state.message = '';
            state.buttons = [];
        },
    },
});

export const { showAlert, hideAlert } = alertSlice.actions;
export default alertSlice.reducer;