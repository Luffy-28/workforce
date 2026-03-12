import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../store/slices/authSlice';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector(s => s.auth);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);
  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (!result.error) navigate('/dashboard');
  };

  return (
    <div className="wf-login-bg">
      <div className="wf-login-card">
        <div className="wf-login-logo">
          <i className="bi bi-shield-check text-white fs-3" />
        </div>
        <h2 className="text-center fw-display fw-bold mb-1" style={{ fontSize: '1.6rem' }}>WorkForce Pro</h2>
        <p className="text-center text-muted small mb-4">Sign in to your workspace</p>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3" style={{ fontSize: '0.85rem', borderRadius: 10 }}>
            <i className="bi bi-exclamation-circle-fill" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="wf-form-group">
            <label className="wf-label">Email or Phone Number</label>
            <div className="position-relative">
              <i className="bi bi-person position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="wf-input" style={{ paddingLeft: '2.4rem' }} type="text" placeholder="you@company.com or 04xxxxxxxx"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
          </div>

          <div className="wf-form-group">
            <label className="wf-label">Password</label>
            <div className="position-relative">
              <i className="bi bi-lock position-absolute" style={{ left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="wf-input" style={{ paddingLeft: '2.4rem', paddingRight: '2.8rem' }}
                type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="btn btn-link position-absolute p-0" style={{ right: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                onClick={() => setShowPass(p => !p)}>
                <i className={`bi bi-eye${showPass ? '-slash' : ''}`} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="wf-btn wf-btn-primary w-100 justify-content-center py-2 mt-2" style={{ fontSize: '0.95rem' }}>
            {loading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in...</> : <><i className="bi bi-arrow-right-circle" />Sign In</>}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-muted small">Need a company workspace? <Link to="/register-company" className="text-primary text-decoration-none fw-bold">Register Now</Link></p>
        </div>
      </div>
    </div>

  );
};

export default LoginPage;
