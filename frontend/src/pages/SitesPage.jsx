import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSites, createSite, updateSite, deleteSite } from '../store/slices/sitesSlice';
import { fetchUsers, assignUserSite } from '../store/slices/usersSlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { fmtDate } from '../utils/helpers';
import Alert from '../utils/alert';

const SitesPage = () => {
    const dispatch = useDispatch();
    const { items: sites, loading } = useSelector(s => s.sites);
    const { items: users } = useSelector(s => s.users);
    const { user: currentUser } = useSelector(s => s.auth);
    const isAdmin = currentUser?.role === 'admin';
    const isManager = ['admin', 'manager'].includes(currentUser?.role);

    // Site filtering: Managers only see their own assigned sites AND only active ones
    const visibleSites = isAdmin ? sites : sites.filter(s =>
        (s.manager?._id || s.manager) === currentUser._id && s.status === 'active'
    );

    const [showModal, setShowModal] = useState(false);
    const [editSite, setEditSite] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', manager: '', status: 'active' });
    const [submitting, setSubmitting] = useState(false);

    // Assign site modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignSiteId, setAssignSiteId] = useState('');
    const [assignUserId, setAssignUserId] = useState('');
    const [assignableUsers, setAssignableUsers] = useState([]);

    // Auto-address lookup state
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimer = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        dispatch(fetchSites());
        // Managers need to see users too for assignment
        if (isManager) {
            dispatch(fetchUsers('?status=active'));
        }
    }, [dispatch, isManager]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced address lookup using Nominatim (OpenStreetMap)
    const lookupAddress = useCallback((query) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!query || query.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        debounceTimer.current = setTimeout(async () => {
            setSearchingAddress(true);
            setShowSuggestions(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                setAddressSuggestions(data.map(item => ({
                    display: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                })));
            } catch {
                setAddressSuggestions([]);
            } finally {
                setSearchingAddress(false);
            }
        }, 500);
    }, []);

    const handleNameChange = (e) => {
        const name = e.target.value;
        setForm(p => ({ ...p, name }));
        if (!editSite) lookupAddress(name);
    };

    const selectSuggestion = (suggestion) => {
        setForm(p => ({ ...p, address: suggestion.display }));
        setShowSuggestions(false);
        setAddressSuggestions([]);
    };

    const openAdd = () => {
        setEditSite(null);
        setForm({ name: '', address: '', manager: '', status: 'active' });
        setAddressSuggestions([]);
        setShowSuggestions(false);
        setShowModal(true);
    };

    const openEdit = (s) => {
        setEditSite(s);
        setForm({ name: s.name, address: s.address || '', manager: s.manager?._id || s.manager || '', status: s.status });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editSite) await dispatch(updateSite({ id: editSite._id, ...form })).unwrap();
            else await dispatch(createSite(form)).unwrap();
            Alert.success('Success', `Site ${editSite ? 'updated' : 'created'} successfully`);
            setShowModal(false);
        } catch (err) {
            Alert.error('Error', err || 'Failed to save site');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Site', 'Are you sure you want to delete this site? All associated users will be unassigned.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteSite(id)) }
        ]);
    };

    const openAssignModal = (siteId) => {
        setAssignSiteId(siteId);
        setAssignUserId('');
        // Ensure assignable users are filtered by active status and relevant roles
        const filtered = users.filter(u => ['employee', 'supervisor', 'manager'].includes(u.role));
        setAssignableUsers(filtered);
        setShowAssignModal(true);
    };

    const handleAssignSite = async () => {
        if (!assignUserId) return;
        setSubmitting(true);
        try {
            await dispatch(assignUserSite({ id: assignUserId, site: assignSiteId })).unwrap();
            Alert.success('Success', 'User assigned to site successfully');
            setShowAssignModal(false);
            // Refresh users to update site info in dropdown
            dispatch(fetchUsers('?status=active'));
        } catch (err) {
            Alert.error('Error', err || 'Failed to assign user');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="fw-display fw-bold mb-1">Company Sites</h2>
                    <p className="text-muted small mb-0">Manage physical work locations and branches</p>
                </div>
                <div className="d-flex gap-2">
                    {isManager && (
                        <button className="wf-btn wf-btn-outline" onClick={() => openAssignModal('')}>
                            <i className="bi bi-person-plus" /> Assign User
                        </button>
                    )}
                    {isAdmin && (
                        <button className="wf-btn wf-btn-primary" onClick={openAdd}>
                            <i className="bi bi-plus-lg" />Add Site
                        </button>
                    )}
                </div>
            </div>

            <div className="row g-4">
                {loading ? <Spinner /> : visibleSites.length === 0 ? (
                    <div className="col-12"><EmptyState icon="bi-geo-alt" title="No Sites Found" message={isAdmin ? "Create your first branch or site location" : "You are not assigned to any sites yet"} /></div>
                ) : visibleSites.map(site => (
                    <div key={site._id} className="col-md-6 col-xl-4">
                        <div className="wf-site-card">
                            {/* Status accent bar */}
                            <div className={`wf-site-accent ${site.status}`} />

                            <div className="wf-site-content">
                                {/* Top row: name + badge */}
                                <div className="wf-site-top">
                                    <h6 className="wf-site-name">{site.name}</h6>
                                    <Badge status={site.status}>{site.status}</Badge>
                                </div>

                                {/* Info rows */}
                                <div className="wf-site-info">
                                    <div className="wf-site-info-row">
                                        <i className="bi bi-geo-alt" />
                                        <span title={site.address || 'No address set'}>
                                            {site.address || 'No address set'}
                                        </span>
                                    </div>
                                    <div className="wf-site-info-row">
                                        <i className="bi bi-person-badge" />
                                        <span>{site.manager?.name || 'No manager assigned'}</span>
                                    </div>
                                    {site.createdAt && (
                                        <div className="wf-site-info-row">
                                            <i className="bi bi-calendar3" />
                                            <span>Created {fmtDate(site.createdAt)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="wf-site-actions">
                                    {isAdmin && (
                                        <button className="wf-btn wf-btn-outline wf-btn-sm flex-grow-1" onClick={() => openEdit(site)}>
                                            <i className="bi bi-pencil" />Edit
                                        </button>
                                    )}
                                    {isManager && (
                                        <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => openAssignModal(site._id)}>
                                            <i className="bi bi-person-plus" /> {isAdmin ? '' : 'Assign User'}
                                        </button>
                                    )}
                                    {isAdmin && (
                                        <button className="wf-btn wf-btn-sm wf-btn-outline text-danger" onClick={() => handleDelete(site._id)} style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                                            <i className="bi bi-trash" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add / Edit Site Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title={editSite ? 'Edit Site' : 'Add New Site'}>
                <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                        <div className="col-12">
                            <div className="wf-form-group wf-name-field-wrapper" ref={suggestionsRef}>
                                <label className="wf-label">Site Name *</label>
                                <input
                                    className="wf-input"
                                    value={form.name}
                                    onChange={handleNameChange}
                                    required
                                    placeholder="e.g. McDonald's Sydney CBD"
                                    autoComplete="off"
                                />
                                {!editSite && form.name.length >= 3 && (
                                    <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.3rem', marginBottom: 0 }}>
                                        <i className="bi bi-search" style={{ marginRight: '0.3rem' }} />
                                        Searching for address...
                                    </p>
                                )}
                                {showSuggestions && (
                                    <div className="wf-address-suggestions">
                                        {searchingAddress ? (
                                            <div className="wf-address-searching">
                                                <div className="wf-spinner-sm" />
                                                Looking up addresses...
                                            </div>
                                        ) : addressSuggestions.length > 0 ? (
                                            addressSuggestions.map((s, i) => (
                                                <button
                                                    type="button"
                                                    key={i}
                                                    className="wf-address-suggestion"
                                                    onClick={() => selectSuggestion(s)}
                                                >
                                                    <i className="bi bi-geo-alt-fill" />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.display}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="wf-address-searching">No results found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="wf-form-group">
                                <label className="wf-label">Address</label>
                                <input className="wf-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Auto-filled from search, or type manually" />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="wf-form-group">
                                <label className="wf-label">Site Manager</label>
                                <select className="wf-select" value={form.manager} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}>
                                    <option value="">Select Manager</option>
                                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="wf-form-group">
                                <label className="wf-label">Status</label>
                                <select className="wf-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" disabled={submitting} className="wf-btn wf-btn-primary">
                            {submitting ? 'Saving...' : editSite ? 'Update Site' : 'Create Site'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Assign User to Site Modal */}
            <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign User to Site">
                <div className="row g-3">
                    <div className="col-12">
                        <div className="wf-form-group">
                            <label className="wf-label">Select Site *</label>
                            <select className="wf-select" value={assignSiteId} onChange={e => setAssignSiteId(e.target.value)}>
                                <option value="">Choose Site...</option>
                                {sites.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="wf-form-group">
                            <label className="wf-label">Select Employee / Supervisor *</label>
                            <select className="wf-select" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                                <option value="">Choose User...</option>
                                {assignableUsers.map(u => (
                                    <option key={u._id} value={u._id}>
                                        {u.name} ({u.role})
                                        {u.site ? ` — currently at ${sites.find(s => s._id === (u.site?._id || u.site))?.name || 'unknown site'}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="d-flex justify-content-end gap-2 mt-4">
                    <button className="wf-btn wf-btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
                    <button className="wf-btn wf-btn-primary" disabled={!assignSiteId || !assignUserId || submitting} onClick={handleAssignSite}>
                        {submitting ? 'Assigning...' : 'Assign to Site'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SitesPage;
