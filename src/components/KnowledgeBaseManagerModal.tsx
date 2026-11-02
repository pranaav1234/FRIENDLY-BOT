import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Code,
  Terminal,
  Cpu,
  Database,
  Globe,
  Sparkles,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { localAiEngine, KnowledgeTopic } from '../services/localAiEngine';

interface KnowledgeBaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseManagerModal: React.FC<KnowledgeBaseManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<KnowledgeTopic | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // New Topic Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom Notes');
  const [newKeywords, setNewKeywords] = useState('');
  const [newSimple, setNewSimple] = useState('');
  const [newDetailed, setNewDetailed] = useState('');
  const [newAnalysis, setNewAnalysis] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Interactive Query Tester State
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const allTopics = localAiEngine.getAllTopics();

  // Categories extraction
  const categories = Array.from(new Set(allTopics.map((t) => t.category || 'General')));

  // Filtered topics
  const filteredTopics = allTopics.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.simple.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSimple.trim()) return;

    const keywordsArray = newKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    localAiEngine.addCustomTopic({
      name: newTitle.trim(),
      category: newCategory.trim() || 'Custom Notes',
      keywords: keywordsArray.length > 0 ? keywordsArray : [newTitle.toLowerCase().trim()],
      simple: newSimple.trim(),
      detailed: newDetailed.trim() || newSimple.trim(),
      analysis: newAnalysis.trim() || newDetailed.trim() || newSimple.trim(),
    });

    setAddSuccessMsg(`Successfully added "${newTitle}" to local offline AI knowledge base!`);
    setNewTitle('');
    setNewKeywords('');
    setNewSimple('');
    setNewDetailed('');
    setNewAnalysis('');
    setIsAddingCustom(false);

    setTimeout(() => setAddSuccessMsg(''), 4000);
  };

  const handleDeleteCustomTopic = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your local knowledge base?`)) {
      localAiEngine.deleteCustomTopic(id);
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
      }
    }
  };

  const handleRunTestQuery = () => {
    if (!testQuery.trim()) return;
    const res = localAiEngine.generateResponse(testQuery, 'simple');
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Domain-Specific Offline AI Knowledge Base
                <span className="px-2 py-0.5 text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full">
                  100% Offline RAG
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Trained on technical computer science domains, software engineering, and custom notes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {addSuccessMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{addSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Bar: Search & Actions */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supported topics or keywords (e.g., Java, SQL, OOP, Docker)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <button
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingCustom ? 'Cancel Adding' : 'Add Custom Topic / Note'}</span>
            </button>
          </div>

          {/* Add Custom Topic Form */}
          {isAddingCustom && (
            <form onSubmit={handleAddCustomTopic} className="p-5 rounded-2xl bg-slate-950 border border-cyan-900/60 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Add Custom Topic / Knowledge Note</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">Topic Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Internal Microservices API Spec"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Project Documentation"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g., microservices, api spec, internal docs, endpoints"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">Simple Summary Answer *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Concise overview answer read aloud by voice assistant..."
                  value={newSimple}
                  onChange={(e) => setNewSimple(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">Detailed Explanation (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="In-depth technical breakdown..."
                    value={newDetailed}
                    onChange={(e) => setNewDetailed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1">Analytical Breakdown (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Key architectural points & bullet breakdown..."
                    value={newAnalysis}
                    onChange={(e) => setNewAnalysis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  Save Knowledge Entry
                </button>
              </div>
            </form>
          )}

          {/* Interactive Domain Classifier Tester */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Test Offline Domain Classifier & Refusal Engine</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTestQuery()}
                placeholder="Ask a question (e.g. 'What is OOP?' or 'Who won the soccer match?')..."
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleRunTestQuery}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                Test Query
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                  testResult.isSupportedDomain
                    ? 'bg-cyan-950/30 border-cyan-800/80 text-cyan-200'
                    : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1.5">
                    {testResult.isSupportedDomain ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Topic: {testResult.topic}</span>
                  </span>
                  <span className="font-mono text-[11px] opacity-80">
                    Status: {testResult.isSupportedDomain ? 'IN DOMAIN' : 'OUT OF SCOPE'}
                  </span>
                </div>
                <div className="whitespace-pre-wrap font-sans leading-relaxed opacity-95">
                  {testResult.answer}
                </div>
              </div>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All Topics ({allTopics.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTopic?.id === topic.id
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-bold text-white line-clamp-1">{topic.name}</h4>
                    {topic.isCustom && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 rounded-full shrink-0 font-medium">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {topic.simple}
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {topic.keywords.slice(0, 4).map((kw) => (
                      <span
                        key={kw}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
                      >
                        {kw}
                      </span>
                    ))}
                    {topic.keywords.length > 4 && (
                      <span className="px-1 py-0.5 text-[10px] text-slate-500">
                        +{topic.keywords.length - 4}
                      </span>
                    )}
                  </div>

                  {topic.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomTopic(topic.id, topic.name);
                      }}
                      className="mt-2 text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Topic</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Topic View Drawer/Panel */}
          {selectedTopic && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-800/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{selectedTopic.name}</span>
                    <span className="px-2 py-0.5 text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full">
                      {selectedTopic.category}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTopic.keywords.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block mb-1">Simple Overview:</span>
                  <p className="p-3 rounded-lg bg-slate-900 text-slate-200 leading-relaxed">
                    {selectedTopic.simple}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block mb-1">Detailed Explanation:</span>
                  <p className="p-3 rounded-lg bg-slate-900 text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedTopic.detailed}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block mb-1">Analytical Breakdown:</span>
                  <p className="p-3 rounded-lg bg-slate-900 text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedTopic.analysis}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Total Trained Knowledge Entries: {allTopics.length}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium cursor-pointer transition-colors"
          >
            Close Knowledge Manager
          </button>
        </div>

      </div>
    </div>
  );
};
