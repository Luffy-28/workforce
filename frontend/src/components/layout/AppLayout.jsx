import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Alert from '../common/Alert';
import { connectSocket, getSocket } from '../../utils/socket';
import { fetchNotifications, addNotification } from '../../store/slices/notificationsSlice';
import { updateItemRealtime } from '../../store/slices/inventorySlice';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/attendance': 'Attendance',
  '/inventory': 'Inventory',
  '/requests': 'Stock Requests',
  '/shifts': 'Shift Schedule',
  '/tasks': 'Tasks',
  '/users': 'User Management',
  '/reports': 'Reports',
  '/sites': 'Sites',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
};

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const title = pageTitles[location.pathname] || 'WorkForce Pro';

  useEffect(() => {
    dispatch(fetchNotifications());
    const socket = connectSocket();

    if (user) {
      socket.emit('join:user', user._id);
      if (user.company) {
        socket.emit('join:company', user.company);
      }
    }

    socket.on('notification:new', (notif) => dispatch(addNotification(notif)));
    socket.on('inventory:update', ({ item }) => { if (item) dispatch(updateItemRealtime(item)); });
    socket.on('inventory:lowStock', ({ item }) => {
      if (item) {
        dispatch(updateItemRealtime(item));
        dispatch(addNotification({ _id: Date.now(), title: '⚠️ Low Stock Alert', message: `${item.itemName} is running low (${item.quantity} left)`, type: 'low-stock', isRead: false, createdAt: new Date() }));
      }
    });

    return () => {
      const s = getSocket();
      if (s) { s.off('notification:new'); s.off('inventory:update'); s.off('inventory:lowStock'); }
    };
  }, [dispatch]);

  return (
    <div className="d-flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="wf-layout">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className={`wf-main ${location.pathname === '/shifts' ? 'wf-main-full' : ''}`}>
          <Outlet />
        </main>
      </div>
      <Alert />
    </div>
  );
};

export default AppLayout;
