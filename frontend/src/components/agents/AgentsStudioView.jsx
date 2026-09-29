import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Search, 
  Brain, 
  Calendar, 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Send, 
  ArrowRight, 
  Copy, 
  Check, 
  Sliders, 
  Layers, 
  Wrench, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Zap
} from 'lucide-react';
import { agentAPI, postsAPI } from '../../services/api';
import { RecommendationBadge, MediaTypeBadge } from '../common/Badge';

export default function AgentsStudioView({ onNavigate, onOpenScoreModal }) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'chat' | 'tools'
  const [swarmStatus, setSwarmStatus] = useState(null);
  const [toolsList, setToolsList] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pipeline execution state
  const [selectedPostId, setSelectedPostId] = useState('auto');
  const [targetFormat, setTargetFormat] = useState('AUTO');
  const [daysOffset, setDaysOffset] = useState(7);
  const [customNotes, setCustomNotes] = useState('');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'agent',
      text: `### 🤖 Welcome to the LangChain Multi-Agent Swarm

I am your autonomous **Instagram Content Recycling Agent Team** powered by **LangChain.js** and **Google Gemini AI**.

Our active swarm consists of 4 specialized agents:
* 🔍 **Auditor Agent**: Analyzes historical metrics, Z-Scores, and decay curves.
* 🧠 **Strategist Agent**: Evaluates format transitions and runs TF-IDF cannibalization checks.
* 🎨 **Creative Agent**: Crafts 3-second viral hooks and 2026 captions via Gemini.
* 📅 **Planner Agent**: Schedules content into your editorial calendar.

How can our team assist your content recycling strategy today?`,
      thoughts: ['Swarm initialized with 4 autonomous agents and 7 LangChain tools.'],
      tools: [],
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Copy state
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [statusRes, toolsRes, postsRes] = await Promise.all([
        agentAPI.getStatus(),
        agentAPI.getTools(),
        postsAPI.getPosts({ limit: 50 }),
      ]);

      if (statusRes.data) setSwarmStatus(statusRes.data);
      if (toolsRes.data?.tools) setToolsList(toolsRes.data.tools);
      if (postsRes.data?.posts) setPosts(postsRes.data.posts);
    } catch (err) {
      console.error('Failed to load Agent Studio data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run the 4-agent autonomous pipeline
  const handleRunPipeline = async () => {
    setPipelineRunning(true);
    setPipelineError(null);
    setPipelineResult(null);

    try {
      const res = await agentAPI.runPipeline({
        postId: selectedPostId,
        targetFormat,
        daysOffset,
        customNotes,
      });

      if (res.data?.success) {
        setPipelineResult(res.data);
      } else {
        setPipelineError(res.data?.message || 'Pipeline execution failed.');
      }
    } catch (err) {
      console.error('Pipeline error:', err);
      setPipelineError(err.response?.data?.message || err.message || 'Execution error');
    } finally {
      setPipelineRunning(false);
    }
  };

  // Send message in Agent Copilot chat
  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMsg;
    if (!textToSend.trim() || chatLoading) return;

    const userMessage = { sender: 'user', text: textToSend };
    setChatMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInputMsg('');
    setChatLoading(true);

    try {
      const res = await agentAPI.chat({
        message: textToSend,
        history: chatMessages.slice(-6),
      });

      if (res.data) {
        const agentMessage = {
          sender: 'agent',
          text: res.data.message || 'Action executed successfully.',
          thoughts: res.data.thoughts || [],
          tools: res.data.toolsExecuted || [],
        };
        setChatMessages(prev => [...prev, agentMessage]);
      }
    } catch (err) {
      console.error('Agent chat error:', err);
      setChatMessages(prev => [
        ...prev, 
        { sender: 'agent', text: `⚠️ Agent communication error: ${err.message}`, thoughts: ['Network or execution failure'], tools: [] }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const agentIcons = {
    auditor: Search,
    strategist: Brain,
    creative: Sparkles,
    planner: Calendar,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 relative overflow-hidden shadow-card">
        <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-lime-muted text-lime-bright border border-lime-500/30">
                <Cpu className="w-3.5 h-3.5" />
                LangChain.js Multi-Agent Swarm
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-charcoal-800 text-slate-300 border border-slate-700">
                <Zap className="w-3 h-3 text-amber-400" />
                Gemini 3.5 Flash
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              AI Agents Studio
              <span className="text-xs font-mono font-normal text-slate-400 bg-charcoal-800 px-2 py-0.5 rounded-lg border border-slate-700">
                Autonomous Recycling Swarm
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Four autonomous agents working in orchestrated LangChain pipeline: Performance Auditing, TF-IDF Cannibalization Checking, Viral Hook Generation, and Calendar Planning.
            </p>
          </div>

          {/* Quick Roster Indicator */}
          <div className="flex items-center gap-2 bg-charcoal-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-lime-muted text-lime-bright flex items-center justify-center font-bold text-[10px]">
                AUD
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                STR
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-amber-950 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                CRE
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                PLN
              </div>
            </div>
            <div className="ml-2 pr-2">
              <p className="font-bold text-slate-200">4 Active Agents</p>
              <p className="text-[11px] text-lime-bright flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-bright animate-pulse" />
                7 LangChain Tools Ready
              </p>
            </div>
          </div>
        </div>

        {/* 4 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {(swarmStatus?.registeredAgents || [
            { id: 'auditor', name: 'Auditor Agent', role: 'Performance & Decay Analyst', capabilities: ['Z-Scores', 'Evergreen index'] },
            { id: 'strategist', name: 'Strategist Agent', role: 'Retention & Cannibalization', capabilities: ['TF-IDF Overlap', 'Format mapping'] },
            { id: 'creative', name: 'Creative Agent', role: 'Viral Hook & 2026 Scriptwriter', capabilities: ['3-Sec Hooks', 'Gemini AI'] },
            { id: 'planner', name: 'Planner Agent', role: 'Calendar Editorial Scheduler', capabilities: ['Slot optimization', 'Planner sync'] },
          ]).map((agent) => {
            const Icon = agentIcons[agent.id] || Bot;
            return (
              <div 
                key={agent.id}
                className="p-4 rounded-2xl bg-charcoal-850/80 border border-slate-800 hover:border-lime-500/40 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-charcoal-800 border border-slate-700 flex items-center justify-center text-lime-bright group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-lime-muted text-lime-bright border border-lime-500/20">
                    Online
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{agent.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{agent.role}</p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {agent.capabilities?.map((c, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-charcoal-900 text-slate-300 border border-slate-800">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-charcoal-900 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pipeline'
              ? 'bg-lime-accent text-charcoal-950 shadow-glow-subtle'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Autonomous Swarm Pipeline
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'chat'
              ? 'bg-lime-accent text-charcoal-950 shadow-glow-subtle'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Agent Copilot Chat
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tools'
              ? 'bg-lime-accent text-charcoal-950 shadow-glow-subtle'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          LangChain Tools ({toolsList.length || 7})
        </button>
      </div>

      {/* TAB 1: AUTONOMOUS SWARM PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-lime-bright" />
                  Swarm Execution Controls
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure target post and let all 4 agents coordinate autonomously.
                </p>
              </div>

              {/* Target Post Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Instagram Post</label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full bg-charcoal-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-lime-bright"
                >
                  <option value="auto">⚡ Auto-Discover #1 Evergreen Post (Recommended)</option>
                  {posts.map((p) => (
                    <option key={p.originalId || p._id} value={p.originalId || p._id}>
                      [{p.originalId || p._id}] ({p.mediaType}) - {p.caption?.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Repurposed Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Repurposed Target Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {['AUTO', 'REEL', 'CAROUSEL', 'STORY'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                        targetFormat === fmt
                          ? 'bg-lime-muted text-lime-bright border-lime-500/50 shadow-glow-subtle'
                          : 'bg-charcoal-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduling Timing Offset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Schedule Offset (Days from today)</label>
                  <span className="text-xs font-mono text-lime-bright font-bold">+{daysOffset} Days</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="28"
                  value={daysOffset}
                  onChange={(e) => setDaysOffset(Number(e.target.value))}
                  className="w-full accent-lime-accent bg-charcoal-950 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Tomorrow</span>
                  <span>1 Week (Recommended)</span>
                  <span>4 Weeks</span>
                </div>
              </div>

              {/* Custom Guidance Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Creative Notes (Optional)</label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Focus on technical founders, emphasize speed and developer experience..."
                  rows={2}
                  className="w-full bg-charcoal-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-lime-bright resize-none"
                />
              </div>

              {/* Run CTA Button */}
              <button
                type="button"
                onClick={handleRunPipeline}
                disabled={pipelineRunning}
                className="w-full py-3.5 px-4 rounded-2xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-glow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pipelineRunning ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Executing LangChain Swarm...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-charcoal-950" />
                    Launch Autonomous Multi-Agent Swarm
                  </>
                )}
              </button>

              {pipelineError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{pipelineError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Execution Trace & Results Column */}
          <div className="lg:col-span-7 space-y-6">
            {!pipelineResult && !pipelineRunning && (
              <div className="p-12 rounded-3xl bg-charcoal-900 border border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-charcoal-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <Bot className="w-8 h-8 text-lime-bright animate-bounce-slow" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Autonomous Swarm Idle</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Select a target post or leave on auto-discover, then click <strong>"Launch Autonomous Multi-Agent Swarm"</strong> to watch the 4 agents collaborate in real-time.
                  </p>
                </div>
              </div>
            )}

            {pipelineRunning && (
              <div className="p-8 rounded-3xl bg-charcoal-900 border border-lime-500/30 space-y-6 animate-pulse">
                <div className="flex items-center gap-3">
                  <RotateCw className="w-5 h-5 text-lime-bright animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Multi-Agent Swarm In Progress</h3>
                    <p className="text-xs text-slate-400">LangChain agents are reasoning and invoking tools...</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-10 bg-charcoal-800 rounded-xl" />
                  <div className="h-10 bg-charcoal-800 rounded-xl" />
                  <div className="h-10 bg-charcoal-800 rounded-xl" />
                  <div className="h-10 bg-charcoal-800 rounded-xl" />
                </div>
              </div>
            )}

            {pipelineResult && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Mission Complete Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-charcoal-900 to-charcoal-950 border border-lime-500/40 shadow-glow-subtle space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-lime-muted text-lime-bright border border-lime-500/40 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                          Swarm Pipeline Completed
                          <span className="text-[10px] font-mono text-lime-bright bg-lime-muted px-2 py-0.5 rounded-full border border-lime-500/30">
                            {pipelineResult.executionTimeMs}ms
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                          Recycled asset committed to Content Planner for <strong>{pipelineResult.plannedDate}</strong> as <strong>{pipelineResult.targetFormat}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate && onNavigate('planner')}
                      className="px-3.5 py-1.5 rounded-xl bg-charcoal-800 hover:bg-lime-accent hover:text-charcoal-950 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <span>View in Planner</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Summary Metric Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-charcoal-800/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Post ID</span>
                      <span className="font-mono font-bold text-white text-xs">{pipelineResult.postId}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-800/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Format</span>
                      <span className="font-bold text-lime-bright text-xs">{pipelineResult.targetFormat}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-800/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cannibalization</span>
                      <span className="font-bold text-emerald-400 text-xs">{pipelineResult.summary?.cannibalizationStatus}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-800/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Model</span>
                      <span className="font-mono text-cyan-300 text-[11px]">{pipelineResult.aiCreative?.model || 'Gemini 3.5'}</span>
                    </div>
                  </div>

                  {/* Primary Hook & Modernized Caption */}
                  <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-lime-bright">
                        Primary 3-Second Viral Hook:
                      </span>
                      <p className="text-xs text-white font-semibold mt-0.5">
                        "{pipelineResult.summary?.primaryViralHook}"
                      </p>
                    </div>

                    {pipelineResult.aiCreative?.modernizedCaption && (
                      <div className="pt-3 border-t border-slate-850">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Modernized 2026 Caption:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(pipelineResult.aiCreative.modernizedCaption)}
                            className="text-[11px] text-lime-bright hover:text-white flex items-center gap-1 font-semibold"
                          >
                            {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copiedCaption ? 'Copied!' : 'Copy Caption'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-3 bg-charcoal-900/60 p-2.5 rounded-xl border border-slate-850">
                          {pipelineResult.aiCreative.modernizedCaption}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step-by-Step Multi-Agent Execution Trace */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-lime-bright" />
                    Multi-Agent Execution Trace ({pipelineResult.executionTrace?.length} Steps)
                  </h4>

                  <div className="space-y-3">
                    {pipelineResult.executionTrace?.map((step, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-2xl bg-charcoal-900 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-lime-muted text-lime-bright font-mono font-bold text-[10px] flex items-center justify-center border border-lime-500/30">
                              {step.step}
                            </span>
                            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                              {step.agent}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              • {step.role}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-lime-bright bg-charcoal-950 px-2 py-0.5 rounded border border-slate-800">
                            Tool: {step.action}
                          </span>
                        </div>

                        {/* Agent Thought */}
                        <div className="p-2.5 rounded-xl bg-charcoal-950/70 border border-slate-850 text-slate-300 text-[11px] leading-relaxed">
                          <strong className="text-slate-400">Thought: </strong>
                          {step.thought}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AGENT COPILOT CHAT */}
      {activeTab === 'chat' && (
        <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-lime-muted text-lime-bright border border-lime-500/30 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Interactive LangChain Agent Copilot
                </h3>
                <p className="text-xs text-slate-400">
                  Ask open-ended questions about your library, fatigue risks, viral hooks, or scheduling.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-bright animate-ping" />
              <span className="text-xs font-mono text-lime-bright font-semibold">Gemini + LangChain Live</span>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              'Audit post SYNTH_POST_001 and show explainability score',
              'What are my top 3 evergreen posts to recycle?',
              'Check if writing about JavaScript Event Loop causes cannibalization',
              'Generate 3 viral hooks for my next Reel',
              'Schedule SYNTH_POST_001 for next Friday',
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={chatLoading}
                className="text-[11px] py-1.5 px-3 rounded-xl bg-charcoal-950 hover:bg-charcoal-800 text-slate-300 hover:text-white border border-slate-800 hover:border-lime-500/40 transition-all text-left"
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto p-4 rounded-2xl bg-charcoal-950 border border-slate-800/80">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-7 h-7 rounded-xl bg-lime-muted text-lime-bright border border-lime-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl rounded-2xl p-4 space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-lime-accent text-charcoal-950 font-medium'
                    : 'bg-charcoal-900 border border-slate-800 text-slate-200'
                }`}>
                  {/* Thought & Tools Accordion for Agent */}
                  {msg.sender === 'agent' && (msg.thoughts?.length > 0 || msg.tools?.length > 0) && (
                    <div className="p-2.5 rounded-xl bg-charcoal-950 border border-slate-800 text-[11px] space-y-1 text-slate-400 font-mono">
                      {msg.thoughts?.map((t, ti) => (
                        <p key={ti}>💭 {t}</p>
                      ))}
                      {msg.tools?.map((tl, tli) => (
                        <p key={tli} className="text-lime-bright">🛠️ Tool Executed: {tl.tool}</p>
                      ))}
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-3 justify-start text-xs">
                <div className="w-7 h-7 rounded-xl bg-lime-muted text-lime-bright border border-lime-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="p-3.5 rounded-2xl bg-charcoal-900 border border-slate-800 text-slate-400 flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-lime-bright" />
                  <span>Agent is reasoning and executing tools...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask the LangChain Swarm (e.g. 'Audit SYNTH_POST_001 or find evergreen posts')..."
              className="flex-1 bg-charcoal-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-bright"
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMsg.trim()}
              className="py-3 px-5 rounded-2xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: LANGCHAIN TOOLS REGISTRY */}
      {activeTab === 'tools' && (
        <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-lime-bright" />
              Registered LangChain Tools ({toolsList.length || 7})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All tools are implemented using <code>@langchain/core/tools</code> with strict Zod parameter validation schemas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toolsList.map((tool, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-3 hover:border-lime-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-lime-bright bg-lime-muted px-2.5 py-1 rounded-lg border border-lime-500/30">
                    {tool.name}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    DynamicStructuredTool
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {tool.description}
                </p>

                {tool.schema?.length > 0 && (
                  <div className="pt-2 border-t border-slate-850">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Input Schema (Zod):
                    </span>
                    <div className="space-y-1">
                      {tool.schema.map((p, pi) => (
                        <div key={pi} className="text-[11px] font-mono text-slate-400">
                          <span className="text-cyan-300">{p.parameter}</span>: {p.description || 'string'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
