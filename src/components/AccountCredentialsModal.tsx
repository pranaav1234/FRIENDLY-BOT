import React, { useState } from 'react';
import {
  X,
  Shield,
  KeyRound,
  User,
  CheckCircle2,
  AlertCircle,
  Scan,
  Lock,
} from 'lucide-react';
import { UserProfile, RegisteredPerson } from '../types';
import { dbService } from '../services/dbService';
import { validateUsername, validatePassword } from '../services/authService';

interface AccountCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserUpdated?: (updated: UserProfile) => void;
}

export const AccountCredentialsModal: React.FC<AccountCredentialsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  if (!isOpen || !currentUser) return null;

  const userRecord: RegisteredPerson | undefined = dbService.getPersonById(currentUser.id);
  const hasFaceAuth = !!(userRecord && userRecord.descriptors && userRecord.descriptors.length > 0);
  const hasCredentialAuth = !!(userRecord && userRecord.username && userRecord.passwordHash);

  const [username, setUsername] = useState(userRecord?.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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

    setIsSaving(true);
    try {
      const updated = await dbService.linkCredentialsToUser(
        currentUser.id,
        cleanUsername,
        password
      );

      setSuccess('Username & password credentials saved successfully!');
      setPassword('');
      setConfirmPassword('');
      setIsSaving(false);

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          username: updated.username,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save credentials.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Account & Security</h3>
            <p className="text-xs text-slate-400">
              Manage your login methods and credentials
            </p>
          </div>
        </div>

        {/* Account Details & Status Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-blue-400" />
                Facial Login
              </span>
              {hasFaceAuth ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 font-bold">
                  Not Set
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {hasFaceAuth ? 'Your face descriptors are registered.' : 'Scan face on login page to link.'}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                Password Login
              </span>
              {hasCredentialAuth ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  Missing
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {hasCredentialAuth ? `@${userRecord?.username}` : 'Add username & password below.'}
            </p>
          </div>
        </div>

        {/* User ID Info */}
        <div className="mb-6 p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs text-slate-400 flex items-center justify-between">
          <span className="text-slate-500">Account ID:</span>
          <span className="font-mono text-slate-300 select-all">{currentUser.id}</span>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {hasCredentialAuth ? 'Change Username' : 'Set Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. mithun"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {hasCredentialAuth ? 'New Password' : 'Set Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving Credentials...</span>
              </>
            ) : (
              <span>{hasCredentialAuth ? 'Update Credentials' : 'Save Credentials'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
