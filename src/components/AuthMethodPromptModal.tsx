import React, { useState } from 'react';
import {
  Scan,
  KeyRound,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { validateUsername, validatePassword } from '../services/authService';
import { RegisteredPerson } from '../types';

export type MissingAuthPromptType = 'missing_face' | 'missing_credentials';

interface AuthMethodPromptModalProps {
  isOpen: boolean;
  type: MissingAuthPromptType;
  currentUser: RegisteredPerson;
  onAddFacialLogin: () => void;
  onCredentialsSaved: (updatedUser: RegisteredPerson) => void;
  onNotNow: () => void;
}

export const AuthMethodPromptModal: React.FC<AuthMethodPromptModalProps> = ({
  isOpen,
  type,
  currentUser,
  onAddFacialLogin,
  onCredentialsSaved,
  onNotNow,
}) => {
  if (!isOpen) return null;

  // State for setting up credentials (Case B)
  const [isSettingUpCredentials, setIsSettingUpCredentials] = useState(false);
  const [username, setUsername] = useState(currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const usernameValidation = validateUsername(cleanUsername);
    if (usernameValidation) {
      setError(usernameValidation);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setError(passwordValidation);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (dbService.isUsernameTaken(cleanUsername, currentUser.id)) {
      setError('Username already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await dbService.linkCredentialsToUser(
        currentUser.id,
        cleanUsername,
        password
      );

      setSuccessMessage('Credentials saved successfully!');
      setTimeout(() => {
        onCredentialsSaved(updated);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to save credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-left">
        {/* Close / Dismiss */}
        <button
          onClick={onNotNow}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CASE A: User logged in with credentials, missing Face */}
        {type === 'missing_face' && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-2xl text-blue-400">
                <Scan className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Add Facial Login
                </h3>
                <span className="text-[11px] font-semibold text-blue-400">
                  Optional Security Upgrade
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your account does not have Facial Recognition configured. You can add your face to this account for faster login.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onAddFacialLogin}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Scan className="w-4 h-4" />
                <span>Add Facial Login</span>
              </button>

              <button
                type="button"
                onClick={onNotNow}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {/* CASE B: User logged in with Face, missing Credentials */}
        {type === 'missing_credentials' && !isSettingUpCredentials && (
          <div className="space-y-5">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Set Up Login Credentials
                </h3>
                <span className="text-[11px] font-semibold text-indigo-400">
                  Login Without Camera
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your account currently uses Facial Recognition. You can add a username and password so you can also log in without the camera.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSettingUpCredentials(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-4 h-4" />
                <span>Set Up Credentials</span>
              </button>

              <button
                type="button"
                onClick={onNotNow}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {/* CASE B (Active Form): Entering Username & Password */}
        {type === 'missing_credentials' && isSettingUpCredentials && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Set Up Credentials
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Link username & password to your account (<span className="text-indigo-300">{currentUser.name}</span>).
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. mithun123"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Minimum 3 characters, unique.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Credentials</span>
                )}
              </button>

              <button
                type="button"
                onClick={onNotNow}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
