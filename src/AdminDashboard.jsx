import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Lock,
  User,
  Loader2,
  TrendingUp,
  Mail,
  Phone,
  Upload
} from 'lucide-react';

const API_BASE =
  'https://dazzle2bliss-backend-production.up.railway.app/api';

const emptyProduct = {
  name: '',
  category: 'birthday',
  subCategory: '',
  price: '',
  originalPrice: '',
  discount: '',
  image: '',
  description: '',
  fullDescription: '',
  features: '',
  includes: '',
  setupTime: '',
  rating: 4.5,
  ratingCount: 0
};

export default function AdminDashboard() {
  // --------------------------------------------------
  // Persist login + current dashboard section
  // --------------------------------------------------

  const [token, setToken] = useState(() => {
    return localStorage.getItem('dazzle2bliss_admin_token');
  });

  const [view, setView] = useState(() => {
    return localStorage.getItem('dazzle2bliss_admin_view') || 'overview';
  });

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

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

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};

  // --------------------------------------------------
  // Persist token
  // --------------------------------------------------

  useEffect(() => {
    if (token) {
      localStorage.setItem('dazzle2bliss_admin_token', token);
    } else {
      localStorage.removeItem('dazzle2bliss_admin_token');
    }
  }, [token]);

  // --------------------------------------------------
  // Persist current dashboard section
  // --------------------------------------------------

  useEffect(() => {
    localStorage.setItem('dazzle2bliss_admin_view', view);
  }, [view]);

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.token);
    } catch (err) {
      setLoginError(err.message || 'Unable to reach server');
    } finally {
      setLoggingIn(false);
    }
  };

  // --------------------------------------------------
  // Image upload
  // --------------------------------------------------

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
        headers: authHeaders,
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setProductForm((p) => ({
        ...p,
        image: data.url
      }));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const handleLogout = () => {
    setToken(null);
    setStats(null);
    setProducts([]);
    setContacts([]);
    setView('overview');

    localStorage.removeItem('dazzle2bliss_admin_token');
    localStorage.removeItem('dazzle2bliss_admin_view');
  };

  // --------------------------------------------------
  // Load overview
  // --------------------------------------------------

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/stats`, {
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error('Failed to load stats');
      }

      setStats(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // --------------------------------------------------
  // Load products
  // --------------------------------------------------

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/products`);

      if (!res.ok) {
        throw new Error('Failed to load products');
      }

      const data = await res.json();

      setProducts(
        data.map((p) => ({
          ...p,
          id: p.id || p._id
        }))
      );
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Load contacts
  // --------------------------------------------------

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error('Failed to load messages');
      }

      setContacts(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // --------------------------------------------------
  // Load section data
  // --------------------------------------------------

  useEffect(() => {
    if (!token) return;

    if (view === 'overview') {
      loadOverview();
    }

    if (view === 'products') {
      loadProducts();
    }

    if (view === 'messages') {
      loadContacts();
    }
  }, [
    token,
    view,
    loadOverview,
    loadProducts,
    loadContacts
  ]);

  // --------------------------------------------------
  // Add product
  // --------------------------------------------------

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setShowProductModal(true);
  };

  // --------------------------------------------------
  // Edit product
  // --------------------------------------------------

  const openEditProduct = (p) => {
    setEditingProduct(p);

    setProductForm({
      ...p,
      features: Array.isArray(p.features)
        ? p.features.join('\n')
        : p.features || ''
    });

    setShowProductModal(true);
  };

  // --------------------------------------------------
  // Save product
  // --------------------------------------------------

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
        originalPrice: productForm.originalPrice
          ? parseFloat(productForm.originalPrice)
          : null,
        discount: productForm.discount
          ? parseInt(productForm.discount)
          : null,
        rating: parseFloat(productForm.rating) || 4.5,
        ratingCount: parseInt(productForm.ratingCount) || 0,
        features: productForm.features
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean)
      };

      const url = editingProduct
        ? `${API_BASE}/products/${editingProduct.id}`
        : `${API_BASE}/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(
          data.message || 'Failed to save product'
        );
      }

      setShowProductModal(false);

      loadProducts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  // --------------------------------------------------
  // Delete product
  // --------------------------------------------------

  const handleDeleteProduct = async (id) => {
    if (
      !window.confirm(
        'Delete this product? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      setProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare
    }
  ];

  // --------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>

            <h1 className="text-xl font-semibold text-slate-900">
              Dazzle2Bliss
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Admin dashboard sign in
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      username: e.target.value
                    }))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value
                    }))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-slate-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loggingIn && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {loggingIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop / Tablet Sidebar */}

      <aside className="hidden md:flex md:w-56 lg:w-60 bg-white border-r border-slate-200 flex-col shrink-0 md:min-h-screen">
        <div className="px-5 py-5 border-b border-slate-200">
          <p className="font-semibold text-slate-900 text-sm">
            Dazzle2Bliss
          </p>

          <p className="text-xs text-slate-500">
            Admin panel
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === item.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />

                {item.label}
              </button>
            );
          })}
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

      {/* Mobile Header */}

      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              Dazzle2Bliss
            </p>

            <p className="text-xs text-slate-500">
              Admin panel
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Navigation */}

        <nav className="px-3 pb-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    view === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />

                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8">
          {errorMsg && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 break-words">
              {errorMsg}
            </div>
          )}

          {/* --------------------------------------------------
              OVERVIEW
          -------------------------------------------------- */}

          {view === 'overview' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-5 sm:mb-6">
                Overview
              </h2>

              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                        <Package className="w-3.5 h-3.5" />

                        TOTAL PRODUCTS
                      </div>

                      <p className="text-2xl font-semibold text-slate-900">
                        {stats.totalProducts}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
                        <MessageSquare className="w-3.5 h-3.5" />

                        TOTAL INQUIRIES
                      </div>

                      <p className="text-2xl font-semibold text-slate-900">
                        {stats.totalContacts}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-slate-700 text-sm font-medium mb-4">
                      <TrendingUp className="w-4 h-4" />

                      Inquiries by celebration type
                    </div>

                    {stats.byCelebration &&
                    stats.byCelebration.length > 0 ? (
                      <div className="space-y-3">
                        {stats.byCelebration.map((row, i) => {
                          const count =
                            row.count ??
                            row.dataValues?.count ??
                            0;

                          const label =
                            row.celebration ??
                            row.dataValues?.celebration ??
                            row._id ??
                            'Unknown';

                          const max = Math.max(
                            ...stats.byCelebration.map(
                              (r) =>
                                r.count ??
                                r.dataValues?.count ??
                                0
                            ),
                            1
                          );

                          return (
                            <div key={i}>
                              <div className="flex justify-between gap-3 text-xs text-slate-600 mb-1">
                                <span className="capitalize truncate">
                                  {label}
                                </span>

                                <span className="shrink-0">
                                  {count}
                                </span>
                              </div>

                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-900 rounded-full transition-all"
                                  style={{
                                    width: `${
                                      (count / max) * 100
                                    }%`
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No inquiries yet.
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* --------------------------------------------------
              PRODUCTS
          -------------------------------------------------- */}

          {view === 'products' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Products
                </h2>

                <button
                  onClick={openAddProduct}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />

                  Add product
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />

                  Loading...
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs text-slate-500 font-medium">
                          <th className="px-4 py-3">
                            Product
                          </th>

                          <th className="px-4 py-3">
                            Category
                          </th>

                          <th className="px-4 py-3">
                            Price
                          </th>

                          <th className="px-4 py-3">
                            Rating
                          </th>

                          <th className="px-4 py-3 w-20">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-8 text-center text-slate-400"
                            >
                              No products yet.
                            </td>
                          </tr>
                        ) : (
                          products.map((p) => (
                            <tr
                              key={p.id}
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={p.image}
                                    alt=""
                                    className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                                  />

                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-900 line-clamp-1">
                                      {p.name}
                                    </p>

                                    <p className="text-xs text-slate-500 truncate">
                                      {p.subCategory}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-slate-600 capitalize">
                                {p.category}
                              </td>

                              <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">
                                ₹{p.price}
                              </td>

                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                {p.rating}★ ({p.ratingCount})
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() =>
                                      openEditProduct(p)
                                    }
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                    aria-label="Edit product"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleDeleteProduct(
                                        p.id
                                      )
                                    }
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                    aria-label="Delete product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------
              MESSAGES
          -------------------------------------------------- */}

          {view === 'messages' && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-5 sm:mb-6">
                Customer messages
              </h2>

              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />

                  Loading...
                </div>
              ) : contacts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                  No messages yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {c.name}
                          </p>

                          <p className="text-xs text-slate-500 capitalize break-words">
                            {c.celebration} ·{' '}
                            {c.source?.replace('_', ' ')}
                          </p>
                        </div>

                        <p className="text-xs text-slate-400 shrink-0">
                          {c.createdAt
                            ? new Date(
                                c.createdAt
                              ).toLocaleDateString()
                            : ''}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-x-4 sm:gap-y-1 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1 min-w-0 break-all">
                          <Mail className="w-3 h-3 shrink-0" />

                          {c.email}
                        </span>

                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />

                          {c.phone}
                        </span>
                      </div>

                      {c.message && (
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 mt-2 break-words">
                          {c.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --------------------------------------------------
          PRODUCT MODAL
      -------------------------------------------------- */}

      {showProductModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-slate-900">
                {editingProduct
                  ? 'Edit product'
                  : 'Add product'}
              </h3>

              <button
                onClick={() =>
                  setShowProductModal(false)
                }
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleProductSubmit}
              className="p-4 sm:p-5 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Product Name */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Product Name
                  </label>

                  <input
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        name: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g. Rose Gold Birthday Balloon Setup"
                  />
                </div>

                {/* Image */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Image URL
                  </label>

                  <input
                    required
                    value={productForm.image}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        image: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />

                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer w-fit">
                    <Upload className="w-3.5 h-3.5" />

                    <span>
                      {uploadingImage
                        ? 'Uploading...'
                        : 'Or upload an image instead'}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>

                  {productForm.image && (
                    <img
                      src={productForm.image}
                      alt="preview"
                      className="mt-2 w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                </div>

                {/* Category */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Category
                  </label>

                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        category: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="birthday">
                      Birthday
                    </option>

                    <option value="baby-shower">
                      Baby Shower
                    </option>

                    <option value="welcome-baby">
                      Welcome Baby
                    </option>

                    <option value="anniversary">
                      Anniversary
                    </option>

                    <option value="theme">Theme</option>
                  </select>
                </div>

                {/* Sub-category */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Sub-category
                  </label>

                  <input
                    value={productForm.subCategory}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        subCategory: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Price */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Price (₹)
                  </label>

                  <input
                    required
                    type="number"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        price: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Original Price */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Original price
                  </label>

                  <input
                    type="number"
                    value={productForm.originalPrice}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        originalPrice: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Short Description */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Short description
                  </label>

                  <input
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        description: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Full Description */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Full description
                  </label>

                  <textarea
                    rows={3}
                    value={productForm.fullDescription}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        fullDescription: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Features */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Features (one per line)
                  </label>

                  <textarea
                    rows={4}
                    value={productForm.features}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        features: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Includes */}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    What's included
                  </label>

                  <input
                    value={productForm.includes}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        includes: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Setup Time */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Setup time
                  </label>

                  <input
                    value={productForm.setupTime}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        setupTime: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                {/* Discount */}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Discount %
                  </label>

                  <input
                    type="number"
                    value={productForm.discount}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        discount: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Buttons */}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowProductModal(false)
                  }
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {savingProduct && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {editingProduct
                    ? 'Save changes'
                    : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}