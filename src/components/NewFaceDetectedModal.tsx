import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  X,
  Scan,
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { validateUsername, validatePassword } from '../services/authService';
import { RegisteredPerson } from '../types';

interface NewFaceDetectedModalProps {
  isOpen: boolean;
  thumbnail: string;
  descriptors: number[][];
  onClose: () => void;
  onSuccess: (user: RegisteredPerson) => void;
}

export const NewFaceDetectedModal: React.FC<NewFaceDetectedModalProps> = ({
  isOpen,
  thumbnail,
  descriptors,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'credentials' | 'faceOnly'>('credentials');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerFaceChecked, setRegisterFaceChecked] = useState(true);

  // Face only name input
  const [faceOnlyName, setFaceOnlyName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Full Account Creation with Credentials + Face
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
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

    if (dbService.isUsernameTaken(cleanUsername)) {
      setError('Username already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await dbService.registerUserWithCredentials({
        username: cleanUsername,
        password: password,
        displayName: displayName.trim() || cleanUsername,
        thumbnail: registerFaceChecked ? thumbnail : '',
        descriptors: registerFaceChecked ? descriptors : [],
      });

      setIsSubmitting(false);
      onSuccess(newUser);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
      setIsSubmitting(false);
    }
  };

  // Handle Face-Only Registration (Case B)
  const handleFaceOnlySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = faceOnlyName.trim();
    if (!cleanName) {
      setError('Please enter a display name for this face.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = dbService.registerPerson(cleanName, thumbnail, descriptors);
      setIsSubmitting(false);
      onSuccess(newUser);
    } catch (err: any) {
      setError(err?.message || 'Failed to register face.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Scanned Face Thumbnail */}
        <div className="flex items-center space-x-4 mb-5">
          <div className="relative">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt="Scanned Face"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-500/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-cyan-400 flex items-center justify-center text-cyan-400">
                <Scan className="w-8 h-8" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 bg-cyan-500 text-slate-950 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              NEW FACE SCANNED!
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">
              Create an Account
            </h3>
            <p className="text-xs text-slate-400">
              This face is not in the database. Create an account for this person.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('credentials');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'credentials'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Username & Password (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('faceOnly');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'faceOnly'
                ? 'bg-slate-800 text-slate-100 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Face Only</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode 1: Credentials + Face Account Creation */}
        {mode === 'credentials' && (
          <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5">
            {/* Display Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Display Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Mithun"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Username */}
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Minimum 3 characters, unique.</p>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    placeholder="At least 6 chars"
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox: Register this face for facial login */}
            <div className="pt-1">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={registerFaceChecked}
                  onChange={(e) => setRegisterFaceChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Register this face for facial login
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isSubmitting ? (
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
          </form>
        )}

        {/* Mode 2: Face-Only Registration (Case B) */}
        {mode === 'faceOnly' && (
          <form onSubmit={handleFaceOnlySubmit} className="space-y-4">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400">
              Register this face without credentials. You will log in using camera facial recognition only.
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Full / Display Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={faceOnlyName}
                  onChange={(e) => {
                    setFaceOnlyName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Mithun"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  <span>Register Face Only</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
