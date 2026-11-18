import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import LoginDialog from '@/components/nodeflow/LoginDialog.jsx';
import {
  Workflow,
  Send,
  Play,
  Trash2,
  Bot,
  User,
  ArrowRight,
  TerminalSquare,
  Palette,
  Type,
  Filter,
  Clock,
  ListChecks,
  LogIn,
  LogOut,
} from 'lucide-react';
import { NodeFlowEngine } from '@/lib/NodeFlowEngine.js';
import pb from '@/lib/pocketbaseClient.js';
import { useWorkflow } from '@/hooks/useWorkflow.js';
import { toast } from 'sonner';

const NODE_META = {
  log: { icon: TerminalSquare, color: 'text-primary', label: 'Log' },
  color: { icon: Palette, color: 'text-[#10b981]', label: 'Color' },
  transform: { icon: Type, color: 'text-blue-500', label: 'Transform' },
  filter: { icon: Filter, color: 'text-orange-500', label: 'Filter' },
  delay: { icon: Clock, color: 'text-purple-500', label: 'Delay' },
};

const WELCOME = {
  role: 'assistant',
  text:
    "Hi! I'm your AI automation assistant. Just describe what you want in plain English and I'll build it.\n\n" +
    'Try things like:\n' +
    '• "I want a step that logs the message Hello world"\n' +
    '• "Make the text color green"\n' +
    '• "Convert everything to uppercase"\n' +
    '• "Add a 2 second pause"\n' +
    '• "Connect all steps and run it"\n' +
    '• "Save this as My Flow"\n' +
    '• "Load My Flow" / "List my saved flows"\n' +
    '• "Run My Flow" — load a saved flow and execute it\n' +
    '• "Open in editor" — send the current flow to the canvas',
};

const STORAGE_KEY = 'nf_chat_state_v1';
const HANDOFF_KEY = 'nf_editor_handoff_v1';

