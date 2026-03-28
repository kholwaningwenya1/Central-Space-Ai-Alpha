import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile } from '../firebase';
import { toast } from 'sonner';

interface MobileLoginProps {
  onLogin: () => void;
}

export function MobileLogin({ onLogin }: MobileLoginProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      await sendEmailVerification(userCredential.user);
      await auth.signOut(); // Sign out immediately so they have to log in again
      toast.success('Account created! Please check your email for the verification link before logging in.');
      setMode('login');
      setPassword('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        toast.error('Please verify your email address first. Check your inbox for the verification link.');
        setIsLoading(false);
        return;
      }
      // If verified, App.tsx will pick up the auth state change automatically
    } catch (error: any) {
      console.error(error);
      toast.error('Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-end md:justify-center h-screen w-full overflow-hidden bg-zinc-950">
      {/* Background Image - User should replace this URL with their uploaded image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-zinc-900"
        style={{ 
          backgroundImage: 'url("/bg.png")', // Upload your image to the 'public' folder and name it 'bg.png'
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/20 md:bg-zinc-950/60" />

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-20 w-full max-w-md px-8 pb-12 md:pb-0 flex flex-col items-center text-center"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20 shadow-2xl overflow-hidden"
        >
          <img src="/logo.png" alt="Central Space Logo" className="w-full h-full object-cover" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight font-display">
          Central Space
        </h1>
        <p className="text-zinc-400 mb-8 text-sm font-medium max-w-xs">
          {mode === 'login' ? 'Welcome back. Log in to continue.' : 'Create an account to get started.'}
        </p>

        <div className="w-full max-w-sm flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleEmailLogin}
                className="flex flex-col gap-3"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-md"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-md"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-cyan-500 text-zinc-950 rounded-2xl font-bold text-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                </button>
                <p className="text-zinc-400 text-sm mt-2">
                  Don't have an account? <button type="button" onClick={() => setMode('signup')} className="text-cyan-400 font-semibold hover:underline">Sign up</button>
                </p>
              </motion.form>
            ) : (
              <motion.form 
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignup}
                className="flex flex-col gap-3"
              >
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-md"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="email" 
                    placeholder="Email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-md"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input 
                    type="password" 
                    placeholder="Create Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all backdrop-blur-md"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-cyan-500 text-zinc-950 rounded-2xl font-bold text-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                </button>
                <p className="text-zinc-400 text-sm mt-2">
                  Already have an account? <button type="button" onClick={() => setMode('login')} className="text-cyan-400 font-semibold hover:underline">Log in</button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs uppercase tracking-wider font-semibold">Or</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <button 
            onClick={onLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-zinc-950 rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-all active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}
