import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import LoginDialog from './LoginDialog.jsx';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  X,
  Minimize2,
} from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useWorkflow } from '@/hooks/useWorkflow.js';
import { toast } from 'sonner';

const STORAGE_KEY = 'nf_editor_chat_state_v1';

function getSessionId() {
  const key = 'nf_editor_chat_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `ec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

const WELCOME = {
  role: 'assistant',
  text:
    "Hi! I'm your AI assistant. Describe anything in plain English and I'll build or run it.\n\n" +
    'Try:\n' +
    '• "I want a log that says hello and then make the text red"\n' +
    '• "Run My Cool Flow" — load + run a saved flow on the canvas\n' +
    '• "Load My Cool Flow" — load it onto the canvas\n' +
    '• "List my saved flows"\n' +
    '• "Save this as My Flow"\n' +
    '• "Run it" — run what is on the canvas',
};

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

const SUGGESTIONS = [
  'List my saved flows',
  'Run My Flow',
  'Load My Flow',
  'Save this as My Flow',
  'Add a log that says Hello',
  'Run it',
];

const EditorChat = ({ workflow, onApplyWorkflow, onRun }) => {
  const persisted = loadState();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(persisted?.messages || [WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const { saveFlow, loadFlows } = useWorkflow();
  const scrollRef = useRef(null);

  useEffect(() => {
    saveState({ messages });
  }, [messages]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const append = (msg) => setMessages((m) => [...m, msg]);
  const appendAssistant = (text) => append({ role: 'assistant', text });

  const requireAuth = (pendingAction) => {
    if (pb.authStore.isValid) return true;
    setPending(pendingAction);
    setLoginOpen(true);
    appendAssistant("You need to log in first. I'll open the login window now.");
    return false;
  };

  const doSave = async (name, wf) => {
    try {
      await saveFlow(name, wf.nodes, wf.connections, false);
      toast.success(`Saved "${name}"`);
      appendAssistant(`Saved "${name}".`);
    } catch (err) {
      toast.error('Failed to save');
      appendAssistant(`Sorry, I could not save: ${err.message}`);
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
        appendAssistant(`I could not find "${name}". You have:\n${list}`);
        return null;
      }
      const restored = {
        nodes: Array.isArray(match.nodes) ? match.nodes : [],
        connections: Array.isArray(match.connections) ? match.connections : [],
      };
      onApplyWorkflow(restored);
      toast.success(`Restored "${match.flowName || match.name}"`);
      appendAssistant(
        `Loaded "${match.flowName || match.name}" onto the canvas (${restored.nodes.length} step${
          restored.nodes.length === 1 ? '' : 's'
        }).`
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
        appendAssistant("You have no saved flows yet.");
        return;
      }
      const lines = all
        .slice(0, 20)
        .map((f, i) => {
          const count = Array.isArray(f.nodes) ? f.nodes.length : 0;
          return `  ${i + 1}. ${f.flowName || f.name} — ${count} step${count === 1 ? '' : 's'}`;
        })
        .join('\n');
      appendAssistant(`Your saved flows:\n${lines}\n\nSay "run <name>" to run one here.`);
    } catch (err) {
      appendAssistant(`Sorry: ${err.message}`);
    }
  };

  const doRun = async (wf) => {
    if (!wf || !wf.nodes.length) {
      appendAssistant('There is nothing to run yet.');
      return;
    }
    try {
      const log = await onRun(wf);
      const tail = Array.isArray(log)
        ? log.slice(-3).map((l) => `• ${l.message}`).join('\n')
        : '';
      appendAssistant(
        `Done. ${Array.isArray(log) ? log.length : 0} step${
          Array.isArray(log) && log.length === 1 ? '' : 's'
        } executed.${tail ? `\n${tail}` : ''}`
      );
    } catch (err) {
      appendAssistant(`Run failed: ${err.message}`);
    }
  };

  const handleAction = async (action, params, nextWorkflow) => {
    if (action === 'run') {
      // The parser may have auto-connected; apply that too
      if (nextWorkflow) onApplyWorkflow(nextWorkflow);
      await doRun(nextWorkflow);
      return;
    }
    if (action === 'openEditor') {
      // Already in the editor — just apply.
      if (nextWorkflow) onApplyWorkflow(nextWorkflow);
      appendAssistant("You're already in the editor — applied to the canvas.");
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
      if (restored && restored.nodes.length) await doRun(restored);
      return;
    }
    if (action === 'list') {
      if (!requireAuth({ kind: 'list' })) return;
      await doList();
    }
  };

  const handleLoginSuccess = async () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.kind === 'save') await doSave(p.name, p.workflow);
    else if (p.kind === 'load') await doLoad(p.name);
    else if (p.kind === 'runSaved') {
      const restored = await doLoad(p.name);
      if (restored && restored.nodes.length) await doRun(restored);
    } else if (p.kind === 'list') await doList();
  };

  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    append({ role: 'user', text });
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
      // For non-action replies, sync the workflow back to the canvas (e.g. node added via chat)
      if (!data.action || data.action === 'run' || data.action === 'openEditor') {
        if (nextWorkflow) onApplyWorkflow(nextWorkflow);
      }
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

  const clearChat = () => {
    if (!window.confirm('Clear this chat?')) return;
    setMessages([WELCOME]);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open editor chat"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[22rem] h-[32rem] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-[hsl(var(--node-bg))]">
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Editor assistant</div>
          <div className="text-[11px] text-muted-foreground truncate">
            Run, load, and save flows by name
          </div>
        </div>
        <button
          type="button"
          onClick={clearChat}
          title="Clear chat"
          className="text-muted-foreground hover:text-foreground p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Minimize"
          className="text-muted-foreground hover:text-foreground p-1 rounded"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-background/40">
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {sending && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-[hsl(var(--node-bg))] px-3 py-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="text-[11px] px-2 py-1 rounded-full bg-card hover:bg-muted border border-border text-foreground transition"
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: run My Cool Flow"
            disabled={sending}
            className="bg-background text-foreground h-9 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={sending || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

const Bubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary/15 text-primary'
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap break-words ${
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

export default EditorChat;
