import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../store/slices/inventorySlice';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { fmtDate } from '../utils/helpers';
import Alert from '../utils/alert';

const UNITS = ['units', 'kg', 'liters', 'boxes', 'pairs', 'meters', 'rolls', 'packs'];
const EMPTY_FORM = { itemName: '', category: '', quantity: '', minThreshold: '', unitType: 'units', description: '', sku: '', supplier: { name: '', contact: '', email: '' } };

const InventoryPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { items, loading } = useSelector(s => s.inventory);
  const isManager = ['admin', 'manager'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { dispatch(fetchInventory()); }, [dispatch]);

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = items.filter(i => {
    if (filterLow && !i.isLowStock) return false;
    if (filterCategory && i.category !== filterCategory) return false;
    if (search && !i.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ itemName: item.itemName, category: item.category, quantity: item.quantity, minThreshold: item.minThreshold, unitType: item.unitType || 'units', description: item.description || '', sku: item.sku || '', supplier: item.supplier || { name: '', contact: '', email: '' } });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (editItem) {
      await dispatch(updateInventoryItem({ id: editItem._id, ...form, quantity: +form.quantity, minThreshold: +form.minThreshold }));
    } else {
      await dispatch(createInventoryItem({ ...form, quantity: +form.quantity, minThreshold: +form.minThreshold }));
    }
    setShowModal(false);
    setSubmitting(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this inventory item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteInventoryItem(id)) }
    ]);
  };

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setSupplier = (key, val) => setForm(p => ({ ...p, supplier: { ...p.supplier, [key]: val } }));

  return (
    <div>
      {/* Low Stock Banner */}
      {items.filter(i => i.isLowStock).length > 0 && (
        <div className="wf-alert-strip mb-4">
          <i className="bi bi-exclamation-triangle-fill text-danger fs-5" />
          <div>
            <div className="fw-semibold text-danger small mb-1">{items.filter(i => i.isLowStock).length} items below minimum threshold</div>
            <div className="d-flex flex-wrap gap-1">
              {items.filter(i => i.isLowStock).map(i => (
                <span key={i._id} className="wf-badge wf-badge-red">{i.itemName}: {i.quantity} {i.unitType}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="wf-search">
            <i className="bi bi-search wf-search-icon" />
            <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="wf-select" style={{ width: 'auto' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className={`wf-btn wf-btn-sm ${filterLow ? 'wf-btn-danger' : 'wf-btn-outline'}`} onClick={() => setFilterLow(p => !p)}>
            <i className="bi bi-exclamation-triangle" />Low Stock Only
          </button>
        </div>
        {isManager && (
          <button className="wf-btn wf-btn-primary" onClick={openAdd}>
            <i className="bi bi-plus-lg" />Add Item
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="wf-stat-card text-center">
            <div className="wf-stat-value">{items.length}</div>
            <div className="wf-stat-label">Total Items</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="wf-stat-card text-center">
            <div className="wf-stat-value text-danger">{items.filter(i => i.isLowStock).length}</div>
            <div className="wf-stat-label">Low Stock</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="wf-stat-card text-center">
            <div className="wf-stat-value">{categories.length}</div>
            <div className="wf-stat-label">Categories</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="wf-stat-card text-center">
            <div className="wf-stat-value text-success">{items.filter(i => !i.isLowStock).length}</div>
            <div className="wf-stat-label">Well Stocked</div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="wf-card">
        <div className="wf-card-header">
          <h6 className="wf-card-title">Stock Items ({filtered.length})</h6>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Min</th>
                  <th>Unit</th>
                  <th>Supplier</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="9"><EmptyState icon="bi-box-seam" title="No Items" message="Add inventory items using the button above" /></td></tr>
                ) : filtered.map(item => (
                  <tr key={item._id} className={item.isLowStock ? 'table-danger table-sm' : ''}>
                    <td>
                      <div className="fw-semibold small">{item.itemName}</div>
                      {item.sku && <div className="text-muted-sm">SKU: {item.sku}</div>}
                    </td>
                    <td><span className="wf-badge wf-badge-gray">{item.category}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`fw-bold ${item.isLowStock ? 'text-danger' : ''}`}>{item.quantity}</span>
                        <div className="wf-progress" style={{ width: 50 }}>
                          <div className="wf-progress-bar" style={{ width: `${Math.min(100, (item.quantity / (item.minThreshold * 3)) * 100)}%`, background: item.isLowStock ? '#ef4444' : undefined }} />
                        </div>
                      </div>
                    </td>
                    <td className="small text-muted">{item.minThreshold}</td>
                    <td className="small text-muted">{item.unitType}</td>
                    <td className="small text-muted">{item.supplier?.name || '—'}</td>
                    <td className="small text-muted">{fmtDate(item.updatedAt)}</td>
                    <td><Badge status={item.isLowStock ? 'rejected' : 'active'}>{item.isLowStock ? 'Low Stock' : 'In Stock'}</Badge></td>
                    {isManager && (
                      <td>
                        <div className="d-flex gap-2">
                          <button className="wf-btn wf-btn-outline wf-btn-sm" onClick={() => openEdit(item)}>
                            <i className="bi bi-pencil" />Edit
                          </button>
                          {user?.role === 'admin' && (
                            <button className="wf-btn wf-btn-sm" style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fee2e2' }} onClick={() => handleDelete(item._id)}>
                              <i className="bi bi-trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Item' : 'Add Inventory Item'} wide>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Item Name *</label>
                <input className="wf-input" value={form.itemName} onChange={e => setF('itemName', e.target.value)} required />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Category *</label>
                <input className="wf-input" value={form.category} onChange={e => setF('category', e.target.value)} required placeholder="e.g. Safety, Tools, Cleaning" />
              </div>
            </div>
            <div className="col-md-4">
              <div className="wf-form-group">
                <label className="wf-label">Quantity *</label>
                <input className="wf-input" type="number" min="0" value={form.quantity} onChange={e => setF('quantity', e.target.value)} required />
              </div>
            </div>
            <div className="col-md-4">
              <div className="wf-form-group">
                <label className="wf-label">Min Threshold *</label>
                <input className="wf-input" type="number" min="0" value={form.minThreshold} onChange={e => setF('minThreshold', e.target.value)} required />
              </div>
            </div>
            <div className="col-md-4">
              <div className="wf-form-group">
                <label className="wf-label">Unit Type</label>
                <select className="wf-select" value={form.unitType} onChange={e => setF('unitType', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">SKU (optional)</label>
                <input className="wf-input" value={form.sku} onChange={e => setF('sku', e.target.value)} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="wf-form-group">
                <label className="wf-label">Description (optional)</label>
                <input className="wf-input" value={form.description} onChange={e => setF('description', e.target.value)} />
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p className="small fw-semibold text-muted mb-2 text-uppercase" style={{ letterSpacing: '0.05em' }}>Supplier Info</p>
                <div className="row g-2">
                  <div className="col-md-4">
                    <input className="wf-input" placeholder="Supplier name" value={form.supplier?.name || ''} onChange={e => setSupplier('name', e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <input className="wf-input" placeholder="Contact number" value={form.supplier?.contact || ''} onChange={e => setSupplier('contact', e.target.value)} />
                  </div>
                  <div className="col-md-4">
                    <input className="wf-input" type="email" placeholder="Supplier email" value={form.supplier?.email || ''} onChange={e => setSupplier('email', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="wf-btn wf-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" disabled={submitting} className="wf-btn wf-btn-primary">
              {submitting ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
