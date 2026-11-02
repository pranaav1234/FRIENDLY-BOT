import React, { useState, useEffect, useRef, useId } from 'react';
import {
  FileText,
  Upload,
  Copy,
  Check,
  Download,
  Volume2,
  VolumeX,
  Send,
  Trash2,
  History,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  AlertCircle,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode2,
  MessageSquare,
  HelpCircle,
  Layers,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  ListOrdered,
  Lightbulb,
  Scissors,
  Maximize2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { voiceService } from '../services/voiceService';

export type SummaryLevel = 'basic' | 'standard' | 'advanced';

interface SummaryRecord {
  id: string;
  title: string;
  sourceType: 'file' | 'text';
  fileName?: string;
  fileSize?: string;
  level: SummaryLevel;
  summaryText: string;
  originalSnippet: string;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface SummariseViewProps {
  currentUser?: UserProfile | null;
  onExit?: () => void;
}

interface ParsedSection {
  title: string;
  icon?: string;
  content: string[];
}

export const SummariseView: React.FC<SummariseViewProps> = ({ currentUser, onExit }) => {
  const fileInputId = useId();

  // 1. Input Source
  const [inputSource, setInputSource] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 2. Summary Level (Default: STANDARD)
  const [summaryLevel, setSummaryLevel] = useState<SummaryLevel>('standard');

  // Processing & Multi-step indicator
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingPhase, setProcessingPhase] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Summary Results
  const [currentSummary, setCurrentSummary] = useState<string>('');
  const [currentSourceText, setCurrentSourceText] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentFileMeta, setCurrentFileMeta] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Expanded sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Follow-up Q&A
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // History state
  const [history, setHistory] = useState<SummaryRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const storageKey = currentUser?.id
    ? `friendly_bot_summaries_${currentUser.id}`
    : 'friendly_bot_summaries_guest';

  // Load history from user storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to load summary history:', err);
    }
  }, [storageKey]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  const saveToHistory = (record: SummaryRecord) => {
    setHistory((prev) => {
      const updated = [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 30);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save summary to localStorage:', err);
      }
      return updated;
    });
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (file: File): string => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'PDF';
    if (name.endsWith('.docx') || name.endsWith('.doc')) return 'Word Document';
    if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return 'Image';
    if (name.endsWith('.csv') || file.type === 'text/csv') return 'CSV Sheet';
    if (name.endsWith('.json') || file.type === 'application/json') return 'JSON Data';
    if (name.endsWith('.md')) return 'Markdown';
    return 'Text Document';
  };

  // Safe file loader avoiding detached buffer issues
  const processFile = (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);

    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    const isTxt =
      file.type.startsWith('text/') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json');

    if (isImg) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setFilePreview(result);
        const base64 = result.split(',')[1];
        setFileBase64(base64);
      };
      reader.readAsDataURL(file);
    } else if (isTxt) {
      setFilePreview(null);
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = reader.result as string;
        setPastedText(textContent);
        const base64 = btoa(unescape(encodeURIComponent(textContent)));
        setFileBase64(base64);
      };
      reader.readAsText(file);
    } else {
      // PDF or Word .docx
      setFilePreview(null);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setFileBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const loadSampleText = () => {
    const sample = `# Quarterly Project Strategy & Milestone Report\n\nDate: October 2026\nLead: Engineering & Systems Team\nStatus: On Track\n\n## 1. Executive Summary & Overview\nDuring this quarter, our primary focus was stabilizing the core assistant platform, improving local inference throughput by 42%, and introducing offline scheduling intelligence. All high-priority milestones were delivered ahead of schedule.\n\n## 2. Key Achievements & Milestones\n- Fully offline voice command routing with zero cloud roundtrip dependency.\n- Unified schedule timeline merging class timetables, calendar events, alarms, and reminders.\n- Multimodal document understanding supporting PDFs, Word documents, images, and raw notes.\n- Responsive design optimized for touch and desktop displays.\n\n## 3. Notable Challenges & Resolutions\nHigh memory usage during complex document tokenization was identified early. The engineering team resolved this by implementing intelligent chunked parsing and stream pipelining.\n\n## 4. Key Metrics & Timeline\n- Latency reduction: 42% faster response time.\n- Document parse rate: 99.4% accuracy across formatted tables.\n- Next Milestone Review: November 15, 2026.\n\n## 5. Next Steps & Ownership\n- Deploy version 2.5 build to staging (Owner: Core Team, Deadline: Nov 5)\n- Conduct comprehensive user accessibility testing (Owner: UX Lead, Deadline: Nov 10)`;
    setPastedText(sample);
    setInputSource('text');
    setSelectedFile(null);
    setFileBase64(null);
    setFilePreview(null);
  };

  // Main Summarisation Execution
  const executeSummarisation = async (targetLevel: SummaryLevel, refinement?: 'shorter' | 'detailed' | 'simple') => {
    setErrorMessage(null);

    const hasText = pastedText.trim().length > 0;
    const hasFile = selectedFile !== null && fileBase64 !== null;

    if (!hasText && !hasFile) {
      setErrorMessage('Please paste text or upload a document before requesting a summary.');
      return;
    }

    setIsProcessing(true);
    setProcessingPhase(1); // File received / Text received
    voiceService.stop();
    setIsSpeaking(false);

    // Multi-step progress simulation
    const phase2Timer = setTimeout(() => setProcessingPhase(2), 600); // Content extracted
    const phase3Timer = setTimeout(() => setProcessingPhase(3), 1300); // Understanding content

    try {
      let mime = 'text/plain';
      if (selectedFile) {
        if (selectedFile.type) {
          mime = selectedFile.type;
        } else if (selectedFile.name.endsWith('.pdf')) {
          mime = 'application/pdf';
        } else if (selectedFile.name.endsWith('.docx')) {
          mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (selectedFile.name.endsWith('.doc')) {
          mime = 'application/msword';
        }
      }

      const payload = {
        text: inputSource === 'text' || !hasFile ? pastedText.trim() : undefined,
        fileData: hasFile ? fileBase64 : undefined,
        mimeType: mime,
        fileName: selectedFile?.name,
        summaryLevel: targetLevel,
        refinement,
      };

      const res = await fetch('/api/summarise/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setProcessingPhase(4); // Creating summary

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const generated = data.summary || '';

      if (!generated.trim()) {
        throw new Error('No summary could be generated from this document.');
      }

      const title =
        selectedFile?.name ||
        pastedText.trim().split('\n')[0].replace(/^[#\s*-]+/, '').slice(0, 50) ||
        'Untitled Document';

      const fileMeta = selectedFile
        ? {
            name: selectedFile.name,
            size: formatFileSize(selectedFile.size),
            type: getFileTypeLabel(selectedFile),
          }
        : {
            name: 'Pasted Text',
            size: `${pastedText.trim().split(/\s+/).length} words`,
            type: 'Direct Text',
          };

      setCurrentSummary(generated);
      setCurrentTitle(title);
      setCurrentFileMeta(fileMeta);
      setCurrentSourceText(pastedText.trim() || selectedFile?.name || '');
      setChatMessages([]);
      setCollapsedSections({});

      // Save to History
      const newRecord: SummaryRecord = {
        id: `summary-${Date.now()}`,
        title,
        sourceType: hasFile ? 'file' : 'text',
        fileName: selectedFile?.name,
        fileSize: selectedFile ? formatFileSize(selectedFile.size) : `${pastedText.trim().split(/\s+/).length} words`,
        level: targetLevel,
        summaryText: generated,
        originalSnippet: (pastedText.trim() || selectedFile?.name || '').slice(0, 400),
        timestamp: new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      saveToHistory(newRecord);
    } catch (err: any) {
      console.error('Summarisation error:', err);
      const msg = err?.message || '';
      if (msg.includes('configured correctly') || msg.includes('API key')) {
        setErrorMessage('The summarisation service is not configured correctly. Please check the application configuration.');
      } else if (msg.includes('temporarily busy') || msg.includes('429') || msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        setErrorMessage('The summarisation service is temporarily busy. Please try again.');
      } else if (msg.includes('not supported') || msg.includes('unsupported')) {
        setErrorMessage('This file type is not supported.');
      } else if (msg.includes('No readable content')) {
        setErrorMessage('No readable content was found in this file.');
      } else if (msg.includes('could not be parsed') || msg.includes('could not be processed') || msg.includes('INVALID_ARGUMENT')) {
        setErrorMessage('This document could not be processed. Please check the file and try again.');
      } else if (msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('connection')) {
        setErrorMessage('Unable to connect to the summarisation service. Check your connection and try again.');
      } else {
        setErrorMessage(msg || 'Unable to connect to the summarisation service. Check your connection and try again.');
      }
    } finally {
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      setIsProcessing(false);
      setProcessingPhase(0);
    }
  };

  // Helper to parse markdown headings into clean interactive sections
  const parseSummarySections = (markdown: string): ParsedSection[] => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const headingMatch = line.match(/^#{1,4}\s+(.+)$/);

      if (headingMatch) {
        if (currentSection && currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headingMatch[1].replace(/[*_`]/g, '').trim(),
          content: [],
        };
      } else if (currentSection) {
        if (line.length > 0) {
          currentSection.content.push(rawLine);
        }
      } else if (line.length > 0) {
        // Content before any heading
        if (!currentSection) {
          currentSection = {
            title: 'Overview',
            content: [],
          };
        }
        currentSection.content.push(rawLine);
      }
    }

    if (currentSection && currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    // Fallback if no markdown headers were detected
    if (sections.length === 0 && markdown.trim().length > 0) {
      sections.push({
        title: 'Summary',
        content: lines.filter((l) => l.trim().length > 0),
      });
    }

    return sections;
  };

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Copy Summary
  const handleCopySummary = () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download Summary
  const handleDownload = (format: 'txt' | 'md') => {
    if (!currentSummary) return;
    const blob = new Blob([currentSummary], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (currentTitle || 'Summary').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeTitle}_summary.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Text-To-Speech Playback
  const handleToggleSpeak = () => {
    if (isSpeaking) {
      voiceService.stop();
      setIsSpeaking(false);
    } else {
      if (!currentSummary) return;
      const cleaned = currentSummary
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_~`]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();

      setIsSpeaking(true);
      voiceService.speak(cleaned, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // Send Follow-Up Chat Question
  const handleSendFollowUp = async (questionText?: string) => {
    const textToSend = questionText || followUpQuestion.trim();
    if (!textToSend || isChatLoading || !currentSummary) return;

    setFollowUpQuestion('');

    const userMsg: ChatMessage = {
      id: `chat-u-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/summarise/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          originalContent: currentSourceText,
          summary: currentSummary,
          history: chatMessages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to get answer');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `chat-a-${Date.now()}`,
        role: 'assistant',
        text: data.answer || 'I could not find an answer in the provided document.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `chat-err-${Date.now()}`,
        role: 'assistant',
        text: `Sorry, I could not answer that: ${err?.message || 'Chat service error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Load item from history
  const handleRestoreFromHistory = (item: SummaryRecord) => {
    setCurrentTitle(item.title);
    setCurrentSummary(item.summaryText);
    setCurrentSourceText(item.originalSnippet);
    setSummaryLevel(item.level);
    setCurrentFileMeta({
      name: item.fileName || item.title,
      size: item.fileSize || 'Saved Document',
      type: item.sourceType === 'file' ? 'Uploaded File' : 'Direct Text',
    });
    setChatMessages([]);
    setCollapsedSections({});
    setShowHistoryModal(false);
  };

  const parsedSections = parseSummarySections(currentSummary);

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* View Header & Action Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-600/20 border border-teal-500/30 rounded-xl text-teal-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SUMMARISE</h1>
            <p className="text-xs text-slate-400">Transform documents and text into structured summaries • Online AI • Requires Internet</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700/80 cursor-pointer active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700/80 cursor-pointer shadow-md active:scale-[0.98]"
          >
            <History className="w-4 h-4 text-teal-400" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* 1. SELECT INPUT SOURCE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
              1
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select Input Source</h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setInputSource('upload')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                inputSource === 'upload'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => setInputSource('text')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                inputSource === 'text'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Direct Text</span>
            </button>
          </div>
        </div>

        {/* Upload Mode UI */}
        {inputSource === 'upload' && (
          <div className="space-y-3">
            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-teal-400 bg-teal-950/20 scale-[0.99]'
                    : 'border-slate-700 hover:border-teal-500/50 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  Click to upload or drag & drop document
                </p>
                <p className="text-xs text-slate-400 mb-4">
                  Supports PDF, Word (.docx), Images (.png, .jpg, .webp), Text (.txt, .md), CSV, JSON
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    PDF Document
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    Word (.docx)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    Scanned & Images
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                    Direct Text
                  </span>
                </div>
              </div>
            ) : (
              /* Selected File Card */
              <div className="bg-slate-950 border border-teal-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                    {selectedFile.type.startsWith('image/') ? (
                      <FileImage className="w-6 h-6" />
                    ) : selectedFile.name.endsWith('.pdf') ? (
                      <FileText className="w-6 h-6" />
                    ) : (
                      <File className="w-6 h-6" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
                    <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <span className="text-teal-400 font-semibold">{getFileTypeLabel(selectedFile)}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={removeSelectedFile}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Direct Text Mode UI */}
        {inputSource === 'text' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your text here (articles, meeting notes, research, emails, code notes, transcriptions)..."
                rows={7}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/60 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all resize-y font-mono leading-relaxed"
              />
              {pastedText.trim().length > 0 && (
                <button
                  onClick={() => setPastedText('')}
                  className="absolute top-3 right-3 p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md text-xs transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span>{pastedText.trim().length} characters</span>
                <span>•</span>
                <span>{pastedText.trim().length > 0 ? pastedText.trim().split(/\s+/).length : 0} words</span>
              </div>
              <button
                onClick={loadSampleText}
                className="text-teal-400 hover:text-teal-300 font-semibold transition-colors cursor-pointer"
              >
                + Load Sample Text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUMMARY LEVEL (3 Simple Options: BASIC / STANDARD / ADVANCED) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/30">
            2
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Summary Level</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* BASIC */}
          <button
            type="button"
            onClick={() => setSummaryLevel('basic')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
              summaryLevel === 'basic'
                ? 'bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">BASIC</span>
                {summaryLevel === 'basic' && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs font-semibold text-teal-400 mb-1">Short & simple summary</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Main idea and most important points.
              </p>
            </div>
          </button>

          {/* STANDARD (Default) */}
          <button
            type="button"
            onClick={() => setSummaryLevel('standard')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between relative ${
              summaryLevel === 'standard'
                ? 'bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">STANDARD</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40">
                    Recommended
                  </span>
                </div>
                {summaryLevel === 'standard' && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs font-semibold text-teal-400 mb-1">Balanced summary with details</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Key points, important details, findings, and conclusions.
              </p>
            </div>
          </button>

          {/* ADVANCED */}
          <button
            type="button"
            onClick={() => setSummaryLevel('advanced')}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
              summaryLevel === 'advanced'
                ? 'bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">ADVANCED</span>
                {summaryLevel === 'advanced' && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </div>
              <p className="text-xs font-semibold text-teal-400 mb-1">Deep & comprehensive analysis</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Detailed breakdown, important facts, relationships, conclusions, and useful insights.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. GENERATE BUTTON */}
      <div>
        <button
          onClick={() => executeSummarisation(summaryLevel)}
          disabled={isProcessing || (!selectedFile && !pastedText.trim())}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center space-x-2 shadow-xl cursor-pointer ${
            isProcessing || (!selectedFile && !pastedText.trim())
              ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-teal-500/20 active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Processing Summary...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-200" />
              <span>✨ SUMMARISE</span>
            </>
          )}
        </button>
      </div>

      {/* PROCESSING STATE UI */}
      {isProcessing && (
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-2xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
              <span>Preparing document summary...</span>
            </h4>
            <span className="text-xs font-semibold text-teal-400">Step {processingPhase} of 4</span>
          </div>

          <div className="space-y-2.5">
            {/* Step 1 */}
            <div className="flex items-center space-x-3 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  processingPhase >= 1
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {processingPhase >= 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span
                className={processingPhase >= 1 ? 'text-slate-200 font-medium' : 'text-slate-500'}
              >
                Reading document
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center space-x-3 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  processingPhase >= 2
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {processingPhase >= 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span
                className={processingPhase >= 2 ? 'text-slate-200 font-medium' : 'text-slate-500'}
              >
                Extracting content
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center space-x-3 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  processingPhase >= 3
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {processingPhase >= 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span
                className={processingPhase >= 3 ? 'text-slate-200 font-medium' : 'text-slate-500'}
              >
                Understanding content
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center space-x-3 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  processingPhase >= 4
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {processingPhase >= 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
              </div>
              <span
                className={processingPhase >= 4 ? 'text-slate-200 font-medium' : 'text-slate-500'}
              >
                Creating summary
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MESSAGE WITH DIRECT RETRY BUTTON */}
      {errorMessage && !isProcessing && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 text-rose-200 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-100">Unable to generate summary</p>
              <p className="text-xs text-rose-300 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 pl-8">
            <button
              onClick={() => executeSummarisation(summaryLevel)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-rose-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY RESULT VIEW */}
      {currentSummary && !isProcessing && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
          {/* Header Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Summary Result
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700 font-bold uppercase">
                  {summaryLevel}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">{currentTitle}</h3>
              {currentFileMeta && (
                <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                  <span>{currentFileMeta.name}</span>
                  <span>•</span>
                  <span>{currentFileMeta.type}</span>
                  <span>•</span>
                  <span>{currentFileMeta.size}</span>
                </div>
              )}
            </div>

            {/* Actions: Copy, Read Aloud, Download */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                title="Copy markdown summary"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleSpeak}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                  isSpeaking
                    ? 'bg-teal-600 text-white border-teal-500 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title={isSpeaking ? 'Stop playback' : 'Read summary aloud'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Listen</span>
                  </>
                )}
              </button>

              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                <button
                  onClick={() => handleDownload('md')}
                  className="px-2.5 py-1 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 rounded transition-colors"
                  title="Download Markdown"
                >
                  .MD
                </button>
                <button
                  onClick={() => handleDownload('txt')}
                  className="px-2.5 py-1 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-700 rounded transition-colors"
                  title="Download Text"
                >
                  .TXT
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Structured Summary Cards */}
          <div className="space-y-4">
            {parsedSections.map((section, idx) => {
              const isCollapsed = collapsedSections[section.title] || false;
              return (
                <div
                  key={`sec-${idx}`}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full px-5 py-3.5 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-slate-100">{section.title}</span>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="p-5 space-y-2.5 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {section.content.map((cLine, cIdx) => {
                        const trimmed = cLine.trim();
                        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                          return (
                            <div key={`line-${cIdx}`} className="flex items-start space-x-2 pl-1">
                              <span className="text-teal-400 mt-1 font-bold text-xs">•</span>
                              <p className="flex-1 text-slate-200">
                                {trimmed.replace(/^[-*]\s+/, '')}
                              </p>
                            </div>
                          );
                        } else if (trimmed.startsWith('1.') || /^\d+\.\s/.test(trimmed)) {
                          return (
                            <div key={`line-${cIdx}`} className="flex items-start space-x-2 pl-1">
                              <span className="text-teal-400 font-bold text-xs mt-0.5">
                                {trimmed.split(' ')[0]}
                              </span>
                              <p className="flex-1 text-slate-200">
                                {trimmed.replace(/^\d+\.\s+/, '')}
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <p key={`line-${cIdx}`} className="text-slate-300">
                              {trimmed}
                            </p>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Refinement & Transformation Buttons */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Refine Summary
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => executeSummarisation(summaryLevel)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span>Regenerate</span>
              </button>

              <button
                onClick={() => executeSummarisation(summaryLevel, 'shorter')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                <span>Make Shorter</span>
              </button>

              <button
                onClick={() => executeSummarisation(summaryLevel, 'detailed')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Make More Detailed</span>
              </button>

              <button
                onClick={() => executeSummarisation(summaryLevel, 'simple')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Explain Simply</span>
              </button>
            </div>
          </div>

          {/* Ask Follow-up Questions About This Document */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <h4 className="text-sm font-bold text-white">
                Ask Follow-up Questions About This Document
              </h4>
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSendFollowUp('What is the main idea of this document?')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              >
                💡 What is the main idea?
              </button>
              <button
                onClick={() => handleSendFollowUp('Explain this simply for a beginner.')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              >
                🐣 Explain this simply
              </button>
              <button
                onClick={() => handleSendFollowUp('What are the key dates and deadlines mentioned?')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              >
                📅 What are important dates?
              </button>
              <button
                onClick={() => handleSendFollowUp('What are the main conclusions and takeaways?')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer border border-slate-700/60"
              >
                🎯 What are the conclusions?
              </button>
            </div>

            {/* Chat History */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-teal-600 text-white rounded-tr-none'
                          : 'bg-slate-850 text-slate-200 border border-slate-700/80 rounded-tl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="block text-[10px] text-right mt-1 opacity-60">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center space-x-2 text-xs text-teal-400 italic">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing document to answer...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendFollowUp();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Ask a question about this document..."
                disabled={isChatLoading}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!followUpQuestion.trim() || isChatLoading}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition-all cursor-pointer ${
                  !followUpQuestion.trim() || isChatLoading
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md'
                }`}
              >
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Summary History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No summaries generated yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleRestoreFromHistory(item)}
                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1 overflow-hidden pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white truncate group-hover:text-teal-400 transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-bold uppercase">
                          {item.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {item.originalSnippet || item.summaryText.slice(0, 100)}
                      </p>
                      <p className="text-[10px] text-slate-500">{item.timestamp}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1.5 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <button
                  onClick={clearAllHistory}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Clear All History
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
