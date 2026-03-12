import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../store/slices/authSlice';
import Alert from '../utils/alert';

const ProfilePage = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(s => s.auth);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
        address: user?.address || '',
    });
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('email', form.email);
        formData.append('phone', form.phone);
        if (form.dob) formData.append('dob', form.dob);
        formData.append('address', form.address);
        if (avatar) formData.append('avatar', avatar);

        try {
            await dispatch(updateProfile(formData)).unwrap();
            Alert.success('Success', 'Profile updated successfully');
        } catch (err) {
            Alert.error('Error', err || 'Failed to update profile');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    <div className="wf-card p-5">
                        <h2 className="fw-display fw-bold mb-4">My Profile</h2>

                        <form onSubmit={handleSubmit}>
                            <div className="d-flex flex-column align-items-center mb-5">
                                <div className="position-relative mb-3">
                                    <div className="wf-profile-avatar-lg">
                                        {preview || user?.avatar ? (
                                            <img src={preview || `${process.env.REACT_APP_API_URL?.replace('/api', '')}${user.avatar}`} alt="Avatar" />
                                        ) : (
                                            <div className="wf-avatar-placeholder">{user?.name?.slice(0, 1).toUpperCase()}</div>
                                        )}
                                    </div>
                                    <button type="button" className="wf-btn-icon-float" onClick={() => fileInputRef.current.click()}>
                                        <i className="bi bi-camera" />
                                    </button>
                                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                                </div>
                                <div className="text-center">
                                    <h4 className="fw-bold mb-1">{user?.name}</h4>
                                    <p className="text-muted small mb-0">{user?.role?.toUpperCase()} • {user?.company?.name || 'Company Name'}</p>
                                </div>
                            </div>

                            <div className="row g-4">
                                <div className="col-12">
                                    <label className="wf-label">Full Name</label>
                                    <input className="wf-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="wf-label">Email Address</label>
                                    <input className="wf-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="wf-label">Phone Number</label>
                                    <input className="wf-input" type="tel" placeholder="04xx xxx xxx" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="wf-label">Date of Birth</label>
                                    <input className="wf-input" type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="wf-label">Address</label>
                                    <input className="wf-input" placeholder="123 Main St, City" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                                </div>

                                <div className="col-12 mt-5">
                                    <button type="submit" className="wf-btn wf-btn-primary w-100 py-3" disabled={submitting}>
                                        {submitting ? 'Updating...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
        .wf-profile-avatar-lg { width: 150px; height: 150px; border-radius: 50%; border: 4px solid white; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .wf-profile-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
        .wf-avatar-placeholder { font-size: 3rem; font-weight: 800; color: #6366f1; }
        .wf-btn-icon-float { position: absolute; bottom: 5px; right: 5px; width: 42px; height: 42px; border-radius: 50%; background: #6366f1; color: white; border: 4px solid white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .wf-btn-icon-float:hover { background: #4f46e5; transform: scale(1.1); }
      `}</style>
        </div>
    );
};

export default ProfilePage;
