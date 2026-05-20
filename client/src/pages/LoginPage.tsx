import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex border-2 border-[#121212] shadow-[8px_8px_0px_0px_#121212]">

        {/* Left: Blue decorative panel */}
        <div className="hidden md:flex w-1/2 bg-[#1040C0] flex-col items-center justify-center p-10 relative overflow-hidden">
          <div className="absolute top-6 left-6 w-16 h-16 bg-[#F0C020] border-2 border-[#121212] rotate-12" />
          <div className="absolute bottom-10 right-6 w-20 h-20 rounded-full bg-[#D02020] border-2 border-[#121212] opacity-80" />
          <div className="absolute top-1/2 right-8 w-10 h-10 bg-white border-2 border-[#121212] -rotate-12" />

          <div className="relative z-10 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute top-0 left-0 w-9 h-9 bg-[#D02020] border-4 border-white" />
              <div className="absolute bottom-0 left-0 w-9 h-9 rounded-full bg-[#F0C020] border-4 border-white" />
              <div className="absolute top-1 right-0 w-9 h-9 bg-white border-4 border-white rotate-45" />
            </div>
            <h1 className="font-black text-4xl uppercase tracking-tight text-white mb-3">VeWork</h1>
            <p className="text-white/80 font-medium text-base leading-relaxed">
              Keep your team moving.<br />Track every hour, every project.
            </p>
          </div>
        </div>

        {/* Right: Login form */}
        <div className="flex-1 bg-white p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-block bg-[#F0C020] border-2 border-[#121212] px-3 py-1 mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-[#121212]">Sign In</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#121212]">Welcome back</h2>
            <p className="text-[#121212]/50 font-medium mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-[#D02020] border-2 border-[#121212] text-white text-sm font-bold px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#121212] mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F0F0F0] border-2 border-[#121212] px-4 py-3 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[#121212] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F0F0F0] border-2 border-[#121212] px-4 py-3 text-sm font-medium text-[#121212] placeholder:text-[#121212]/30 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#1040C0] transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1040C0] text-white border-2 border-[#121212] shadow-[4px_4px_0px_0px_#121212] px-6 py-3 text-sm font-black uppercase tracking-wider hover:bg-[#1040C0]/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="text-xs text-[#121212]/40 font-medium mt-6 border-t-2 border-[#E0E0E0] pt-4">
            Demo: alice@worktrack.dev · password123
          </p>
        </div>
      </div>
    </div>
  );
}
