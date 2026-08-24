import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Package, MessageSquare, LogOut, Plus, Pencil, Trash2, X, Lock, User, Loader2, TrendingUp, Mail, Phone, Upload } from 'lucide-react';

const API_BASE = 'https://dazzle2bliss-backend-production.up.railway.app/api';

const emptyProduct = {
  name: '', category: 'birthday', subCategory: '', price: '', originalPrice: '',
  discount: '', image: '', description: '', fullDescription: '',
  features: '', includes: '', setupTime: '', rating: 4.5, ratingCount: 0
};

export default function AdminDashboard() {
  const [token, setToken] = useState(null);
  const [view, setView] = useState('overview');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [savingProduct, setSavingProduct] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setToken(data.token);
    } catch (err) {
      setLoginError(err.message || 'Unable to reach server');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/products/upload-image`, {
        method: 'POST',
        headers: authHeaders, // don't set Content-Type manually — the browser sets the multipart boundary
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setProductForm(p => ({ ...p, image: data.url }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setStats(null);
    setProducts([]);
    setContacts([]);
    setView('overview');
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.map(p => ({ ...p, id: p.id || p._id })));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/contact`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to load messages');
      setContacts(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (view === 'overview') loadOverview();
    if (view === 'products') loadProducts();
    if (view === 'messages') loadContacts();
  }, [token, view, loadOverview, loadProducts, loadContacts]);

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      ...p,
      features: Array.isArray(p.features) ? p.features.join('\n') : (p.features || '')
    });
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    setErrorMsg('');
    try {
      if (!productForm.name || !productForm.name.trim()) {
        throw new Error('Product name is required');
      }
      const payload = {
        ...productForm,
        name: productForm.name.trim(),
        price: parseFloat(productForm.price) || 0,
        originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : null,
        discount: productForm.discount ? parseInt(productForm.discount) : null,
        rating: parseFloat(productForm.rating) || 4.5,
        ratingCount: parseInt(productForm.ratingCount) || 0,
        features: productForm.features.split('\n').map(f => f.trim()).filter(Boolean)
      };
      const url = editingProduct ? `${API_BASE}/products/${editingProduct.id}` : `${API_BASE}/products`;
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save product');
      }
      setShowProductModal(false);
      loadProducts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error('Failed to delete');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // ---------- LOGIN SCREEN ----------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Dazzle2Bliss</h1>
            <p className="text-sm text-slate-500 mt-1">Admin dashboard sign in</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">Dazzle2Bliss</p>
          <p className="text-xs text-slate-500">Admin panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {errorMsg && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {errorMsg}
            </div>
          )}

          {view === 'overview' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Overview</h2>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                        <Package className="w-3.5 h-3.5" /> TOTAL PRODUCTS
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.totalProducts}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                        <MessageSquare className="w-3.5 h-3.5" /> TOTAL INQUIRIES
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">{stats.totalContacts}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-slate-700 text-sm font-medium mb-4">
                      <TrendingUp className="w-4 h-4" /> Inquiries by celebration type
                    </div>
                    {stats.byCelebration && stats.byCelebration.length > 0 ? (
                      <div className="space-y-3">
                        {stats.byCelebration.map((row, i) => {
                          const count = row.count ?? row.dataValues?.count ?? 0;
                          const label = row.celebration ?? row.dataValues?.celebration ?? row._id ?? 'Unknown';
                          const max = Math.max(...stats.byCelebration.map(r => r.count ?? r.dataValues?.count ?? 0), 1);
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs text-slate-600 mb-1">
                                <span className="capitalize">{label}</span>
                                <span>{count}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No inquiries yet.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {view === 'products' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Products</h2>
                <button
                  onClick={openAddProduct}
                  className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add product
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500 font-medium">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Rating</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No products yet.</td></tr>
                      ) : products.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100" />
                              <div>
                                <p className="font-medium text-slate-900 line-clamp-1">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.subCategory}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 capitalize">{p.category}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">₹{p.price}</td>
                          <td className="px-4 py-3 text-slate-600">{p.rating}★ ({p.ratingCount})</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditProduct(p)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {view === 'messages' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Customer messages</h2>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : contacts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">No messages yet.</div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(c => (
                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{c.celebration} · {c.source?.replace('_', ' ')}</p>
                        </div>
                        <p className="text-xs text-slate-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                      </div>
                      {c.message && (
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 mt-2">{c.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setShowProductModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">{editingProduct ? 'Edit product' : 'Add product'}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Product Name</label>
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="e.g. Rose Gold Birthday Balloon Setup"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image URL</label>
                  <input required value={productForm.image} onChange={(e) => setProductForm(p => ({ ...p, image: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2" />
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer w-fit">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Or upload an image instead'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  {productForm.image && (
                    <img src={productForm.image} alt="preview" className="mt-2 w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={productForm.category} onChange={(e) => setProductForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="birthday">Birthday</option>
                    <option value="baby-shower">Baby Shower</option>
                    <option value="welcome-baby">Welcome Baby</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="theme">Theme</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sub-category</label>
                  <input value={productForm.subCategory} onChange={(e) => setProductForm(p => ({ ...p, subCategory: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Price (₹)</label>
                  <input required type="number" value={productForm.price} onChange={(e) => setProductForm(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Original price</label>
                  <input type="number" value={productForm.originalPrice} onChange={(e) => setProductForm(p => ({ ...p, originalPrice: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Short description</label>
                  <input value={productForm.description} onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full description</label>
                  <textarea rows={2} value={productForm.fullDescription} onChange={(e) => setProductForm(p => ({ ...p, fullDescription: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Features (one per line)</label>
                  <textarea rows={3} value={productForm.features} onChange={(e) => setProductForm(p => ({ ...p, features: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">What's included</label>
                  <input value={productForm.includes} onChange={(e) => setProductForm(p => ({ ...p, includes: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Setup time</label>
                  <input value={productForm.setupTime} onChange={(e) => setProductForm(p => ({ ...p, setupTime: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                  <input type="number" value={productForm.discount} onChange={(e) => setProductForm(p => ({ ...p, discount: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingProduct} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2">
                  {savingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProduct ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}