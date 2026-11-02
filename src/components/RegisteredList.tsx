import React, { useState } from 'react';
import { RegisteredPerson } from '../types';
import { Trash2, Users, UserCheck, AlertTriangle, LogIn } from 'lucide-react';

interface RegisteredListProps {
  people: RegisteredPerson[];
  onDeletePerson: (id: string, name: string) => void;
  onClearAll?: () => void;
  onSelectUser?: (person: RegisteredPerson) => void;
}

export const RegisteredList: React.FC<RegisteredListProps> = ({
  people,
  onDeletePerson,
  onClearAll,
  onSelectUser,
}) => {
  const [personToDelete, setPersonToDelete] = useState<RegisteredPerson | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    if (personToDelete) {
      onDeletePerson(personToDelete.id, personToDelete.name);
      setPersonToDelete(null);
    }
  };

  const handleClearAllClick = () => {
    if (onClearAll) {
      onClearAll();
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col h-full">
      {/* Header showing total number of created accounts: Registered: X */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Registered: <span className="text-emerald-400 font-extrabold">{people.length}</span>
            </h3>
          </div>
        </div>

        {onClearAll && people.length > 0 && (
          showClearConfirm ? (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearAllClick}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold transition-colors shadow"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors border border-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition-colors font-medium"
            >
              Clear All
            </button>
          )
        )}
      </div>

      {/* Accounts List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 max-h-[520px]">
        {people.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl p-4">
            <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-300 mb-0.5">No Registered Accounts</p>
            <p className="text-[11px] text-slate-500 leading-normal">
              Click <strong>"Scan Face"</strong> or use <strong>"Username & Password"</strong> to create an account.
            </p>
          </div>
        ) : (
          people.map((person, index) => {
            const hasFace = !!(
              (person.descriptors && person.descriptors.length > 0) ||
              (person.thumbnail && person.thumbnail.trim().length > 0)
            );

            return (
              <div
                key={`${person.id}_${person.name}_${index}`}
                className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3 space-y-2.5 transition-all group"
              >
                {/* Person Info */}
                <div className="flex items-start gap-3">
                  {person.thumbnail ? (
                    <img
                      src={person.thumbnail}
                      alt={person.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-slate-700/60 shadow-sm">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    {/* Display Name */}
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {person.name}
                    </h4>

                    {/* Username */}
                    <p className="text-xs text-slate-400 font-medium">
                      Username: <span className="text-slate-200">{person.username || 'Not Set'}</span>
                    </p>

                    {/* Authentication Status */}
                    {hasFace ? (
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <span className="font-bold">✓</span>
                        <span>Facial Login Enabled</span>
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <span>Facial Login Not Set</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons: [ Login ] [ Delete ] */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  {onSelectUser && (
                    <button
                      type="button"
                      onClick={() => onSelectUser(person)}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                      title={`Login as ${person.name}`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Login</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPersonToDelete(person)}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700/80 hover:border-rose-800/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title={`Delete ${person.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  Delete this account?
                </h3>
                <p className="text-xs font-semibold text-rose-300/90">
                  {personToDelete.name} {personToDelete.username ? `(@${personToDelete.username})` : ''}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will permanently delete this user's Chatbot account and all associated personal data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-900/30 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
