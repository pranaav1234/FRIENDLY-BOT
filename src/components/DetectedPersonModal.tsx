import React from 'react';
import { UserCheck, UserX, X, ShieldAlert, CheckCircle2, UserPlus, Sparkles, ShieldCheck } from 'lucide-react';

interface DetectedPersonModalProps {
  isOpen: boolean;
  personName: string;
  isUnknown: boolean;
  thumbnail?: string;
  confidenceScore?: number;
  onClose: () => void;
  onRegisterNow?: () => void;
  onLoginUser?: () => void;
}

export const DetectedPersonModal: React.FC<DetectedPersonModalProps> = ({
  isOpen,
  personName,
  isUnknown,
  thumbnail,
  confidenceScore = isUnknown ? 34.2 : 96.8,
  onClose,
  onRegisterNow,
  onLoginUser,
}) => {
  if (!isOpen) return null;

  const displayConfidence = confidenceScore ? confidenceScore.toFixed(1) : (isUnknown ? '34.2' : '96.8');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl border ${
            isUnknown
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-rose-500/10'
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 animate-pulse'
          }`}
        >
          {isUnknown ? (
            <ShieldAlert className="w-8 h-8" />
          ) : (
            <ShieldCheck className="w-9 h-9" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-extrabold text-slate-100 mb-1 flex items-center gap-1.5">
          <span>{isUnknown ? 'Unknown Person' : 'Face Matched Successfully'}</span>
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {isUnknown
            ? 'Subject is not registered in the database.'
            : 'Biometric feature vectors matched registered face with high confidence.'}
        </p>

        {/* Person Card */}
        <div
          className={`w-full rounded-2xl p-4 flex items-center space-x-3 mb-5 text-left border shadow-lg ${
            isUnknown
              ? 'bg-rose-950/30 border-rose-800/50'
              : 'bg-emerald-950/30 border-emerald-800/50'
          }`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={personName}
              className="w-14 h-14 rounded-xl object-cover border-2 border-slate-600/80 shrink-0 shadow-md"
            />
          ) : (
            <div
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg shrink-0 ${
                isUnknown
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400'
                  : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {isUnknown ? <UserX className="w-7 h-7" /> : personName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isUnknown ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isUnknown ? 'Unregistered' : 'Verified Profile'}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-100 truncate">
              Name: {isUnknown ? 'Unknown Person' : personName}
            </h4>
            <p className="text-xs font-mono font-bold mt-1 text-slate-300 flex items-center gap-1">
              <span>Match Confidence:</span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-extrabold border ${
                isUnknown
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {displayConfidence}%
              </span>
            </p>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {!isUnknown && onLoginUser && (
            <button
              onClick={onLoginUser}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Log In as {personName}</span>
            </button>
          )}

          {isUnknown && onRegisterNow && (
            <button
              onClick={onRegisterNow}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register This Person Now</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isUnknown
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isUnknown ? 'Dismiss' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};


