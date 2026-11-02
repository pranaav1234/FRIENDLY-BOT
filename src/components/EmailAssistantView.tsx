import React, { useState } from 'react';
import {
  Mail,
  FileText,
  RefreshCw,
  FolderKanban,
  ArrowLeft,
  Copy,
  Check,
  Edit3,
  Sparkles,
  AlertCircle,
  Loader2,
  Send,
  User,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  Info,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';

interface EmailAssistantViewProps {
  onExit?: () => void;
}

type Mode = 'draft' | 'summarize' | 'rewrite' | 'organize';

interface SummarizeResult {
  mainPoint?: string;
  importantDetails?: string[];
  actionRequired?: string;
  importantDates?: string;
  deadlines?: string;
  peopleMentioned?: string[];
}

interface OrganizedItem {
  subject?: string;
  excerpt?: string;
  explanation?: string;
}

interface OrganizedCategory {
  category: string;
  items: OrganizedItem[];
}

export const EmailAssistantView: React.FC<EmailAssistantViewProps> = ({ onExit }) => {
  const [mode, setMode] = useState<Mode>('draft');

  // Draft State
  const [draftRecipient, setDraftRecipient] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftTone, setDraftTone] = useState<string>('Professional');
  const [draftLength, setDraftLength] = useState<string>('Medium');
  const [draftResult, setDraftResult] = useState<{ subject: string; body: string } | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftSubject, setEditedDraftSubject] = useState('');
  const [editedDraftBody, setEditedDraftBody] = useState('');

  // Summarize State
  const [summarizeContent, setSummarizeContent] = useState('');
  const [summarizeResult, setSummarizeResult] = useState<SummarizeResult | null>(null);

  // Rewrite State
  const [rewriteContent, setRewriteContent] = useState('');
  const [rewriteOption, setRewriteOption] = useState('Make Professional');
  const [rewriteResult, setRewriteResult] = useState<string | null>(null);
  const [isEditingRewrite, setIsEditingRewrite] = useState(false);
  const [editedRewriteText, setEditedRewriteText] = useState('');

  // Organize State
  const [organizeContent, setOrganizeContent] = useState('');
  const [organizeResult, setOrganizeResult] = useState<OrganizedCategory[] | null>(null);

  // Global processing & UI feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Process Draft Request
  const handleGenerateDraft = async () => {
    if (!draftPrompt.trim()) {
      setErrorMessage('Please describe what you want to say in the email.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setIsEditingDraft(false);

    try {
      const res = await fetch('/api/email-assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          recipient: draftRecipient.trim(),
          subject: draftSubject.trim(),
          promptText: draftPrompt.trim(),
          tone: draftTone,
          length: draftLength,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to generate draft email.');
      }

      const data = await res.json();
      setDraftResult({
        subject: data.subject || draftSubject || 'Draft Email',
        body: data.body || '',
      });
      setEditedDraftSubject(data.subject || draftSubject || 'Draft Email');
      setEditedDraftBody(data.body || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process email request. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Process Summarize Request
  const handleGenerateSummary = async () => {
    if (!summarizeContent.trim()) {
      setErrorMessage('Please paste the email content you want to summarize.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/email-assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          emailContent: summarizeContent.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to summarize email.');
      }

      const data = await res.json();
      setSummarizeResult(data.summary || null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process email request. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Process Rewrite Request
  const handleGenerateRewrite = async () => {
    if (!rewriteContent.trim()) {
      setErrorMessage('Please paste the existing email you want to rewrite.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setIsEditingRewrite(false);

    try {
      const res = await fetch('/api/email-assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewrite',
          emailContent: rewriteContent.trim(),
          rewriteOption,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to rewrite email.');
      }

      const data = await res.json();
      setRewriteResult(data.rewrittenText || '');
      setEditedRewriteText(data.rewrittenText || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process email request. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Process Organize Request
  const handleGenerateOrganize = async () => {
    if (!organizeContent.trim()) {
      setErrorMessage('Please paste one or multiple emails to organize.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/email-assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'organize',
          emailContent: organizeContent.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Unable to organize emails.');
      }

      const data = await res.json();
      setOrganizeResult(Array.isArray(data.categories) ? data.categories : []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process email request. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const tones = ['Professional', 'Friendly', 'Formal', 'Casual', 'Concise'];
  const lengths = ['Short', 'Medium', 'Detailed'];
  const rewriteOptions = [
    'Make Professional',
    'Make Friendly',
    'Make Formal',
    'Make Concise',
    'Improve Grammar',
    'Make Clearer',
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2">
      {/* View Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EMAIL ASSISTANT</h1>
            <p className="text-xs text-slate-400">Draft, summarize, rewrite, and organize your emails • Online AI • Requires Internet</p>
          </div>
        </div>

        {onExit && (
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700/80 cursor-pointer self-start md:self-auto active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setMode('draft');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'draft'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Draft Email</span>
        </button>

        <button
          onClick={() => {
            setMode('summarize');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'summarize'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Summarize Email</span>
        </button>

        <button
          onClick={() => {
            setMode('rewrite');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'rewrite'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Rewrite Email</span>
        </button>

        <button
          onClick={() => {
            setMode('organize');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'organize'
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Organize Email</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MODE 1: DRAFT EMAIL */}
      {mode === 'draft' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Draft a New Email</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recipient <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draftRecipient}
                  onChange={(e) => setDraftRecipient(e.target.value)}
                  placeholder="e.g. manager@company.com or Manager"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  placeholder="e.g. Leave Request for Personal Appointment"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                What do you want to say? <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="Describe your message... (e.g. I want to ask my manager for one day leave because I have a personal appointment on Friday.)"
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {tones.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraftTone(t)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      draftTone === t
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Length</label>
              <div className="flex flex-wrap gap-2">
                {lengths.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setDraftLength(l)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      draftLength === l
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isLoading || !draftPrompt.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Generate Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Draft Result Display */}
          {draftResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Generated Email Draft</span>
                </h4>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingDraft) {
                        setDraftResult({
                          subject: editedDraftSubject,
                          body: editedDraftBody,
                        });
                        setIsEditingDraft(false);
                      } else {
                        setIsEditingDraft(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isEditingDraft ? 'Done Editing' : 'Edit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `Subject: ${draftResult.subject}\n\n${draftResult.body}`,
                        'draft'
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    {copiedKey === 'draft' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isEditingDraft ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={editedDraftSubject}
                      onChange={(e) => setEditedDraftSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Body</label>
                    <textarea
                      value={editedDraftBody}
                      onChange={(e) => setEditedDraftBody(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 font-mono leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-300">Subject: </span>
                    <span className="text-slate-100 font-medium">{draftResult.subject}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                    {draftResult.body}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SUMMARIZE EMAIL */}
      {mode === 'summarize' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Paste Email to Summarize</span>
            </h3>

            <textarea
              value={summarizeContent}
              onChange={(e) => setSummarizeContent(e.target.value)}
              placeholder="Paste the email content here... (e.g., 'Please submit the project report by Friday and attend the review meeting at 3 PM.')"
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isLoading || !summarizeContent.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Summarizing Email...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Summarize Email</span>
                </>
              )}
            </button>
          </div>

          {/* Structured Summary Result */}
          {summarizeResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Structured Email Summary</span>
                </h4>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `Main Point: ${summarizeResult.mainPoint || 'N/A'}\n\nImportant Details:\n- ${(summarizeResult.importantDetails || []).join('\n- ')}\n\nAction Required: ${summarizeResult.actionRequired || 'None'}\nImportant Dates: ${summarizeResult.importantDates || 'None'}\nDeadlines: ${summarizeResult.deadlines || 'None'}\nPeople Mentioned: ${(summarizeResult.peopleMentioned || []).join(', ')}`,
                      'summarize'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  {copiedKey === 'summarize' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Point */}
                <div className="md:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                    Main Point
                  </span>
                  <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                    {summarizeResult.mainPoint || 'No explicit main point identified.'}
                  </p>
                </div>

                {/* Important Details */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Important Details</span>
                  </span>
                  {summarizeResult.importantDetails && summarizeResult.importantDetails.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                      {summarizeResult.importantDetails.map((detail, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">None mentioned</p>
                  )}
                </div>

                {/* Action Required */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Action Required</span>
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {summarizeResult.actionRequired || 'None'}
                  </p>
                </div>

                {/* Important Dates & Deadlines */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Important Dates & Deadlines</span>
                  </span>
                  <div className="space-y-1 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400 font-semibold">Dates: </span>
                      <span>{summarizeResult.importantDates || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Deadline: </span>
                      <span>{summarizeResult.deadlines || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* People Mentioned */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>People Mentioned</span>
                  </span>
                  {summarizeResult.peopleMentioned && summarizeResult.peopleMentioned.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {summarizeResult.peopleMentioned.map((person, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-800 text-purple-300 text-xs font-semibold"
                        >
                          {person}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">None mentioned</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: REWRITE EMAIL */}
      {mode === 'rewrite' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <span>Paste Email to Rewrite & Improve</span>
            </h3>

            <textarea
              value={rewriteContent}
              onChange={(e) => setRewriteContent(e.target.value)}
              placeholder="Paste your original email here... (e.g., 'I didn't get the document. Please send it again.')"
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Rewrite Goal</label>
              <div className="flex flex-wrap gap-2">
                {rewriteOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRewriteOption(opt)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      rewriteOption === opt
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateRewrite}
              disabled={isLoading || !rewriteContent.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rewriting Email...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Rewrite Email</span>
                </>
              )}
            </button>
          </div>

          {/* Rewrite Result */}
          {rewriteResult !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>Rewritten Email ({rewriteOption})</span>
                </h4>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingRewrite) {
                        setRewriteResult(editedRewriteText);
                        setIsEditingRewrite(false);
                      } else {
                        setIsEditingRewrite(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isEditingRewrite ? 'Done Editing' : 'Edit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateRewrite}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(rewriteResult, 'rewrite')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    {copiedKey === 'rewrite' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isEditingRewrite ? (
                <div>
                  <textarea
                    value={editedRewriteText}
                    onChange={(e) => setEditedRewriteText(e.target.value)}
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed"
                  />
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                  {rewriteResult}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 4: ORGANIZE EMAIL */}
      {mode === 'organize' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              <span>Paste Email(s) to Organize</span>
            </h3>

            <p className="text-xs text-slate-400">
              Paste single or multiple emails to categorize them by action required, deadlines, follow-ups, and priority.
            </p>

            <textarea
              value={organizeContent}
              onChange={(e) => setOrganizeContent(e.target.value)}
              placeholder="Paste emails here..."
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />

            <button
              type="button"
              onClick={handleGenerateOrganize}
              disabled={isLoading || !organizeContent.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Organizing Emails...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Organize Email</span>
                </>
              )}
            </button>
          </div>

          {/* Organized Result */}
          {organizeResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                  <span>Organized Email Categories</span>
                </h4>

                <span className="text-[11px] text-slate-400 italic">
                  Organized using AI text analysis. No live email account changes made.
                </span>
              </div>

              {organizeResult.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No clear categories identified in the provided text.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organizeResult.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
                          {cat.category}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold">
                          {cat.items?.length || 0} item{(cat.items?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {cat.items && cat.items.length > 0 ? (
                          cat.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/60 space-y-1 text-xs"
                            >
                              {item.subject && (
                                <p className="font-bold text-slate-200">{item.subject}</p>
                              )}
                              {item.excerpt && (
                                <p className="text-slate-400 italic text-[11px]">
                                  "{item.excerpt}"
                                </p>
                              )}
                              {item.explanation && (
                                <p className="text-indigo-300 font-medium text-[11px] pt-1 border-t border-slate-800/50">
                                  Why: {item.explanation}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No items</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
