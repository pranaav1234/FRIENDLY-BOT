import React, { useState, useEffect } from 'react';
import { X, Volume2, Sliders, Play, VolumeX, AlertCircle, Check } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { VoiceSettings } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(voiceService.getSettings());
      setVoices(voiceService.getAvailableVoices());
      setTtsError(null);

      const unsubscribeSettings = voiceService.subscribe((updated) => {
        setSettings(updated);
      });

      const unsubscribeVoices = voiceService.onVoicesChanged((vList) => {
        setVoices(vList);
      });

      return () => {
        unsubscribeSettings();
        unsubscribeVoices();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof VoiceSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    voiceService.saveSettings(updated);
    setTtsError(null);
  };

  const handleTestVoice = () => {
    setTtsError(null);
    setIsPlayingTest(true);

    const timer = setTimeout(() => {
      setIsPlayingTest(false);
    }, 3500);

    voiceService.testVoice(
      'Hello! Voice output is working correctly.',
      () => {
        clearTimeout(timer);
        setIsPlayingTest(false);
      },
      (err) => {
        clearTimeout(timer);
        setIsPlayingTest(false);
        console.warn('Voice test warning:', err);
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={() => {
            voiceService.stop();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Voice Settings</h3>
            <p className="text-xs text-slate-400">Configure text-to-speech announcements</p>
          </div>
        </div>

        {/* Form Controls */}
        <div className="space-y-4">
          {/* Error banner if any */}
          {ttsError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{ttsError}</span>
            </div>
          )}

          {/* Enable Voice */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-2">
              {settings.enabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-sm font-medium text-slate-200">Enable Voice Output</span>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Speech Voice
            </label>
            <select
              value={settings.selectedVoiceURI}
              onChange={(e) => handleChange('selectedVoiceURI', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">System Default Voice</option>
              {voices.map((v, idx) => (
                <option key={`${v.voiceURI}_${idx}`} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speech Rate / Speed */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Speech Speed (Rate)</span>
              <span className="font-bold text-blue-400">{settings.rate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.rate}
              onChange={(e) => handleChange('rate', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Pitch</span>
              <span className="font-bold text-blue-400">{settings.pitch}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => handleChange('pitch', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            className={`w-full py-2.5 border text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              isPlayingTest
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {isPlayingTest ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Playing Test Voice...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Test Voice Announcement</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-right">
          <button
            onClick={() => {
              voiceService.stop();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

