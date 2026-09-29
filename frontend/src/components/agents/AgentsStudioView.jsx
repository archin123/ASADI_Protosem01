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
  Zap,
  Scale,
  ThumbsUp,
  ThumbsDown,
  Award,
  Lightbulb,
  Activity
} from 'lucide-react';
import { agentAPI, postsAPI } from '../../services/api';
import { RecommendationBadge, MediaTypeBadge } from '../common/Badge';

export default function AgentsStudioView({ onNavigate, onOpenScoreModal }) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'judge' | 'chat' | 'tools'
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

  // Judge Agent Arena state
  const [judgePostId, setJudgePostId] = useState('SYNTH_POST_001');
  const [judgeCustomCaption, setJudgeCustomCaption] = useState('');
  const [judgeHook, setJudgeHook] = useState('');
  const [judgeFormat, setJudgeFormat] = useState('REEL');
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeResult, setJudgeResult] = useState(null);
  const [judgeError, setJudgeError] = useState(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'agent',
      text: `### 🤖 Welcome to the LangChain Multi-Agent Swarm

I am your autonomous **Instagram Content Recycling Agent Team** powered by **LangChain.js** and **Google Gemini AI**.

Our active swarm consists of 5 specialized agents:
* 🔍 **Auditor Agent**: Analyzes historical metrics, Z-Scores, and decay curves.
* 🧠 **Strategist Agent**: Evaluates format transitions and runs TF-IDF cannibalization checks.
* 🎨 **Creative Agent**: Crafts 3-second viral hooks and 2026 captions via Gemini.
* ⚖️ **Judge Agent**: Strict editorial rubric scoring (Hook retention, evergreen value) and formal production verdicts.
* 📅 **Planner Agent**: Schedules approved content into your editorial calendar.

How can our team assist your content recycling strategy today?`,
      thoughts: ['Swarm initialized with 5 autonomous agents and 8 LangChain tools.'],
      tools: [],
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Copy state
  const [copiedCaption, setCopiedCaption] = useState(false);

  // LangSmith Traces state
  const [traces, setTraces] = useState([]);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [selectedTraceDetail, setSelectedTraceDetail] = useState(null);

  useEffect(() => {
    loadInitialData();
    loadTraces();
  }, []);

  const loadTraces = async () => {
    setTracesLoading(true);
    try {
      const res = await agentAPI.getTraces({ limit: 15 });
      if (res.data?.traces) {
        setTraces(res.data.traces);
        if (res.data.traces.length > 0) {
          setSelectedTraceDetail(prev => prev || res.data.traces[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setTracesLoading(false);
    }
  };

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

  // Run the 5-agent autonomous pipeline
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

  // Run the standalone Judge Agent
  const handleRunJudge = async () => {
    setJudgeLoading(true);
    setJudgeError(null);
    try {
      const selectedPost = posts.find(p => (p.originalId || p._id) === judgePostId);
      const res = await agentAPI.judge({
        postId: judgePostId !== 'custom' ? judgePostId : undefined,
        caption: judgePostId === 'custom' ? judgeCustomCaption : (selectedPost?.caption || judgeCustomCaption),
        hook: judgeHook,
        targetFormat: judgeFormat,
      });

      if (res.data?.success) {
        setJudgeResult(res.data);
      } else {
        setJudgeError(res.data?.message || 'Judge evaluation failed.');
      }
    } catch (err) {
      console.error('Judge error:', err);
      setJudgeError(err.response?.data?.message || err.message || 'Evaluation error');
    } finally {
      setJudgeLoading(false);
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
    judge: Scale,
    planner: Calendar,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 relative overflow-hidden shadow-card">
        <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-lime-muted text-lime-bright border border-lime-500/30">
                <Cpu className="w-3.5 h-3.5" />
                LangChain.js Multi-Agent Swarm
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-charcoal-800 text-slate-300 border border-slate-700">
                <Zap className="w-3 h-3 text-amber-400" />
                Gemini Flash
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-charcoal-800 text-slate-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-bold">LangSmith</span>: {swarmStatus?.langsmith?.project || 'content-recycler'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              AI Agents Studio
              <span className="text-xs font-mono font-normal text-slate-400 bg-charcoal-800 px-2 py-0.5 rounded-lg border border-slate-700">
                Autonomous Swarm + Judge Agent
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Five autonomous agents working in orchestrated LangChain pipeline: Performance Auditing, TF-IDF Cannibalization Checking, Viral Hook Generation, Editorial Quality Judging, and Calendar Planning.
            </p>
          </div>

          {/* Quick Roster Indicator */}
          <div className="flex items-center gap-2 bg-charcoal-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-lime-muted text-lime-bright flex items-center justify-center font-bold text-[10px]" title="Auditor">
                AUD
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-[10px]" title="Strategist">
                STR
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-amber-950 text-amber-300 flex items-center justify-center font-bold text-[10px]" title="Creative">
                CRE
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-purple-950 text-purple-300 flex items-center justify-center font-bold text-[10px]" title="Judge">
                JDG
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-charcoal-900 bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-[10px]" title="Planner">
                PLN
              </div>
            </div>
            <div className="ml-2 pr-2">
              <p className="font-bold text-slate-200">5 Active Agents</p>
              <p className="text-[11px] text-lime-bright flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-bright animate-pulse" />
                8 LangChain Tools Ready
              </p>
            </div>
          </div>
        </div>

        {/* 5 Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          {(swarmStatus?.registeredAgents || [
            { id: 'auditor', name: 'Auditor Agent', role: 'Performance & Decay Analyst', capabilities: ['Z-Scores', 'Evergreen index'] },
            { id: 'strategist', name: 'Strategist Agent', role: 'Retention & Cannibalization', capabilities: ['TF-IDF Overlap', 'Format mapping'] },
            { id: 'creative', name: 'Creative Agent', role: 'Viral Hook & 2026 Scriptwriter', capabilities: ['3-Sec Hooks', 'Gemini AI'] },
            { id: 'judge', name: 'Judge Agent', role: 'Chief Quality & Editorial Judge', capabilities: ['Rubric Scoring', 'Pass/Revise Verdict'] },
            { id: 'planner', name: 'Planner Agent', role: 'Calendar Editorial Scheduler', capabilities: ['Slot optimization', 'Planner sync'] },
          ]).map((agent) => {
            const Icon = agentIcons[agent.id] || Bot;
            const isJudge = agent.id === 'judge';
            return (
              <div 
                key={agent.id}
                className={`p-3.5 rounded-2xl bg-charcoal-850/80 border transition-all group ${
                  isJudge ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800 hover:border-lime-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform ${
                    isJudge 
                      ? 'bg-purple-900/60 text-purple-300 border-purple-500/40' 
                      : 'bg-charcoal-800 border-slate-700 text-lime-bright'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isJudge
                      ? 'bg-purple-900/40 text-purple-300 border-purple-500/30'
                      : 'bg-lime-muted text-lime-bright border-lime-500/20'
                  }`}>
                    Online
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  {agent.name}
                  {isJudge && <span className="text-[8px] bg-purple-500/30 text-purple-200 px-1 rounded">New</span>}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{agent.role}</p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {agent.capabilities?.slice(0, 2).map((c, i) => (
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
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-charcoal-900 border border-slate-800 rounded-2xl w-fit">
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
          onClick={() => setActiveTab('judge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'judge'
              ? 'bg-purple-400 text-charcoal-950 shadow-glow-subtle font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-purple-400 group-hover:text-white" />
          Judge & Critique Arena
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
          LangChain Tools ({toolsList.length || 8})
        </button>

        <button
          onClick={() => { setActiveTab('traces'); loadTraces(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'traces'
              ? 'bg-emerald-400 text-charcoal-950 shadow-glow-subtle font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          LangSmith Traces ({traces.length || swarmStatus?.langsmith?.recentTracesCount || 0})
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
                  5-Agent Swarm Pipeline
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Executes Auditor, Strategist, Creative, <strong>Judge</strong>, and Planner agents in sequence.
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
                    Executing 5-Agent Swarm...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-charcoal-950" />
                    Launch 5-Agent Swarm Pipeline
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
                  <h3 className="text-base font-bold text-white">Autonomous Swarm Ready</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Select a target post or leave on auto-discover, then click <strong>"Launch 5-Agent Swarm Pipeline"</strong>. The Judge Agent will review and score the draft before calendar commitment.
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
                    <p className="text-xs text-slate-400">Auditor, Strategist, Creative, Judge, and Planner are collaborating...</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-10 bg-charcoal-800 rounded-xl" />
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
                          Recycled asset approved by <strong>Judge Agent</strong> & scheduled for <strong>{pipelineResult.plannedDate}</strong>
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

                  {/* Summary Metric Row with Judge Verdict */}
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
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Judge's Verdict</span>
                      <span className={`font-bold text-xs flex items-center gap-1 ${
                        pipelineResult.summary?.judgeVerdict === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <Scale className="w-3 h-3" />
                        {pipelineResult.summary?.judgeVerdict || 'APPROVED'} ({pipelineResult.summary?.qualityIndex || 85}/100)
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-800/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cannibalization</span>
                      <span className="font-bold text-cyan-300 text-xs">{pipelineResult.summary?.cannibalizationStatus}</span>
                    </div>
                  </div>

                  {/* Judge Remarks Card */}
                  {pipelineResult.summary?.judgeRemarks && (
                    <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" />
                        Judge Agent Critique:
                      </span>
                      <p className="text-slate-300 text-xs italic">
                        "{pipelineResult.summary.judgeRemarks}"
                      </p>
                    </div>
                  )}

                  {/* LangSmith Trace Observability Bar */}
                  {pipelineResult.langsmith && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-charcoal-950 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-mono text-slate-300">
                          LangSmith Run: <strong className="text-white">{pipelineResult.langsmith.runId}</strong>
                        </span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                          {pipelineResult.langsmith.project}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setActiveTab('traces'); loadTraces(); }}
                          className="px-2.5 py-1 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-all flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                          View Full Trace Spans
                        </button>
                        <a
                          href={pipelineResult.langsmith.cloudUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all"
                        >
                          <span>LangSmith Cloud</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Primary Hook & Modernized Caption */}
                  <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-lime-bright">
                        Approved 3-Second Viral Hook:
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
                    {pipelineResult.executionTrace?.map((step, idx) => {
                      const isJudge = step.agent === 'Judge Agent';
                      return (
                        <div 
                          key={idx}
                          className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                            isJudge 
                              ? 'bg-purple-950/20 border-purple-500/40 shadow-glow-subtle' 
                              : 'bg-charcoal-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full font-mono font-bold text-[10px] flex items-center justify-center border ${
                                isJudge 
                                  ? 'bg-purple-900 text-purple-200 border-purple-500/40' 
                                  : 'bg-lime-muted text-lime-bright border-lime-500/30'
                              }`}>
                                {step.step}
                              </span>
                              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                {step.agent}
                                {isJudge && <Scale className="w-3 h-3 text-purple-300" />}
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
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: JUDGE & CRITIQUE ARENA */}
      {activeTab === 'judge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Judge Input Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-charcoal-900 border border-purple-500/30 space-y-5 shadow-card">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-900/50 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Judge & Editorial Critique Arena
                  </h3>
                  <p className="text-xs text-slate-400">
                    Submit any post or hook to the Judge Agent for harsh rubric grading.
                  </p>
                </div>
              </div>

              {/* Post Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Post to Judge</label>
                <select
                  value={judgePostId}
                  onChange={(e) => setJudgePostId(e.target.value)}
                  className="w-full bg-charcoal-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="custom">✍️ Evaluate Custom Draft / Text Below</option>
                  {posts.map((p) => (
                    <option key={p.originalId || p._id} value={p.originalId || p._id}>
                      [{p.originalId || p._id}] ({p.mediaType}) - {p.caption?.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Caption textarea if custom selected */}
              {judgePostId === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Draft Caption Copy</label>
                  <textarea
                    value={judgeCustomCaption}
                    onChange={(e) => setJudgeCustomCaption(e.target.value)}
                    placeholder="Enter the caption draft to critique..."
                    rows={3}
                    className="w-full bg-charcoal-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>
              )}

              {/* Proposed Hook */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Proposed 3-Second Opening Hook</label>
                <input
                  type="text"
                  value={judgeHook}
                  onChange={(e) => setJudgeHook(e.target.value)}
                  placeholder="e.g. Stop writing nested callbacks in 2026..."
                  className="w-full bg-charcoal-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Target Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Evaluation Target Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {['REEL', 'CAROUSEL', 'IMAGE', 'STORY'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setJudgeFormat(fmt)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                        judgeFormat === fmt
                          ? 'bg-purple-900/60 text-purple-200 border-purple-500/50 shadow-glow-subtle'
                          : 'bg-charcoal-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleRunJudge}
                disabled={judgeLoading}
                className="w-full py-3 px-4 rounded-2xl bg-purple-500 hover:bg-purple-400 text-charcoal-950 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-glow-subtle disabled:opacity-50"
              >
                {judgeLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Judge Agent Evaluating...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    Deliver Editorial Verdict
                  </>
                )}
              </button>

              {judgeError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{judgeError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Judge Output Column */}
          <div className="lg:col-span-7 space-y-6">
            {!judgeResult && !judgeLoading && (
              <div className="p-12 rounded-3xl bg-charcoal-900 border border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-charcoal-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <Scale className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Judge Agent Ready</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Select a post or enter custom hook copy, then click <strong>"Deliver Editorial Verdict"</strong> to generate a multi-point critique and official quality pass/revision scorecard.
                  </p>
                </div>
              </div>
            )}

            {judgeLoading && (
              <div className="p-8 rounded-3xl bg-charcoal-900 border border-purple-500/30 space-y-6 animate-pulse">
                <div className="flex items-center gap-3">
                  <RotateCw className="w-5 h-5 text-purple-400 animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Judge Agent Deliberating</h3>
                    <p className="text-xs text-slate-400">Scoring hook retention, evergreen durability, and viral shareability...</p>
                  </div>
                </div>
                <div className="h-32 bg-charcoal-800 rounded-2xl" />
              </div>
            )}

            {judgeResult && (
              <div className="p-6 rounded-3xl bg-charcoal-900 border border-purple-500/40 space-y-6 shadow-card animate-in fade-in duration-300">
                {/* Official Verdict Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold block mb-1">
                      Official Editorial Scorecard
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase border flex items-center gap-1.5 ${
                        judgeResult.evaluation?.verdict === 'APPROVED'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-glow-subtle'
                          : (judgeResult.evaluation?.verdict === 'NEEDS_REVISION'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            : 'bg-red-950/60 text-red-300 border-red-500/40')
                      }`}>
                        {judgeResult.evaluation?.verdict === 'APPROVED' && <ThumbsUp className="w-3.5 h-3.5" />}
                        {judgeResult.evaluation?.verdict === 'NEEDS_REVISION' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {judgeResult.evaluation?.verdict === 'REJECTED' && <ThumbsDown className="w-3.5 h-3.5" />}
                        {judgeResult.evaluation?.verdict || 'APPROVED'}
                      </span>

                      <span className="text-xs text-slate-400">
                        Target: <strong className="text-white">{judgeResult.targetFormat}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Quality Index Circle */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quality Index</span>
                    <span className="text-2xl font-black text-purple-300 font-mono">
                      {judgeResult.evaluation?.scores?.compositeScore || 85}
                      <span className="text-xs text-slate-500">/100</span>
                    </span>
                  </div>
                </div>

                {/* 4 Rubric Metric Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Hook Retention (First 3s)', score: judgeResult.evaluation?.scores?.hookRetention || 82, weight: '35%' },
                    { label: 'Evergreen Durability', score: judgeResult.evaluation?.scores?.evergreenDurability || 90, weight: '25%' },
                    { label: 'Viral Shareability & Saves', score: judgeResult.evaluation?.scores?.viralShareability || 80, weight: '25%' },
                    { label: 'Format Optimization', score: judgeResult.evaluation?.scores?.formatOptimization || 85, weight: '15%' },
                  ].map((rubric, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{rubric.label}</span>
                        <span className="font-mono font-bold text-white">{rubric.score}%</span>
                      </div>
                      <div className="w-full bg-charcoal-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${rubric.score}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono block text-right">Rubric Weight: {rubric.weight}</span>
                    </div>
                  ))}
                </div>

                {/* Judge Remarks */}
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Judge's Editorial Deliberation:
                  </span>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    "{judgeResult.evaluation?.judgeRemarks}"
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Key Strengths
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {judgeResult.evaluation?.strengths?.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Areas for Polish
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {judgeResult.evaluation?.weaknesses?.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Action CTA */}
                {judgeResult.evaluation?.recommendedAction && (
                  <div className="p-3.5 rounded-2xl bg-charcoal-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recommended Action:</span>
                      <p className="text-slate-200 font-medium">{judgeResult.evaluation.recommendedAction}</p>
                    </div>
                    <button
                      onClick={() => onNavigate && onNavigate('planner')}
                      className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-charcoal-950 font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span>Proceed to Planner</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AGENT COPILOT CHAT */}
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
                  Ask open-ended questions about your library, fatigue risks, viral hooks, judge critique, or scheduling.
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
              'Judge post SYNTH_POST_001 and deliver official verdict',
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
              placeholder="Ask the LangChain Swarm (e.g. 'Judge SYNTH_POST_001 or find evergreen posts')..."
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

      {/* TAB 4: LANGCHAIN TOOLS REGISTRY */}
      {activeTab === 'tools' && (
        <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-lime-bright" />
              Registered LangChain Tools ({toolsList.length || 8})
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

      {/* TAB 5: LANGSMITH OBSERVABILITY & TRACE EXPLORER */}
      {activeTab === 'traces' && (
        <div className="space-y-6">
          {/* LangSmith Telemetry Overview */}
          <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LangSmith Observability Engine
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-charcoal-800 px-2 py-0.5 rounded border border-slate-700">
                    SDK: langsmith + @langchain/core
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Live Agent & LLM Execution Traces
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Every multi-agent pipeline run, standalone Judge critique, and interactive copilot session is captured into LangSmith trace spans for latency, token, and prompt telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadTraces}
                  disabled={tracesLoading}
                  className="px-3.5 py-2 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-lime-bright ${tracesLoading ? 'animate-spin' : ''}`} />
                  Refresh Traces
                </button>
                <a
                  href={swarmStatus?.langsmith?.cloudDashboardUrl || `https://smith.langchain.com/o/default/projects/p/content-recycler`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all flex items-center gap-1.5"
                >
                  <span>LangSmith Cloud</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Config & Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Active Project</span>
                <span className="font-mono font-bold text-white text-xs">{swarmStatus?.langsmith?.project || 'content-recycler'}</span>
                <span className="text-[10px] text-emerald-400 block">Tracing Active</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Endpoint</span>
                <span className="font-mono text-slate-300 text-xs truncate block">{swarmStatus?.langsmith?.endpoint || 'https://api.smith.langchain.com'}</span>
                <span className="text-[10px] text-slate-500 block">REST v1/runs</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Cloud Sync Status</span>
                <span className={`font-bold text-xs flex items-center gap-1.5 ${swarmStatus?.langsmith?.hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${swarmStatus?.langsmith?.hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {swarmStatus?.langsmith?.hasApiKey ? 'Cloud Connected' : 'Local Tracing (Ready for Key)'}
                </span>
                <span className="text-[10px] text-slate-500 truncate block">{swarmStatus?.langsmith?.apiKeyMasked || 'LANGCHAIN_API_KEY in .env'}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-charcoal-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Traces In Memory</span>
                <span className="font-mono font-bold text-lime-bright text-xs">{traces.length} Runs Recorded</span>
                <span className="text-[10px] text-slate-500 block">Full Hierarchy Saved</span>
              </div>
            </div>
          </div>

          {/* Traces List & Detail Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Trace Runs List */}
            <div className="lg:col-span-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Recent Traced Runs ({traces.length})</span>
                {tracesLoading && <span className="text-lime-bright text-[11px] font-normal">Loading...</span>}
              </h4>

              {traces.length === 0 ? (
                <div className="p-8 rounded-2xl bg-charcoal-900 border border-slate-800 text-center space-y-3">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No traces recorded in this session yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pipeline')}
                    className="px-4 py-2 rounded-xl bg-lime-accent text-charcoal-950 text-xs font-bold"
                  >
                    Run Multi-Agent Pipeline to Generate Trace
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {traces.map((tr) => {
                    const isSelected = selectedTraceDetail?.id === tr.id;
                    return (
                      <div
                        key={tr.id}
                        onClick={() => setSelectedTraceDetail(tr)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-charcoal-850 border-emerald-500/50 shadow-glow-subtle'
                            : 'bg-charcoal-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {tr.name}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                            {tr.durationMs}ms
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Agent: {tr.agent}</span>
                          <span>{new Date(tr.timestamp).toLocaleTimeString()}</span>
                        </div>

                        {tr.inputs?.postId && (
                          <div className="text-[11px] text-slate-300">
                            Target Post: <strong className="text-lime-bright">{tr.inputs.postId}</strong> ({tr.inputs.targetFormat || 'AUTO'})
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                          <span>Run ID: {tr.id.slice(0, 16)}...</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            {tr.childRuns?.length || 0} Spans
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Selected Trace Inspector */}
            <div className="lg:col-span-7">
              {selectedTraceDetail ? (
                <div className="p-6 rounded-3xl bg-charcoal-900 border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                          {selectedTraceDetail.runType} trace
                        </span>
                        <span className="text-xs font-bold text-white">{selectedTraceDetail.name}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        Run ID: {selectedTraceDetail.id}
                      </p>
                    </div>

                    <a
                      href={selectedTraceDetail.langsmithUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-charcoal-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-bold text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                      <span>Cloud Span</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Latency & IO Metadata */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-charcoal-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Duration</span>
                      <span className="font-mono font-bold text-lime-bright text-xs">{selectedTraceDetail.durationMs}ms</span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Status</span>
                      <span className="font-bold text-emerald-400 text-xs">{selectedTraceDetail.status}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-charcoal-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Timestamp</span>
                      <span className="text-slate-300 text-xs truncate block">{new Date(selectedTraceDetail.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Child Runs / Agent Hierarchy Spans */}
                  {selectedTraceDetail.childRuns?.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-lime-bright" />
                        Execution Hierarchy ({selectedTraceDetail.childRuns.length} Nested Spans)
                      </h5>

                      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                        {selectedTraceDetail.childRuns.map((span, sIdx) => (
                          <div 
                            key={sIdx}
                            className="p-3 rounded-xl bg-charcoal-950 border border-slate-800/80 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span className="text-lime-bright font-mono">#{span.step || sIdx + 1}</span>
                                {span.agent || span.name}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                                {span.action || span.runType || 'Tool Call'}
                              </span>
                            </div>

                            {span.thought && (
                              <p className="text-[11px] text-slate-300 italic bg-charcoal-900/60 p-2 rounded-lg border border-slate-850">
                                "{span.thought}"
                              </p>
                            )}

                            {span.output?.primaryHook && (
                              <div className="text-[11px] text-emerald-300">
                                <strong>Generated Viral Hook:</strong> "{span.output.primaryHook}"
                              </div>
                            )}

                            {span.output?.verdict && (
                              <div className="text-[11px] text-purple-300">
                                <strong>Judge Verdict:</strong> {span.output.verdict} (Score: {span.output.scores?.compositeScore || 'N/A'}/100)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Outputs JSON */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Trace Outputs (Sanitized Summary)
                    </span>
                    <pre className="p-3 rounded-xl bg-charcoal-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                      {JSON.stringify(selectedTraceDetail.outputs, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-3xl bg-charcoal-900 border border-slate-800 text-center space-y-3">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Select a trace on the left to inspect its hierarchical spans and telemetry.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
