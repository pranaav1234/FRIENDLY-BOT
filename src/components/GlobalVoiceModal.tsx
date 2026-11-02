import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  X,
  User,
  Bot,
  Volume2,
  BookOpen,
  Send,
  Trash2,
  Sparkles,
} from 'lucide-react';

import { processUnifiedCommand } from '../services/sharedCommandEngine';
import { voiceService } from '../services/voiceService';
import { localLlmService, LocalLlmState } from '../services/localLlmService';
import { KnowledgeBaseManagerModal } from './KnowledgeBaseManagerModal';

interface GlobalVoiceModalProps {
  isOpen: boolean;
  status: 'idle' | 'listening' | 'processing' | 'executing';
  recognizedText: string;
  executingCommand: string;
  volume: number; // 0 to 100
  responseText?: string;
  isSpeaking?: boolean;
  spokenWordIndex?: number;
  onToggleListening: () => void;
  onDismiss: () => void;
  onStopSpeaking?: () => void;
  onAskAiOnline?: (query: string) => void;
  // Navigation Callbacks
  onNavigateToHomePage?: () => void;
  onNavigateToScanPage?: () => void;
  onNavigateToDetectPage?: () => void;
  onNavigateToGesturePage?: () => void;
  onNavigateToSettingsPage?: () => void;
  onNavigateToTimeManagementPage?: (tab?: 'clock' | 'alarm' | 'timer' | 'stopwatch' | 'reminder' | 'timetable') => void;
  onNavigateToCalendarPage?: () => void;
  onNavigateToProductivityPage?: () => void;
  onNavigateToMusicPage?: () => void;
  onNavigateToVoiceAssistantPage?: () => void;
  onNavigateToSummarisePage?: () => void;
  currentUser?: { id: string; name: string } | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  topic?: string;
  isRefusal?: boolean;
  originalQuery?: string;
}

