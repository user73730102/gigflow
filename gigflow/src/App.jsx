import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import api from './api';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Briefcase, DollarSign, User, LogOut, Search, PlusCircle, 
  CheckCircle, XCircle, Loader2, ArrowRight, LayoutDashboard,
  Users
} from 'lucide-react';

// --- Helper UI Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type='button', disabled=false }) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
    danger: "bg-rose-500 hover:bg-rose-600 text-white",
    ghost: "bg-transparent hover:bg-indigo-50 text-indigo-600 shadow-none"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">{label}</label>}
    <input 
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-gray-50 focus:bg-white"
      {...props} 
    />
  </div>
);

// --- Navbar ---

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              GigFlow
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex flex-col text-right mr-2">
                  <span className="text-sm font-bold text-gray-800">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
                <Link to="/post-gig">
                  <Button variant="secondary" className="hidden sm:flex">
                    <PlusCircle size={18} /> Post Job
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut size={18} />
                </Button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login"><Button variant="ghost">Login</Button></Link>
                <Link to="/register"><Button variant="primary">Get Started</Button></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- Pages ---

const AuthPage = ({ type }) => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'register') {
        await api.post('/auth/register', form);
        toast.success("Account created! Please login.");
        navigate('/login');
      } else {
        await login(form.email, form.password);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{type === 'login' ? 'Welcome Back' : 'Join GigFlow'}</h2>
          <p className="text-gray-500 mt-2">
            {type === 'login' ? 'Enter your details to access your account' : 'Start bidding or hiring today'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'register' && (
            <Input label="Full Name" placeholder="John Doe" onChange={e => setForm({...form, name: e.target.value})} required />
          )}
          <Input label="Email Address" type="email" placeholder="you@example.com" onChange={e => setForm({...form, email: e.target.value})} required />
          <Input label="Password" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
          
          <Button type="submit" disabled={loading} className="w-full mt-4" variant="primary">
            {loading ? <Loader2 className="animate-spin" /> : type === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          {type === 'login' ? "Don't have an account? " : "Already have an account? "}
          <Link to={type === 'login' ? "/register" : "/login"} className="text-indigo-600 font-semibold hover:underline">
            {type === 'login' ? 'Sign Up' : 'Login'}
          </Link>
        </p>
      </div>
    </div>
  );
};