function getSessionId() {
  const key = 'nf_chat_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

function summarizeNode(node) {
  switch (node.type) {
    case 'log':
      return `"${node.config?.message || ''}"`;
    case 'color':
      return `${node.config?.target || 'text'} → ${node.config?.color || ''}`;
    case 'transform': {
      const op = node.config?.operation || 'uppercase';
      const v = node.config?.value;
      return v ? `${op} "${v}"` : op;
    }
    case 'filter':
      return `contains "${node.config?.condition || ''}"`;
    case 'delay':
      return `${node.config?.milliseconds || 1000}ms`;
    default:
      return '';
  }
}

const ChatPage = () => {
  const initial = loadState();
  const [messages, setMessages] = useState(initial?.messages || [WELCOME]);
  const [workflow, setWorkflow] = useState(
    initial?.workflow || { nodes: [], connections: [] }
  );
  const [executionLog, setExecutionLog] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [running, setRunning] = useState(false);
  const [isAuthed, setIsAuthed] = useState(pb.authStore.isValid);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingAfterLogin, setPendingAfterLogin] = useState(null);

  const navigate = useNavigate();
  const { saveFlow, loadFlows } = useWorkflow();

  const scrollRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    return pb.authStore.onChange((_token, model) => {
      setIsAuthed(!!model);
    });
  }, []);

  useEffect(() => {
    saveState({ messages, workflow });
  }, [messages, workflow]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionLog]);

  const appendAssistant = (text) => {
    setMessages((m) => [...m, { role: 'assistant', text }]);
  };

  const requireAuth = (pendingAction) => {
    if (pb.authStore.isValid) return true;
    setPendingAfterLogin(pendingAction);
    setLoginOpen(true);
    appendAssistant("You need to log in first so I can save and load your flows. I'll open the login window now.");
    return false;
  };

  const sendToEditor = (wf) => {
    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ workflow: wf, source: 'chat', ts: Date.now() })
      );
    } catch {
      /* noop */
    }
    navigate('/nodeflow');
  };

  const doSave = async (name, wf) => {
    try {
      const saved = await saveFlow(name, wf.nodes, wf.connections, false);
      toast.success(`Saved "${name}"`);
      appendAssistant(
        `Saved "${name}" to your workspace. You can say "load ${name}" later to bring it back, or "open in editor" to see it on the canvas now.`
      );
      return saved;
    } catch (err) {
      toast.error('Failed to save');
      appendAssistant(`Sorry, I could not save: ${err.message}`);
      return null;
    }
  };

  const doLoad = async (name) => {
    try {
      const all = await loadFlows();
      if (!all.length) {
        appendAssistant("You don't have any saved flows yet.");
        return null;
      }
      const target = (name || '').trim().toLowerCase();
      const match =
        all.find((f) => (f.flowName || f.name || '').toLowerCase() === target) ||
        all.find((f) => (f.flowName || f.name || '').toLowerCase().includes(target));

      if (!match) {
        const list = all
          .slice(0, 8)
          .map((f, i) => `  ${i + 1}. ${f.flowName || f.name}`)
          .join('\n');
        appendAssistant(
          `I could not find a flow called "${name}". Here is what you have saved:\n${list}`
        );
        return null;
      }

      const restored = {
        nodes: Array.isArray(match.nodes) ? match.nodes : [],
        connections: Array.isArray(match.connections) ? match.connections : [],
      };
      setWorkflow(restored);
      setExecutionLog([]);
      toast.success(`Restored "${match.flowName || match.name}"`);
      appendAssistant(
        `Restored "${match.flowName || match.name}" with ${restored.nodes.length} step${
          restored.nodes.length === 1 ? '' : 's'
        }. Say "open in editor" to view it on the canvas, or "run it" to execute.`
      );
      return restored;
    } catch (err) {
      toast.error('Failed to load');
      appendAssistant(`Sorry, I could not load that: ${err.message}`);
      return null;
    }
  };

  const doList = async () => {
    try {
      const all = await loadFlows();
      if (!all.length) {
        appendAssistant("You don't have any saved flows yet. Build one and say \"save it as <name>\".");
        return;
      }
      const lines = all
        .slice(0, 20)
        .map((f, i) => {
          const when = new Date(f.timestamp || f.created).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          const count = Array.isArray(f.nodes) ? f.nodes.length : 0;
          return `  ${i + 1}. ${f.flowName || f.name} — ${count} step${count === 1 ? '' : 's'} · ${when}`;
        })
        .join('\n');
      appendAssistant(`Your saved flows:\n${lines}\n\nSay "load <name>" to restore one.`);
    } catch (err) {
      appendAssistant(`Sorry, I could not load your flows: ${err.message}`);
    }
  };

  const handleAction = async (action, params, nextWorkflow) => {
    if (action === 'run') {
      await runWorkflow(nextWorkflow);
      return;
    }
    if (action === 'openEditor') {
      sendToEditor(nextWorkflow);
      return;
    }
    if (action === 'save') {
      if (!requireAuth({ kind: 'save', name: params?.name, workflow: nextWorkflow })) return;
      await doSave(params.name, nextWorkflow);
      return;
    }
    if (action === 'load') {
      if (!requireAuth({ kind: 'load', name: params?.name })) return;
      await doLoad(params.name);
      return;
    }
    if (action === 'runSaved') {
      if (!requireAuth({ kind: 'runSaved', name: params?.name })) return;
      const restored = await doLoad(params.name);
      if (restored && restored.nodes.length) {
        await runWorkflow(restored);
      }
      return;
    }
    if (action === 'list') {
      if (!requireAuth({ kind: 'list' })) return;
      await doList();
    }
  };

  const handleLoginSuccess = async () => {
    setIsAuthed(true);
    const p = pendingAfterLogin;
    setPendingAfterLogin(null);
    if (!p) return;
    if (p.kind === 'save') await doSave(p.name, p.workflow);
    else if (p.kind === 'load') await doLoad(p.name);
    else if (p.kind === 'runSaved') {
      const restored = await doLoad(p.name);
      if (restored && restored.nodes.length) await runWorkflow(restored);
    }
    else if (p.kind === 'list') await doList();
  };

  const runWorkflow = async (nextWorkflow) => {
    const wf = nextWorkflow || workflow;
    if (!wf.nodes.length) {
      toast.error('Add some steps first');
      return;
    }
    setRunning(true);
    setExecutionLog([]);
    try {
      const engine = new NodeFlowEngine(wf.nodes, wf.connections);
      const log = await engine.run();
      setExecutionLog(log);
      const summary = log
        .filter((l) => l.type !== 'info' || /completed|stopped/i.test(l.message))
        .slice(-3)
        .map((l) => `• ${l.message}`)
        .join('\n');
      appendAssistant(
        `Done. ${log.length} step${log.length === 1 ? '' : 's'} executed.${summary ? `\n${summary}` : ''}`
      );
    } catch (err) {
      toast.error('Workflow failed');
      appendAssistant(`Something went wrong while running: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, workflow, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Request failed');

      const nextWorkflow = data.workflow || workflow;
      setWorkflow(nextWorkflow);
      appendAssistant(data.reply || '...');

      if (data.action) {
        await handleAction(data.action, data.params, nextWorkflow);
      }
    } catch (err) {
      appendAssistant(`Sorry, something went wrong: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm('Clear the conversation and the workflow?')) return;
    setMessages([WELCOME]);
    setWorkflow({ nodes: [], connections: [] });
    setExecutionLog([]);
  };

  const suggestions = [
    'Log the message Hello world',
    'Make the text green',
    'Convert everything to uppercase',
    'Wait 2 seconds',
    'Connect all steps and run it',
    'Save this as My Flow',
    'List my saved flows',
    'Run My Flow',
    'Open in editor',
  ];

  return (
    <>
      <Helmet>
        <title>Chat builder - NodeFlow</title>
        <meta name="description" content="Build automation workflows by chatting with an AI assistant." />
      </Helmet>

      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <header className="bg-[hsl(var(--node-bg))] border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Workflow className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">NodeFlow Chat</h1>
              <p className="text-xs text-muted-foreground">Build automations by talking</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-card hover:bg-muted"
              onClick={() => sendToEditor(workflow)}
              disabled={!workflow.nodes.length}
              title="Send the current workflow to the visual editor"
            >
              Open in editor
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => runWorkflow()}
              disabled={running || !workflow.nodes.length}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4 mr-2" />
              {running ? 'Running…' : 'Run'}
            </Button>
            {isAuthed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  pb.authStore.clear();
                  toast.success('Logged out');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLoginOpen(true)}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClear} title="Clear chat">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat panel */}
          <section className="flex-1 flex flex-col border-r border-border min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {sending && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-[hsl(var(--node-bg))] px-6 py-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-card hover:bg-muted border border-border text-foreground transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell me what your automation should do…"
                  disabled={sending}
                  className="bg-background text-foreground"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </section>

          {/* Right side — workflow + log */}
          <aside className="w-[26rem] flex flex-col bg-card">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Workflow</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {workflow.nodes.length} step{workflow.nodes.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {workflow.nodes.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
                  No steps yet.
                  <br />
                  Tell the assistant what to do.
                </div>
              ) : (
                workflow.nodes.map((node, idx) => {
                  const meta = NODE_META[node.type] || NODE_META.log;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={node.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
                    >
                      <div className="text-xs font-mono text-muted-foreground w-5 text-right">
                        {idx + 1}.
                      </div>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{meta.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {summarizeNode(node)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border">
              <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
                <TerminalSquare className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Execution log</h2>
                {executionLog.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExecutionLog([])}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div
                ref={logRef}
                className="px-5 py-3 max-h-56 min-h-[8rem] overflow-y-auto bg-background/40 font-mono text-xs space-y-1"
              >
                {executionLog.length === 0 ? (
                  <div className="text-muted-foreground">Waiting for execution…</div>
                ) : (
                  executionLog.map((l, i) => (
                    <div
                      key={i}
                      style={l.style || undefined}
                      className={
                        l.type === 'error'
                          ? 'text-red-500'
                          : l.type === 'warning'
                          ? 'text-amber-500'
                          : l.type === 'success'
                          ? 'text-green-500'
                          : 'text-foreground'
                      }
                    >
                      {l.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        <LoginDialog
          open={loginOpen}
          onOpenChange={setLoginOpen}
          onSuccess={handleLoginSuccess}
        />
      </div>
    </>
  );
};

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary/15 text-primary'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border text-foreground rounded-tl-sm'
        }`}
      >
        {message.text}
      </div>
    </div>
  );
};

export default ChatPage;
