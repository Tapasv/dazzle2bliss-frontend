import React, { useState, useRef, useEffect } from 'react';
import { Star, Phone, Mail, MapPin, Menu, X, Heart, MessageCircle, Search, ChevronDown, Package, Clock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';

const sendEmail = async (formData) => {
  try {
    await emailjs.send(
      'service_7g8ttma',
      'template_wv2qp3k',
      {
        to_email: formData.email,
        user_name: formData.name,
        user_phone: formData.phone,
        decoration_type: formData.decoration,
      },
      'EA6Y820QCQ1ZhR1Vx'
    );

    await emailjs.send(
      'service_7g8ttma',
      'template_npy5olb',
      {
        to_email: 'nakuls1993@gmail.com',
        user_name: formData.name,
        user_phone: formData.phone,
        decoration_type: formData.decoration,
        user_email: formData.email,
        user_message: formData.message || 'No message provided'
      },
      'EA6Y820QCQ1ZhR1Vx'
    );

    try {
      await fetch('https://dazzle2bliss-backend-production.up.railway.app/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          celebration: formData.decoration,
          message: formData.message || ''
        })
      });
    } catch (backendErr) {
      console.warn('Backend logging failed (email still sent):', backendErr);
    }
  } catch (err) {
    console.error('Error sending emails:', err);
    throw err;
  }
};

const categoryStyle = {
  'birthday': { badge: 'bg-rose-600', tag: 'text-rose-700', tint: 'bg-rose-50', ring: 'border-rose-200' },
  'baby-shower': { badge: 'bg-sky-600', tag: 'text-sky-700', tint: 'bg-sky-50', ring: 'border-sky-200' },
  'welcome-baby': { badge: 'bg-amber-600', tag: 'text-amber-700', tint: 'bg-amber-50', ring: 'border-amber-200' },
  'anniversary': { badge: 'bg-orange-700', tag: 'text-orange-800', tint: 'bg-orange-50', ring: 'border-orange-200' },
  'theme': { badge: 'bg-emerald-600', tag: 'text-emerald-700', tint: 'bg-emerald-50', ring: 'border-emerald-200' }
};
const styleFor = (cat) => categoryStyle[cat] || categoryStyle.birthday;

// How long the page-transition loader shows before the new view appears.
// Kept short on purpose — long enough to read as an intentional transition,
// short enough that navigating the site never feels sluggish.
const NAV_DELAY_MS = 550;