const GigFeed = () => {
  const [gigs, setGigs] = useState([]);
  const [appliedGigIds, setAppliedGigIds] = useState(new Set()); // Store IDs user has bid on
  const [search, setSearch] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Gigs
        const gigRes = await api.get(`/gigs?search=${search}`);
        setGigs(gigRes.data);

        // 2. If logged in, fetch IDs of gigs I've already applied to
        if (user) {
          const appliedRes = await api.get('/bids/my-bids');
          setAppliedGigIds(new Set(appliedRes.data)); // Convert array to Set for faster lookup
        }
      } catch (err) {
        console.error("Error fetching data");
      }
    };
    fetchData();
  }, [search, user]); // Re-run when user logs in/out or search changes

  // Helper to update state locally after a successful bid
  const markAsApplied = (gigId) => {
    setAppliedGigIds(prev => new Set(prev).add(gigId));
  };

  const isOwner = (gigOwnerId) => {
    if (!user) return false;
    const currentUserId = user._id || user.id; 
    return currentUserId === gigOwnerId;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Find your next opportunity</h1>
        <div className="max-w-2xl mx-auto relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" placeholder="Search for jobs..." 
            className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-200 shadow-sm focus:ring-4 focus:ring-indigo-100 outline-none text-lg"
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {gigs.map(gig => {
          const ownerIdString = gig.ownerId?._id || gig.ownerId;
          const userIsOwner = isOwner(ownerIdString);
          const hasApplied = appliedGigIds.has(gig._id); // Check if we bid on this one

          return (
            <div key={gig._id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{gig.title}</h3>
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mt-1">
                      <User size={12} /> {gig.ownerId?.name || 'Unknown'} • {new Date(gig.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-100">
                    ${gig.budget}
                  </span>
                </div>
                <p className="text-gray-600 mb-6 line-clamp-3">{gig.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 mt-auto">
                {userIsOwner ? (
                   <Link to={`/gig/${gig._id}/bids`}>
                      <Button variant="secondary" className="w-full">
                        <LayoutDashboard size={18} /> Manage Bids
                      </Button>
                   </Link>
                ) : (
                   <BidButton 
                      gig={gig} 
                      user={user} 
                      hasApplied={hasApplied} 
                      onSuccess={() => markAsApplied(gig._id)} 
                   />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {gigs.length === 0 && <p className="text-center text-gray-500 mt-10">No gigs found.</p>}
    </div>
  );
};

// Updated BidButton to handle "Applied" state
const BidButton = ({ gig, user, hasApplied, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ message: '', price: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bids', { gigId: gig._id, ...form });
      toast.success('Bid placed successfully!');
      setIsOpen(false);
      onSuccess(); // Update parent state instantly
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Error placing bid');
    }
  };

  // 1. If not logged in
  if (!user) return <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>Login to Apply</Button>;

  // 2. If ALREADY Applied (The feature you requested)
  if (hasApplied) return (
    <div className="w-full py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 font-bold flex justify-center items-center gap-2 cursor-default">
       <CheckCircle size={18} /> Applied
    </div>
  );

  // 3. Open Form State
  if (isOpen) return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in zoom-in duration-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea 
          placeholder="Cover Letter..." 
          className="w-full p-3 rounded-lg border text-sm outline-none focus:border-indigo-500"
          rows={2}
          onChange={e => setForm({...form, message: e.target.value})}
          required
        />
        <div className="flex gap-2">
          <input 
            type="number" placeholder="$" 
            className="w-1/2 p-2 rounded-lg border text-sm outline-none focus:border-indigo-500"
            onChange={e => setForm({...form, price: e.target.value})}
            required
          />
          <button className="flex-1 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Send</button>
          <button type="button" onClick={() => setIsOpen(false)} className="px-2 text-gray-400 hover:text-gray-600"><XCircle /></button>
        </div>
      </form>
    </div>
  );

  // 4. Default State
  return (
    <Button variant="primary" className="w-full" onClick={() => setIsOpen(true)}>
       Apply Now <ArrowRight size={16} />
    </Button>
  );
};

const PostGig = () => {
  const [form, setForm] = useState({ title: '', description: '', budget: '' });
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/gigs', form);
      toast.success('Job posted successfully!');
      navigate('/');
    } catch (error) { toast.error('Failed to post gig'); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full border border-gray-100">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">Post a New Gig</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Job Title" placeholder="e.g. Build a React App" onChange={e => setForm({...form, title: e.target.value})} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Description</label>
            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none bg-gray-50 focus:bg-white"
              rows={5} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>
          <Input label="Budget ($)" type="number" onChange={e => setForm({...form, budget: e.target.value})} required />
          <div className="flex gap-4">
             <Button type="submit" className="w-full">Post Job</Button>
             <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GigManage = () => {
  const [bids, setBids] = useState([]);
  const [gig, setGig] = useState(null);
  const { id } = useParams();
  
  useEffect(() => {
    // Fetch bids
    api.get(`/bids/${id}`).then(res => setBids(res.data)).catch(err => toast.error('Error fetching bids'));
    // Fetch Gig details just for the title
    api.get(`/gigs`).then(res => {
      const found = res.data.find(g => g._id === id);
      setGig(found);
    });
  }, [id]);

  const handleHire = async (bidId) => {
    if(!window.confirm("Confirm hiring this freelancer?")) return;
    try {
      await api.patch(`/bids/${bidId}/hire`);
      toast.success("Hired Successfully!");
      // Reload bids
      const res = await api.get(`/bids/${id}`);
      setBids(res.data);
    } catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="text-gray-500 hover:text-indigo-600 mb-4 inline-flex items-center gap-1">
          <ArrowRight className="rotate-180" size={16}/> Back to Feed
        </Link>
        <h2 className="text-3xl font-bold text-gray-900 mt-2">Manage Applicants</h2>
        {gig && <p className="text-gray-500">For: <span className="font-semibold">{gig.title}</span></p>}
      </div>
      
      {bids.length === 0 ? (
         <div className="bg-white rounded-2xl p-16 text-center border border-gray-200 border-dashed">
            <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-500">No bids yet.</h3>
            <p className="text-gray-400">Wait for freelancers to find your gig.</p>
         </div>
      ) : (
        <div className="grid gap-4">
          {bids.map(bid => (
            <div key={bid._id} className={`bg-white p-6 rounded-2xl border transition-all ${
              bid.status === 'hired' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-indigo-200'
            }`}>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">{bid.freelancerId?.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        bid.status === 'hired' ? 'bg-green-200 text-green-800' :
                        bid.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{bid.status}</span>
                   </div>
                   <p className="text-gray-600 italic mb-2">"{bid.message}"</p>
                   <p className="text-indigo-600 font-bold flex items-center gap-1"><DollarSign size={16}/> Bid: ${bid.price}</p>
                </div>
                {bid.status === 'pending' && (
                  <Button onClick={() => handleHire(bid._id)} className="self-start">
                    <CheckCircle size={18} /> Hire
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
          <Navbar />
          <Toaster position="top-center" toastOptions={{ style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
          <Routes>
            <Route path="/" element={<GigFeed />} />
            <Route path="/login" element={<AuthPage type="login" />} />
            <Route path="/register" element={<AuthPage type="register" />} />
            <Route path="/post-gig" element={<PostGig />} />
            <Route path="/gig/:id/bids" element={<GigManage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;