export const GlobalVoiceModal: React.FC<GlobalVoiceModalProps> = ({
  isOpen,
  status,
  recognizedText,
  executingCommand,
  volume = 0,
  responseText = '',
  isSpeaking = false,
  spokenWordIndex = -1,
  onToggleListening,
  onDismiss,
  onStopSpeaking,
  onAskAiOnline,
  onNavigateToHomePage,
  onNavigateToScanPage,
  onNavigateToDetectPage,
  onNavigateToGesturePage,
  onNavigateToSettingsPage,
  onNavigateToTimeManagementPage,
  onNavigateToCalendarPage,
  onNavigateToProductivityPage,
  onNavigateToMusicPage,
  onNavigateToVoiceAssistantPage,
  onNavigateToSummarisePage,
  currentUser,
}) => {
  const [showTopicsModal, setShowTopicsModal] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am OFFLINE BOT, your 100% offline assistant.\n\n• Application Commands: "open calendar", "set timer for 10 minutes", "set reminder at 5 pm"\n• App Data: "what is my next class?", "what alarms do I have?"\n• Offline Knowledge: "what is Java?", "explain React"',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: '100% Offline AI',
    },
  ]);

  const [llmState, setLlmState] = useState<LocalLlmState>(localLlmService.getState());

  useEffect(() => {
    return localLlmService.subscribe((state) => {
      setLlmState(state);
    });
  }, []);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const lastProcessedSpeechRef = useRef<string>('');

  // Auto-scroll conversation thread to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, recognizedText, status, isProcessing]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showTopicsModal) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss, showTopicsModal]);

  // Synchronize incoming speech recognition transcript & response into chat thread
  useEffect(() => {
    if (!recognizedText || !recognizedText.trim()) return;

    const speechText = recognizedText.trim();
    if (responseText && responseText.trim() && lastProcessedSpeechRef.current !== speechText) {
      lastProcessedSpeechRef.current = speechText;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isRefusal = responseText.includes("I don't have an answer for that in my offline knowledge.");

      setChatMessages((prev) => {
        const hasUserMsg = prev.some((m) => m.sender === 'user' && m.text === speechText);
        const newMsgs: ChatMessage[] = [];

        if (!hasUserMsg) {
          newMsgs.push({
            id: `user-speech-${Date.now()}`,
            sender: 'user',
            text: speechText,
            timestamp: timeStr,
          });
        }

        newMsgs.push({
          id: `bot-speech-${Date.now()}`,
          sender: 'bot',
          text: responseText,
          timestamp: timeStr,
          topic: executingCommand || 'Offline AI',
          isRefusal,
          originalQuery: speechText,
        });

        return [...prev, ...newMsgs];
      });
    }
  }, [recognizedText, responseText, executingCommand]);

  // Handle sending typed text input locally & offline
  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : chatInput).trim();
    if (!query || isProcessing) return;

    setIsProcessing(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    try {
      // Process query 100% locally and offline through unified command pipeline
      const cmdRes = await processUnifiedCommand(query, currentUser?.id || 'guest', 'simple', {
        onNavigateToHomePage,
        onNavigateToScanPage,
        onNavigateToDetectPage,
        onNavigateToGesturePage,
        onNavigateToSettingsPage,
        onNavigateToTimeManagementPage,
        onNavigateToCalendarPage,
        onNavigateToProductivityPage,
        onNavigateToMusicPage,
        onNavigateToVoiceAssistantPage,
        onNavigateToSummarisePage,
      });

      const isRefusal =
        cmdRes.isRefusal ||
        cmdRes.feedbackMessage.includes("I don't have an answer for that in my offline knowledge.");

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: cmdRes.feedbackMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: cmdRes.topic || (cmdRes.type === 'app_data' ? 'App Data' : 'Offline AI Engine'),
        isRefusal,
        originalQuery: query,
      };

      setChatMessages((prev) => [...prev, botMsg]);

      // Read answer aloud via local browser TTS
      voiceService.speak(cmdRes.feedbackMessage);

      // Automatically close modal when a navigation action is executed so user lands on requested page
      if (cmdRes.type === 'navigation' || cmdRes.type === 'shortcut') {
        setTimeout(() => {
          onDismiss();
        }, 350);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `Command error: ${err?.message || 'Failed to execute command.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: 'Error',
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    setChatMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: 'Conversation history cleared. How can I help you with application commands or offline questions?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: '100% Offline AI',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px]"
        >
          {/* Header Bar */}
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    OFFLINE BOT
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Offline AI
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    100% Offline AI • No Internet Required
                    {llmState.status === 'loading' && ` (${llmState.progress}%)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Technical Knowledge Base */}
              <button
                type="button"
                onClick={() => setShowTopicsModal(true)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 cursor-pointer"
                title="Knowledge Base"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Clear History */}
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/50 cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversation Thread Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/50">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[90%] sm:max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-800 text-cyan-400 border border-slate-700'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1 min-w-0">
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-tr-xs'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Ask AI button for unsupported queries */}
                    {msg.sender === 'bot' && (msg.isRefusal || msg.text.includes("I don't have an answer for that in my offline knowledge.")) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (onAskAiOnline) {
                              onAskAiOnline(msg.originalQuery || '');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                        >
                          <span>Ask AI →</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span>{msg.timestamp}</span>
                    {msg.topic && (
                      <span className="text-cyan-400/80 font-medium">
                        • {msg.topic}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Live Microphone Transcript Preview */}
            {status === 'listening' && (
              <div className="flex gap-3 max-w-[85%] mr-auto animate-pulse">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Mic className="w-4 h-4 animate-bounce" />
                </div>
                <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-sm rounded-tl-xs">
                  <p className="italic">
                    {recognizedText ? `"${recognizedText}"` : 'Listening... Speak your question or command...'}
                  </p>
                </div>
              </div>
            )}

            {/* Processing State Indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs w-fit animate-pulse">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Processing command offline...</span>
              </div>
            )}

            {/* Speaking / Audio Status */}
            {isSpeaking && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs w-fit">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Bot is speaking...</span>
                {onStopSpeaking && (
                  <button
                    type="button"
                    onClick={onStopSpeaking}
                    className="ml-1 text-slate-400 hover:text-white underline text-[10px] cursor-pointer"
                  >
                    Stop
                  </button>
                )}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Unified Bottom Input Bar (Text Field + Microphone + Send) */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="e.g. 'open calendar', 'set timer for 10 minutes', 'what is my next class?'..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />

            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={onToggleListening}
              className={`p-2.5 rounded-xl transition-all border flex items-center justify-center cursor-pointer ${
                status === 'listening'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700 hover:border-cyan-500/50'
              }`}
              title={status === 'listening' ? 'Stop Listening' : 'Speak with Microphone'}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSendChatMessage()}
              disabled={!chatInput.trim() || isProcessing}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-medium text-sm transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Knowledge Base Modal */}
      {showTopicsModal && (
        <KnowledgeBaseManagerModal
          isOpen={showTopicsModal}
          onClose={() => setShowTopicsModal(false)}
        />
      )}
    </AnimatePresence>
  );
};
