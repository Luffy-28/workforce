import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const CompanyRegisterPage = () => {
    const [formData, setFormData] = useState({
        companyName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/companies/register', formData);
            navigate('/login', { state: { message: 'Company registered successfully! Please login with your admin account.' } });
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wf-login-bg">
            <div className="wf-login-card" style={{ maxWidth: '450px' }}>
                <div className="wf-login-logo">
                    <i className="bi bi-building-add text-white fs-3" />
                </div>
                <h2 className="text-center fw-display fw-bold mb-1" style={{ fontSize: '1.6rem' }}>Register Company</h2>
                <p className="text-center text-muted small mb-4">Start managing your workforce today</p>

                {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: '0.85rem', borderRadius: 10 }}>
                        <i className="bi bi-exclamation-circle-fill" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="wf-form-group">
                        <label className="wf-label">Company Name</label>
                        <div className="position-relative">
                            <i className="bi bi-building position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="wf-input" style={{ paddingLeft: '2.4rem' }}
                                name="companyName" type="text" placeholder="Acme Inc."
                                value={formData.companyName} onChange={handleChange} required autoFocus />
                        </div>
                    </div>

                    <hr className="my-4 opacity-10" />
                    <p className="text-muted small fw-bold mb-3">ADMIN ACCOUNT</p>

                    <div className="wf-form-group">
                        <label className="wf-label">Full Name</label>
                        <div className="position-relative">
                            <i className="bi bi-person position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="wf-input" style={{ paddingLeft: '2.4rem' }}
                                name="adminName" type="text" placeholder="John Doe"
                                value={formData.adminName} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="wf-form-group">
                        <label className="wf-label">Admin Email</label>
                        <div className="position-relative">
                            <i className="bi bi-envelope position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="wf-input" style={{ paddingLeft: '2.4rem' }}
                                name="adminEmail" type="email" placeholder="admin@company.com"
                                value={formData.adminEmail} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="wf-form-group">
                        <label className="wf-label">Password</label>
                        <div className="position-relative">
                            <i className="bi bi-lock position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="wf-input" style={{ paddingLeft: '2.4rem' }}
                                name="adminPassword" type="password" placeholder="••••••••"
                                value={formData.adminPassword} onChange={handleChange} required />
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="wf-btn wf-btn-primary w-100 justify-content-center py-2 mt-4" style={{ fontSize: '0.95rem' }}>
                        {loading ? <><span className="spinner-border spinner-border-sm me-2" />Creating account...</> : <><i className="bi bi-check-circle" />Register & Subscribe</>}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-muted small">Already registered? <Link to="/login" className="text-primary text-decoration-none fw-bold">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
};

export default CompanyRegisterPage;
