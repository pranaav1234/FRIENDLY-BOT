import React from 'react';
import { UserCheck, AlertTriangle, X } from 'lucide-react';

interface AlreadyRegisteredModalProps {
  isOpen: boolean;
  personName: string;
  thumbnail?: string;
  onClose: () => void;
  onLogin?: () => void;
}

export const AlreadyRegisteredModal: React.FC<AlreadyRegisteredModalProps> = ({
  isOpen,
  personName,
  thumbnail,
  onClose,
  onLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          Person Already Registered
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-5">
          This person is already registered in the database.
        </p>

        {/* Registered Person Details Card */}
        <div className="w-full bg-slate-800/90 border border-slate-700/70 rounded-xl p-3.5 flex items-center space-x-3 mb-6 text-left">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={personName}
              className="w-12 h-12 rounded-lg object-cover border border-slate-600/80 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg flex-shrink-0">
              {personName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-0.5">
              Registered As
            </span>
            <h4 className="text-sm font-bold text-slate-100 truncate flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400 inline shrink-0" />
              <span className="truncate">{personName}</span>
            </h4>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {onLogin && (
            <button
              onClick={onLogin}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Log In as {personName}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-98 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
