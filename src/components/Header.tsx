import React from 'react';
import { Volume2, VolumeX, Settings, Bot, Mic, LogOut, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onOpenVoiceSettings: () => void;
  registeredCount?: number;
  isListening?: boolean;
  isProcessing?: boolean;
  onToggleGlobalMic?: () => void;
  gestureActive?: boolean;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  showMic?: boolean;
  onOpenAccountSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  voiceEnabled,
  onToggleVoice,
  onOpenVoiceSettings,
  isListening = false,
  isProcessing = false,
  onToggleGlobalMic,
  gestureActive = false,
  currentUser = null,
  onLogout,
  showMic = true,
  onOpenAccountSettings,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-3 items-center">
        
        {/* Left: Logo & Title & Gesture Indicator */}
        <div className="flex items-center space-x-3 justify-self-start">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-cyan-400 shadow-inner flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 tracking-wide whitespace-nowrap leading-tight">
              CHATBOT
            </h1>
            {gestureActive && (
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-0.5 leading-none select-none">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Gesture Nav Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Offline Bot Button (opens OFFLINE BOT interface) */}
        <div className="flex items-center justify-center justify-self-center">
          {showMic ? (
            <button
              onClick={isProcessing ? undefined : onToggleGlobalMic}
              disabled={isProcessing}
              className={`group relative inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-md cursor-pointer ${
                isProcessing
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-cyan-500/50 cursor-wait scale-105'
                  : isListening
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-400 shadow-rose-500/50 animate-pulse scale-105'
                  : 'bg-slate-800 text-cyan-400 border-slate-700/90 hover:bg-slate-750 hover:border-cyan-500/50 hover:text-cyan-300 hover:scale-105'
              }`}
              title="OFFLINE BOT — 100% Offline AI"
            >
              {isProcessing ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0 items-center justify-center">
                    <span className="animate-spin absolute inline-flex h-full w-full rounded-full border-2 border-white border-t-transparent"></span>
                  </span>
                  <span className="tracking-wide text-white font-extrabold leading-none whitespace-nowrap animate-pulse">
                    Processing...
                  </span>
                </>
              ) : isListening ? (
                <>
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <Bot className="w-4 h-4 text-white animate-bounce flex-shrink-0" />
                  <span className="tracking-wide text-white font-extrabold leading-none whitespace-nowrap">
                    Listening...
                  </span>
                </>
              ) : (
                <>
                  <div className="relative p-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="hidden xs:inline font-extrabold text-slate-100 group-hover:text-cyan-300 leading-none whitespace-nowrap">
                    OFFLINE BOT
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 hidden sm:inline">
                    Offline AI
                  </span>
                </>
              )}
            </button>
          ) : null}
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 justify-self-end">
          {/* Current Authenticated User Display with Logout Icon */}
          {currentUser && (
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                title="Manage Account & Credentials"
              >
                {currentUser.thumbnail ? (
                  <img
                    src={currentUser.thumbnail}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-blue-400/50 flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-slate-200 max-w-[110px] truncate">
                  {currentUser.name}
                </span>
                {onOpenAccountSettings && (
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400 transition-colors" />
                )}
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1 rounded bg-slate-700 hover:bg-rose-500/15 border border-slate-600 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 transition-all active:scale-90 cursor-pointer flex items-center justify-center"
                  title="Logout Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Voice Mute / Unmute */}
          <button
            onClick={onToggleVoice}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              voiceEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={voiceEnabled ? 'Voice output is ON (Click to mute)' : 'Voice output is OFF (Click to unmute)'}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="hidden xs:inline">Voice ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden xs:inline">Voice Muted</span>
              </>
            )}
          </button>

          {/* Voice Settings */}
          <button
            onClick={onOpenVoiceSettings}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
            title="Configure Voice Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

