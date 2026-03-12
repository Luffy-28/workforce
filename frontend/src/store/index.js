import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice';
import inventoryReducer from './slices/inventorySlice';
import shiftsReducer from './slices/shiftsSlice';
import tasksReducer from './slices/tasksSlice';
import usersReducer from './slices/usersSlice';
import notificationsReducer from './slices/notificationsSlice';
import sitesReducer from './slices/sitesSlice';
import alertReducer from './slices/alertSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    inventory: inventoryReducer,
    shifts: shiftsReducer,
    tasks: tasksReducer,
    users: usersReducer,
    notifications: notificationsReducer,
    sites: sitesReducer,
    alert: alertReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['alert/showAlert'],
        ignoredPaths: ['alert.buttons'],
      },
    }),
});

export default store;
