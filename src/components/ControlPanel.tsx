import React from 'react';
import { Scan, Square } from 'lucide-react';

interface ControlPanelProps {
  onScanClick: () => void;
  onStopScan?: () => void;
  isCameraActive: boolean;
  isScanning: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onScanClick,
  onStopScan,
  isCameraActive,
  isScanning,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header / Control Panel Card styled to exactly match Smart Calendar & Events */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Facial Recognition • Login & Sign Up</h1>
            <p className="text-xs text-slate-400">
              Position your face to log in, or scan to register a new user profile.
            </p>
          </div>
        </div>

        {/* Action Button: Scan Face */}
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {isCameraActive && isScanning ? (
            <button
              onClick={onStopScan}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Scanning</span>
            </button>
          ) : (
            <button
              onClick={onScanClick}
              disabled={isScanning}
              className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                isScanning
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Scan Face</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
