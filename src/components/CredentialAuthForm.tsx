import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Scan,
  Check,
  Trash2,
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { validateUsername, validatePassword } from '../services/authService';
import { RegisteredPerson } from '../types';
import { SignupFaceScanModal } from './SignupFaceScanModal';

interface CredentialAuthFormProps {
  onSuccessLogin: (user: RegisteredPerson, isNewSignup?: boolean) => void;
  onGoToFacialMode?: () => void;
  initialMode?: 'signin' | 'signup';
}

export const CredentialAuthForm: React.FC<CredentialAuthFormProps> = ({
  onSuccessLogin,
  initialMode = 'signin',
}) => {
  const [view, setView] = useState<'signin' | 'signup' | 'success'>(initialMode);

  // Sign In State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sign Up State
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Face Scan State for Create Account
  const [isFaceScanModalOpen, setIsFaceScanModalOpen] = useState(false);
  const [scannedFaceData, setScannedFaceData] = useState<{
    thumbnail: string;
    descriptors: number[][];
  } | null>(null);

  // Newly created user state (for Success view)
  const [createdUser, setCreatedUser] = useState<RegisteredPerson | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUsername = loginUsername.trim();
    if (!cleanUsername) {
      setLoginError('Invalid username or password.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Invalid username or password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await dbService.authenticateWithCredentials(cleanUsername, loginPassword);
      if (!result.success || !result.user) {
        setLoginError('Invalid username or password.');
        setIsLoggingIn(false);
        return;
      }

      onSuccessLogin(result.user, false);
    } catch {
      setLoginError('Invalid username or password.');
      setIsLoggingIn(false);
    }
  };

  // Handle Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    const cleanUsername = signupUsername.trim();
    const usernameValidation = validateUsername(cleanUsername);
    if (usernameValidation) {
      setSignupError(usernameValidation);
      return;
    }

    const passwordValidation = validatePassword(signupPassword);
    if (passwordValidation) {
      setSignupError(passwordValidation);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    if (dbService.isUsernameTaken(cleanUsername)) {
      setSignupError('Username already exists.');
      return;
    }

    setIsSigningUp(true);
    try {
      const newUser = await dbService.registerUserWithCredentials({
        username: cleanUsername,
        password: signupPassword,
        displayName: signupDisplayName.trim() || cleanUsername,
        thumbnail: scannedFaceData ? scannedFaceData.thumbnail : '',
        descriptors: scannedFaceData ? scannedFaceData.descriptors : [],
      });

      setIsSigningUp(false);
      setCreatedUser(newUser);
      setView('success');
    } catch (err: any) {
      setSignupError(err?.message || 'Failed to create account.');
      setIsSigningUp(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-fade-in text-left">
      {/* 1. SIGN IN VIEW */}
      {view === 'signin' && (
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
              CREDENTIAL LOGIN
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1.5">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Enter your username and password to log in.
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="Enter username"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                title={showLoginPassword ? 'Hide password' : 'Show password'}
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Switch to Create Account */}
          <div className="pt-2 text-center border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('signup');
                  setSignupError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer ml-1"
              >
                Create Account
              </button>
            </p>
          </div>
        </form>
      )}

      {/* 2. CREATE ACCOUNT VIEW */}
      {view === 'signup' && (
        <form onSubmit={handleSignupSubmit} className="space-y-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
              CHATBOT
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mt-1.5">
              Create Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Create credentials to permanently save your private Chatbot settings.
            </p>
          </div>

          {/* Error Message */}
          {signupError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
              <span>{signupError}</span>
            </div>
          )}

          {/* Optional Display Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Display Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Sparkles className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={signupDisplayName}
                onChange={(e) => setSignupDisplayName(e.target.value)}
                placeholder="e.g. Mithun"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Username <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => {
                  setSignupUsername(e.target.value);
                  if (signupError) setSignupError(null);
                }}
                placeholder="e.g. mithun123"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">Minimum 3 characters, unique.</p>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showSignupPassword ? 'text' : 'password'}
                value={signupPassword}
                onChange={(e) => {
                  setSignupPassword(e.target.value);
                  if (signupError) setSignupError(null);
                }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Confirm Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showSignupPassword ? 'text' : 'password'}
                value={signupConfirmPassword}
                onChange={(e) => {
                  setSignupConfirmPassword(e.target.value);
                  if (signupError) setSignupError(null);
                }}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Facial Recognition Section on the SAME page (Requirement 5) */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Scan className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Facial Recognition
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  Optional
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Optionally scan your face so you can also log in using Facial Recognition.
              </p>

              {/* Status and Action */}
              <div className="flex items-center justify-between pt-1">
                {scannedFaceData ? (
                  <div className="flex items-center space-x-3">
                    <img
                      src={scannedFaceData.thumbnail}
                      alt="Registered Face"
                      className="w-10 h-10 rounded-xl object-cover border border-emerald-400"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Face Registered ✓</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Ready to save</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Status: <span className="text-slate-300 font-semibold">No face registered</span>
                  </div>
                )}

                {scannedFaceData ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsFaceScanModalOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
                    >
                      Re-scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setScannedFaceData(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-800 transition-colors"
                      title="Remove face"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsFaceScanModalOpen(true)}
                    className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan Face</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Explanatory notes */}
          <div className="text-[11px] text-slate-400 space-y-0.5 px-1">
            <p>• You can use Facial Recognition or Username & Password to log in.</p>
            <p>• Facial Recognition is optional.</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSigningUp}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSigningUp ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>

          {/* Switch to Sign In */}
          <div className="pt-2 text-center border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('signin');
                  setLoginError(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer ml-1"
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      )}

      {/* 3. SUCCESS VIEW (Requirement 13) */}
      {view === 'success' && createdUser && (
        <div className="space-y-6 text-center animate-fadeIn py-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Account Created Successfully
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Welcome, <span className="text-slate-200 font-semibold">{createdUser.name}</span>!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              You can now sign in using:
            </span>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-emerald-400 font-semibold">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Username & Password</span>
            </div>
            {createdUser.descriptors && createdUser.descriptors.length > 0 && (
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-emerald-400 font-semibold">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Facial Recognition</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSuccessLogin(createdUser, true)}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all cursor-pointer active:scale-95"
          >
            Continue to Home
          </button>
        </div>
      )}

      {/* Embedded Face Scan Modal for Create Account */}
      <SignupFaceScanModal
        isOpen={isFaceScanModalOpen}
        onClose={() => setIsFaceScanModalOpen(false)}
        onFaceCaptured={(data) => {
          setScannedFaceData(data);
          setIsFaceScanModalOpen(false);
        }}
      />
    </div>
  );
};