// ---------------- ROUTING HELPERS ----------------
// We keep React state (currentPage / selectedCategory / selectedProduct /
// searchQuery / fromViewMore) as the single source of truth, and mirror it
// into the URL hash so a refresh lands back on the same view. We use
// history.replaceState (not window.location.hash = ...) so this never adds
// extra browser-history entries and never fires a native hashchange event,
// which keeps this a one-way sync (state -> hash) with no risk of loops.
function parseRouteFromHash(hash) {
  const clean = (hash || '').replace(/^#\/?/, '');
  const [pathPart, queryPart] = clean.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryPart || '');

  if (segments[0] === 'product' && segments[1]) {
    return { page: 'product', productId: segments[1] };
  }
  if (segments[0] === 'category' && segments[1]) {
    return { page: 'home', category: segments[1] };
  }
  if (segments[0] === 'decorations') {
    return {
      page: 'decorations',
      search: params.get('search') || '',
      fromView: params.get('from') === 'view-more'
    };
  }
  if (segments[0] === 'about') return { page: 'about' };
  if (segments[0] === 'contact') return { page: 'contact' };
  return { page: 'home' };
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDecorDropdown, setShowDecorDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const savedScrollPosition = useRef(0);
  const [fromViewMore, setFromViewMore] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const navTimer = useRef(null);

  // Holds a product id read from the URL on load, until `products` has
  // finished fetching and we can resolve it to the actual product object.
  const [pendingProductId, setPendingProductId] = useState(null);

  const sortedProducts = [...products].sort((a, b) => b.rating - a.rating);
  const filteredProducts = sortedProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFavorite = (productId) => {
    setFavorites(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const API_BASE = 'https://dazzle2bliss-backend-production.up.railway.app/api';

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(data.map(p => ({ ...p, id: p.id || p._id })));
      } catch (err) {
        setProductsError('Could not load decorations right now. Please refresh.');
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, []);

  // ---------------- ROUTING: restore state from the URL on first load ----------------
  useEffect(() => {
    const route = parseRouteFromHash(window.location.hash);
    if (route.page === 'product') {
      setPendingProductId(route.productId);
      setCurrentPage('product');
    } else if (route.category) {
      setCurrentPage('home');
      setSelectedCategory(route.category);
    } else if (route.page === 'decorations') {
      setCurrentPage('decorations');
      setSearchQuery(route.search);
      setFromViewMore(route.fromView);
    } else {
      setCurrentPage(route.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once products have loaded, resolve a pending product id (from the URL)
  // into the actual product object so the detail page can render.
  useEffect(() => {
    if (!pendingProductId || products.length === 0) return;
    const found = products.find(p => String(p.id) === String(pendingProductId));
    if (found) {
      setSelectedProduct(found);
    } else {
      // Product no longer exists (or bad link) — fall back to home instead
      // of showing a blank page.
      setCurrentPage('home');
    }
    setPendingProductId(null);
  }, [pendingProductId, products]);

  // ---------------- ROUTING: keep the URL in sync with the current view ----------------
  useEffect(() => {
    let newHash = '';
    if (currentPage === 'product' && selectedProduct) {
      newHash = `/product/${selectedProduct.id}`;
    } else if (currentPage === 'home' && selectedCategory) {
      newHash = `/category/${selectedCategory}`;
    } else if (currentPage === 'decorations') {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (fromViewMore) params.set('from', 'view-more');
      const qs = params.toString();
      newHash = `/decorations${qs ? `?${qs}` : ''}`;
    } else if (currentPage === 'about') {
      newHash = '/about';
    } else if (currentPage === 'contact') {
      newHash = '/contact';
    }
    const target = newHash ? `#${newHash}` : window.location.pathname + window.location.search;
    if (window.location.hash !== (newHash ? `#${newHash}` : '')) {
      window.history.replaceState(null, '', target);
    }
  }, [currentPage, selectedCategory, selectedProduct, searchQuery, fromViewMore]);

  // Central navigation helper: shows the branded loading state, runs the
  // requested state change(s) after a short beat, then clears the loader.
  // Every button that changes what's on screen (page, category, product,
  // decoration filter) routes through this so the transition always looks
  // and feels the same across the whole site.
  const navigate = (action, delay = NAV_DELAY_MS) => {
    if (navTimer.current) clearTimeout(navTimer.current);
    setPageLoading(true);
    navTimer.current = setTimeout(() => {
      action();
      setPageLoading(false);
    }, delay);
  };

  const saveScrollAndOpenCategory = (category) => {
    navigate(() => {
      savedScrollPosition.current = window.scrollY;
      setSelectedCategory(category);
      scrollToTop();
    });
  };

  const closeCategoryAndRestore = () => {
    navigate(() => {
      setSelectedCategory('');
      setTimeout(() => window.scrollTo({ top: savedScrollPosition.current, behavior: 'smooth' }), 0);
    });
  };

  const handleViewMore = (category) => {
    navigate(() => {
      savedScrollPosition.current = window.scrollY;
      setFromViewMore(true);
      setCurrentPage('decorations');
      setSearchQuery(category);
      scrollToTop();
    });
  };

  const handleBackFromDecorations = () => {
    navigate(() => {
      setFromViewMore(false);
      setCurrentPage('home');
      setTimeout(() => window.scrollTo({ top: savedScrollPosition.current, behavior: 'smooth' }), 0);
    });
  };

  const goHome = () => navigate(() => { setCurrentPage('home'); setSelectedCategory(''); scrollToTop(); });
  const goAbout = () => navigate(() => { setCurrentPage('about'); scrollToTop(); });
  const goContact = () => navigate(() => { setCurrentPage('contact'); scrollToTop(); });
  const goAllDecorations = () => navigate(() => { setFromViewMore(false); setCurrentPage('decorations'); setSearchQuery(''); scrollToTop(); });
  const goDecorCategory = (value) => navigate(() => { setFromViewMore(false); setCurrentPage('decorations'); setSearchQuery(value); scrollToTop(); });
  const goDecorationsPage = () => navigate(() => { setCurrentPage('decorations'); scrollToTop(); });
  const openProduct = (product) => navigate(() => { setSelectedProduct(product); setCurrentPage('product'); scrollToTop(); });
  const goBackFromProduct = () => navigate(() => { setCurrentPage('home'); scrollToTop(); });

  const decorCategories = [
    { name: 'Birthday', value: 'birthday' },
    { name: 'Baby Shower', value: 'baby-shower' },
    { name: 'Anniversary', value: 'anniversary' },
    { name: 'Theme Decor', value: 'theme' }
  ];

  // ---------------- PAGE LOADER ----------------
  const PageLoader = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FFFBF5]/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-rose-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-rose-600 border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-rose-600 text-lg">D</span>
          </div>
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-400">Loading</p>
      </div>
    </div>
  );

  // ---------------- NAVBAR ----------------
  const Navbar = () => (
    <nav className="bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-orange-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="cursor-pointer flex items-center gap-2" onClick={goHome}>
            <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center">
              <span className="font-serif text-white text-lg">D</span>
            </div>
            <h1 className="font-serif text-2xl text-stone-900 tracking-wide">Dazzle<span className="text-rose-600">2</span>Bliss</h1>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={goHome} className="text-sm font-medium text-stone-700 hover:text-rose-600 transition-colors">Home</button>
            <div className="relative group">
              <button className="text-sm font-medium text-stone-700 hover:text-rose-600 transition-colors flex items-center gap-1">
                Decorations <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-xl border border-stone-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                <button onClick={goAllDecorations} className="block w-full text-left px-5 py-3 text-sm text-white font-semibold bg-rose-600 hover:bg-rose-700">All Decorations</button>
                {decorCategories.map(item => (
                  <button key={item.value} onClick={() => goDecorCategory(item.value)} className="flex items-center gap-2 w-full text-left px-5 py-3 text-sm text-stone-700 hover:bg-orange-50">
                    <span className={`w-2 h-2 rounded-full ${styleFor(item.value).badge}`}></span>
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={goAbout} className="text-sm font-medium text-stone-700 hover:text-rose-600 transition-colors">About</button>
            <button onClick={goContact} className="text-sm font-medium text-stone-700 hover:text-rose-600 transition-colors">Contact</button>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-full text-sm font-medium">
            <Phone className="w-4 h-4" />
            <span>8510011234</span>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-stone-700">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-stone-900/40 z-40 md:hidden" onClick={() => { setMobileMenuOpen(false); setShowDecorDropdown(false); }} />
          <div className="fixed top-20 left-0 right-0 bg-white border-t border-stone-200 z-50 md:hidden max-h-[calc(100vh-5rem)] overflow-y-auto shadow-xl">
            <div className="p-5 space-y-1">
              <button onClick={() => { setMobileMenuOpen(false); goHome(); }} className="block w-full text-left px-4 py-3 rounded-lg text-stone-800 font-medium hover:bg-orange-50">Home</button>
              <button onClick={() => setShowDecorDropdown(!showDecorDropdown)} className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-stone-800 font-medium hover:bg-orange-50">
                Decorations <ChevronDown className={`w-4 h-4 transition-transform ${showDecorDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDecorDropdown && (
                <div className="pl-6 space-y-1">
                  <button onClick={() => { setMobileMenuOpen(false); goAllDecorations(); }} className="block w-full text-left px-4 py-2 text-sm text-rose-600 font-semibold">All Decorations</button>
                  {decorCategories.map(item => (
                    <button key={item.value} onClick={() => { setMobileMenuOpen(false); goDecorCategory(item.value); }} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-stone-600">
                      <span className={`w-2 h-2 rounded-full ${styleFor(item.value).badge}`}></span>{item.name}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => { setMobileMenuOpen(false); goAbout(); }} className="block w-full text-left px-4 py-3 rounded-lg text-stone-800 font-medium hover:bg-orange-50">About</button>
              <button onClick={() => { setMobileMenuOpen(false); goContact(); }} className="block w-full text-left px-4 py-3 rounded-lg text-stone-800 font-medium hover:bg-orange-50">Contact</button>
              <a href="tel:8510011234" className="block text-center mt-4 py-3 rounded-lg bg-rose-600 text-white font-semibold">Call 8510011234</a>
            </div>
          </div>
        </>
      )}
    </nav>
  );

  // ---------------- HERO ----------------
  const HeroSection = () => {
    const [formData, setFormData] = useState({ celebration: '', name: '', phone: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (isSubmitting) return;
      if (!formData.celebration || !formData.name || !formData.phone) {
        alert('Please fill all fields');
        return;
      }
      setIsSubmitting(true);
      try {
        await sendEmail(formData);
        setShowToast(true);
        setFormData({ celebration: '', name: '', phone: '', email: '' });
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        alert('Failed to send. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="relative bg-gradient-to-b from-orange-50 via-rose-50 to-[#FFFBF5] overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-200/40 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-semibold tracking-wide mb-5">
                DELHI NCR'S DECOR SPECIALISTS
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-stone-900 leading-[1.1] mb-6">
                Every celebration, <span className="text-rose-600">beautifully</span> decorated.
              </h1>
              <p className="text-stone-600 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                Birthdays, baby showers, anniversaries and welcome-home moments — designed around your space, your story, your people.
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <button onClick={goContact} className="px-7 py-3.5 rounded-full bg-rose-600 text-white font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:-translate-y-0.5 transition-all">Enquire Now</button>
                <button onClick={goDecorationsPage} className="px-7 py-3.5 rounded-full border-2 border-stone-300 text-stone-800 font-semibold hover:border-rose-400 hover:text-rose-600 transition-colors">View Gallery</button>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="font-serif text-2xl text-rose-600">500+</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Happy Clients</p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-amber-600">1000+</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Events</p>
                </div>
                <div>
                  <p className="font-serif text-2xl text-emerald-600">4.8★</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Average Rating</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-100 shadow-xl shadow-orange-100/50 p-8 md:p-10">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mb-3">LIMITED OFFER</span>
              <h3 className="font-serif text-2xl text-stone-900 mb-6">Get ₹500 off your booking</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Celebration Type</label>
                  <select value={formData.celebration} onChange={(e) => setFormData(prev => ({ ...prev, celebration: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none bg-white text-stone-800">
                    <option value="">Select one</option>
                    <option value="birthday">Birthday</option>
                    <option value="baby-shower">Baby Shower</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="welcome-baby">Welcome Baby</option>
                    <option value="romantic">Romantic Setup</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Your Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Email Address</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-full bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                >
                  {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>) : 'Claim Offer'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-sm">
            <p className="text-sm font-semibold">Thank you — request received!</p>
            <p className="text-xs text-emerald-100 mt-1">We'll be in touch shortly.</p>
          </div>
        )}
      </div>
    );
  };

  // ---------------- CATEGORY BUTTONS ----------------
  const CategoryButtons = () => {
    const categories = [
      { name: 'Birthday', value: 'birthday', color: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
      { name: 'Baby Shower', value: 'baby-shower', color: 'bg-sky-600', light: 'bg-sky-50', text: 'text-sky-700' },
      { name: 'Welcome Baby', value: 'welcome-baby', color: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-700' },
      { name: 'Anniversary', value: 'anniversary', color: 'bg-orange-700', light: 'bg-orange-50', text: 'text-orange-800' }
    ];
    return (
      <div className="bg-[#FFFBF5] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <p className="text-center text-rose-600 text-xs font-semibold tracking-wide uppercase mb-2">Browse</p>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-900 text-center mb-10">Shop by occasion</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button key={cat.value} onClick={() => saveScrollAndOpenCategory(cat.value)} className={`${cat.light} rounded-2xl p-6 md:p-8 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-white group`}>
                <div className={`w-3 h-3 rounded-full ${cat.color} mx-auto mb-3 group-hover:scale-125 transition-transform`}></div>
                <p className={`font-serif text-lg ${cat.text}`}>{cat.name}</p>
                <p className="text-xs text-stone-400 mt-1 font-medium">View collection →</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---------------- PRODUCT CARD ----------------
  const ProductCard = ({ product }) => {
    const isFavorite = favorites.includes(product.id);
    const s = styleFor(product.category);
    return (
      <div className="group cursor-pointer">
        <div className="relative overflow-hidden rounded-2xl bg-stone-100 mb-4 shadow-sm group-hover:shadow-xl transition-shadow duration-300">
          {product.discount && (
            <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
              {product.discount}% OFF
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }} className="absolute top-3 right-3 bg-white/95 p-2 rounded-full shadow-sm z-10 hover:scale-110 transition-transform">
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-600 text-rose-600' : 'text-stone-400'}`} />
          </button>
          <img src={product.image} alt={product.name} className="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500" onClick={() => openProduct(product)} />
        </div>
        <div onClick={() => openProduct(product)}>
          <div className="flex items-center gap-1 mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
            ))}
            <span className="text-xs text-stone-400 ml-1">({product.ratingCount})</span>
          </div>
          <h3 className="font-serif text-lg text-stone-900 mb-1 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">{product.name}</h3>
          {product.subCategory && <p className={`text-xs font-semibold ${s.tag} mb-2`}>{product.subCategory}</p>}
          <div className="flex items-baseline gap-2">
            <span className="text-stone-900 font-bold">₹{product.price}</span>
            {product.originalPrice && <span className="text-stone-400 line-through text-sm">₹{product.originalPrice}</span>}
          </div>
        </div>
      </div>
    );
  };

  const ProductSection = ({ title, category, limit = 6, showViewMore = false, bg = 'bg-white' }) => {
    const filtered = category ? sortedProducts.filter(p => p.category === category).slice(0, limit) : sortedProducts.slice(0, limit);
    return (
      <div className={bg}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-serif text-3xl md:text-4xl text-stone-900">{title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {filtered.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
          {showViewMore && (
            <div className="mt-12 text-center">
              <button onClick={() => handleViewMore(category)} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700">
                View full collection <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------- SEARCH ----------------
  const SearchBar = () => {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    return (
      <div className="max-w-xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input type="text" placeholder="Search decorations..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(localSearch)} onBlur={() => setSearchQuery(localSearch)} className="w-full pl-11 pr-11 py-3.5 border-2 border-stone-200 rounded-full focus:border-rose-400 focus:outline-none text-sm bg-white" />
          {localSearch && (
            <button onClick={() => { setLocalSearch(''); setSearchQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchQuery && <p className="mt-3 text-center text-xs text-rose-600 font-semibold">{filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}</p>}
      </div>
    );
  };

  // ---------------- PRODUCT DETAILS ----------------
  const ProductDetails = () => {
    const [userRating, setUserRating] = useState(0);
    const relatedProducts = products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4);
    const s = styleFor(selectedProduct.category);

    const handleWhatsApp = () => {
      const message = `Hi! I'm interested in ${selectedProduct.name} (₹${selectedProduct.price})`;
      window.open(`https://wa.me/918510011234?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
      <div className="bg-[#FFFBF5] py-10 md:py-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <button onClick={goBackFromProduct} className="mb-8 text-sm font-medium text-stone-600 hover:text-rose-600 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>

          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full aspect-[4/5] object-cover bg-stone-100 rounded-2xl shadow-lg" />

            <div>
              <span className={`inline-block px-3 py-1 rounded-full ${s.tint} ${s.tag} text-xs font-semibold mb-3`}>{selectedProduct.subCategory}</span>
              <h1 className="font-serif text-3xl md:text-4xl text-stone-900 mb-4 leading-tight">{selectedProduct.name}</h1>
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(selectedProduct.rating) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
                ))}
                <span className="text-sm text-stone-500 ml-2">({selectedProduct.ratingCount} reviews)</span>
              </div>

              <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-stone-200">
                <span className="font-serif text-3xl text-stone-900">₹{selectedProduct.price}</span>
                {selectedProduct.originalPrice && (
                  <>
                    <span className="text-lg text-stone-400 line-through">₹{selectedProduct.originalPrice}</span>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Save {selectedProduct.discount}%</span>
                  </>
                )}
              </div>

              <p className="text-stone-600 leading-relaxed mb-8">{selectedProduct.description}</p>

              <button onClick={handleWhatsApp} className="w-full py-4 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mb-8 shadow-lg shadow-emerald-100">
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
              </button>

              <div className="pt-2">
                <p className="text-xs font-semibold text-stone-500 uppercase mb-3">Rate this design</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setUserRating(star)}>
                      <Star className={`w-6 h-6 ${star <= userRating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 md:mt-20 pt-12 border-t border-stone-200 max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-8">The details</h2>
            <p className="text-stone-600 leading-relaxed mb-10">{selectedProduct.fullDescription}</p>

            <div className="grid md:grid-cols-2 gap-10 mb-10">
              <div className="bg-rose-50 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-rose-700 uppercase mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Key Features
                </h3>
                <ul className="space-y-2.5">
                  {selectedProduct.features && selectedProduct.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-stone-700">
                      <span className="text-rose-500 mr-2 font-bold">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-6">
                <div className="bg-sky-50 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-sky-700 uppercase mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> What's Included
                  </h3>
                  <p className="text-sm text-stone-700 leading-relaxed">{selectedProduct.includes}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-amber-700 uppercase mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Setup Time
                  </h3>
                  <p className="text-sm text-stone-700 leading-relaxed">{selectedProduct.setupTime}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl p-6 md:p-8 border border-rose-100">
              <h3 className="font-serif text-xl text-stone-900 mb-3">Why clients choose us</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Every setup is handled by our own team from consultation through installation and takedown. We work with premium materials, keep to the timeline we agree with you, and take care of the details so the day feels effortless.
              </p>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-16 md:mt-20 pt-12 border-t border-stone-200">
              <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-10">You may also like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                {relatedProducts.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CategoryProducts = () => {
    const categoryProducts = sortedProducts.filter(p => p.category === selectedCategory);
    const categoryNames = {
      'birthday': 'Birthday Decorations',
      'baby-shower': 'Baby Shower Decorations',
      'welcome-baby': 'Welcome Baby Decorations',
      'anniversary': 'Anniversary Decorations'
    };
    return (
      <div className="bg-[#FFFBF5]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-serif text-3xl md:text-4xl text-stone-900">{categoryNames[selectedCategory]}</h2>
            <button onClick={closeCategoryAndRestore} className="text-sm font-medium text-stone-600 hover:text-rose-600 flex items-center gap-1.5">
              <X className="w-4 h-4" /> Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {categoryProducts.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </div>
    );
  };

  // ---------------- CONTACT FORM ----------------
  const ContactForm = () => {
    const [localFormData, setLocalFormData] = useState({ celebration: '', name: '', phone: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const MESSAGE_LIMIT = 800;

    const handleSubmit = async () => {
      if (isSubmitting) return;
      if (!localFormData.celebration || !localFormData.name || !localFormData.phone || !localFormData.email) {
        alert('Please fill all fields');
        return;
      }
      setIsSubmitting(true);
      try {
        await sendEmail({
          decoration: localFormData.celebration,
          name: localFormData.name,
          phone: localFormData.phone,
          email: localFormData.email,
          message: localFormData.message,
        });
        setShowToast(true);
        setLocalFormData({ celebration: '', name: '', phone: '', email: '', message: '' });
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        alert('Failed to send. Please try again.');
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="bg-white rounded-2xl border border-orange-100 shadow-lg p-8 md:p-10">
        <h3 className="font-serif text-2xl text-stone-900 mb-6">Send us a message</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Celebration Type</label>
            <select value={localFormData.celebration} onChange={(e) => setLocalFormData(prev => ({ ...prev, celebration: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none bg-white">
              <option value="">Select one</option>
              <option value="birthday">Birthday</option>
              <option value="baby-shower">Baby Shower</option>
              <option value="anniversary">Anniversary</option>
              <option value="welcome-baby">Welcome Baby</option>
              <option value="romantic">Romantic Setup</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Name</label>
            <input type="text" value={localFormData.name} onChange={(e) => setLocalFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Phone</label>
            <input type="tel" value={localFormData.phone} onChange={(e) => setLocalFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1.5">Email</label>
            <input type="email" value={localFormData.email} onChange={(e) => setLocalFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-500 uppercase">Message</label>
              <span className="text-xs text-stone-400">{localFormData.message.length}/{MESSAGE_LIMIT}</span>
            </div>
            <textarea
              value={localFormData.message}
              onChange={(e) => e.target.value.length <= MESSAGE_LIMIT && setLocalFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              maxLength={MESSAGE_LIMIT}
              placeholder="Tell us about your event, date, venue..."
              className="w-full px-3 py-2.5 text-sm border-2 border-stone-200 rounded-lg focus:border-rose-500 focus:outline-none resize-none"
            />
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3.5 rounded-full bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-rose-200">
            {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>) : 'Submit Inquiry'}
          </button>
        </div>
      </div>
    );
  };

  // ---------------- FOOTER ----------------
  const Footer = () => (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center">
                <span className="font-serif text-white text-sm">D</span>
              </div>
              <h3 className="font-serif text-xl text-white">Dazzle2Bliss</h3>
            </div>
            <p className="text-sm leading-relaxed text-stone-400">Considered decoration for birthdays, showers, anniversaries and welcome-home moments.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-amber-500 mb-4">Explore</h4>
            <div className="space-y-2 text-sm">
              <button onClick={goHome} className="block hover:text-rose-400 transition-colors">Home</button>
              <button onClick={goDecorationsPage} className="block hover:text-rose-400 transition-colors">Decorations</button>
              <button onClick={goAbout} className="block hover:text-rose-400 transition-colors">About</button>
              <button onClick={goContact} className="block hover:text-rose-400 transition-colors">Contact</button>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-amber-500 mb-4">Services</h4>
            <div className="space-y-2 text-sm text-stone-400">
              <p>Birthday Decorations</p>
              <p>Baby Shower</p>
              <p>Anniversary Setups</p>
              <p>Theme Decorations</p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wide uppercase text-amber-500 mb-4">Contact</h4>
            <div className="space-y-2.5 text-sm text-stone-400">
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-rose-400" /><span>8510011234</span></div>
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-rose-400" /><span className="break-all">nakuls1993@gmail.com</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-rose-400" /><span>Delhi NCR, India</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-12 pt-8 text-center text-xs text-stone-500">
          © 2025 Dazzle2Bliss. All rights reserved.
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-[#FFFBF5] font-sans">
      <style>{`
        .font-serif { font-family: Georgia, 'Times New Roman', serif; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {pageLoading && <PageLoader />}

      {productsLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      ) : productsError ? (
        <div className="text-center py-32 text-stone-500">{productsError}</div>
      ) : (
        <>
          <Navbar />
          {currentPage === 'home' && !selectedCategory && (
            <>
              <HeroSection />
              <ProductSection title="Top Selling" limit={6} bg="bg-white" />
              <CategoryButtons />
              <ProductSection title="Party Decoration" category="baby-shower" limit={3} showViewMore={true} bg="bg-white" />
              <ProductSection title="Theme Decoration" category="theme" limit={3} showViewMore={true} bg="bg-orange-50/50" />
            </>
          )}

          {currentPage === 'home' && selectedCategory && <CategoryProducts />}

          {currentPage === 'product' && selectedProduct && <ProductDetails />}

          {currentPage === 'decorations' && (
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
              {fromViewMore && (
                <button onClick={handleBackFromDecorations} className="mb-8 text-sm font-medium text-stone-600 hover:text-rose-600 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 rotate-180" /> Back
                </button>
              )}
              <p className="text-center text-rose-600 text-xs font-semibold tracking-wide uppercase mb-2">The full range</p>
              <h1 className="font-serif text-3xl md:text-5xl text-stone-900 mb-10 text-center">All Decorations</h1>
              <SearchBar />
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                  {filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-stone-500 mb-3">No decorations found matching "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery('')} className="text-sm font-semibold text-rose-600">Clear search</button>
                </div>
              )}
            </div>
          )}

          {currentPage === 'about' && (
            <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 md:py-20">
              <p className="text-center text-rose-600 text-xs font-semibold tracking-wide uppercase mb-2">Our story</p>
              <h1 className="font-serif text-3xl md:text-5xl text-stone-900 mb-10 text-center">About Dazzle2Bliss</h1>
              <div className="space-y-6 text-stone-600 leading-relaxed">
                <p>Dazzle2Bliss began with a simple idea — that celebration decor should feel personal, not off-the-shelf. Based in Delhi NCR, we work closely with each client to design settings that reflect the occasion and the people at the centre of it.</p>
                <p>From an intimate baby shower to a milestone anniversary, our team handles every part of the setup — consultation, design, installation, and takedown — so the day itself is easy.</p>
              </div>
              <div className="grid grid-cols-3 gap-6 mt-14 pt-10 border-t border-stone-200">
                <div className="text-center">
                  <p className="font-serif text-3xl text-rose-600">500+</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Happy Clients</p>
                </div>
                <div className="text-center">
                  <p className="font-serif text-3xl text-amber-600">1000+</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Events Decorated</p>
                </div>
                <div className="text-center">
                  <p className="font-serif text-3xl text-emerald-600">4.8</p>
                  <p className="text-xs text-stone-500 font-medium mt-1">Average Rating</p>
                </div>
              </div>
            </div>
          )}

          {currentPage === 'contact' && (
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16 md:py-20">
              <p className="text-center text-rose-600 text-xs font-semibold tracking-wide uppercase mb-2">Get in touch</p>
              <h1 className="font-serif text-3xl md:text-5xl text-stone-900 mb-12 text-center">Contact Us</h1>

              <div className="grid md:grid-cols-2 gap-12 md:gap-16">
                <div className="space-y-8">
                  <p className="text-stone-600 leading-relaxed">We'd love to hear about your celebration. Reach out and we'll get back to you within a day.</p>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Phone</p>
                        <p className="text-stone-800 font-medium">8510011234</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Email</p>
                        <p className="text-stone-800 font-medium break-all">nakuls1993@gmail.com</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Location</p>
                        <p className="text-stone-800 font-medium">Serving across Delhi NCR</p>
                      </div>
                    </div>
                  </div>
                </div>
                <ContactForm />
              </div>
            </div>
          )}
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;