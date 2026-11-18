import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Provider priority:
//   1. Groq ( set GROQ_API_KEY)
//   3. OpenAI (set OPENAI_API_KEY)
console.log("GROQ KEY:", process.env.GROQ_API_KEY ? "FOUND" : "MISSING");

let openai, AI_MODEL;

let AI_TOKENS_PARAM; // different providers use different param names

if (process.env.GROQ_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  AI_TOKENS_PARAM = 'max_completion_tokens';
} else {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  AI_MODEL = 'gpt-4o-mini';
  AI_TOKENS_PARAM = 'max_tokens';
}

const SYSTEM_PROMPT = `You are NodeFlow's automation assistant — a friendly, concise AI that helps users build visual automation workflows through conversation.

## Workflow schema
A workflow has two arrays:
- nodes: each node has { id, type, position: {x, y}, config }
- connections: each connection has { id, fromNodeId, toNodeId }

## Available node types
| type      | config fields                                                             |
|-----------|---------------------------------------------------------------------------|
| log       | message (string)                                                          |
| color     | target ("text" or "background"), color (any CSS color string)             |
| transform | operation ("uppercase","lowercase","prefix","suffix","replace"), value    |
| filter    | condition (string), operator ("contains","equals","startsWith","endsWith")|
| delay     | milliseconds (number)                                                     |

## Response format — ALWAYS return pure JSON, no markdown, no code fences
{
  "steps_identified": ["step 1 description", "step 2 description", ...],
  "reply": "Your friendly, concise reply to the user (plain text, newlines ok)",
  "workflow": { "nodes": [...], "connections": [...] },
  "action": null | "run" | "save" | "load" | "list" | "runSaved" | "openEditor",
  "params": { "name": "..." }
}

IMPORTANT: Always fill in "steps_identified" first — list every distinct action the user asked for as a separate string. Then build exactly that many nodes in "workflow". This prevents accidentally missing steps.

## Rules

### Building/editing nodes
- When the user wants to add, change, or remove steps: update the workflow JSON and set action: null
- Keep ALL existing nodes unless the user says to remove or replace them
- Assign positions: x = 100 + index * 220, y = 100 + (index % 3) * 120
- Generate IDs: "node-" + a 10-digit timestamp-like number, must be unique
- If a user says "connect them" or "connect in order", fill the connections array linking each node to the next
- Auto-connect if the user says "run it" and there are unconnected nodes

### Actions
- "run it" / "execute" / "start" / "go" → action: "run"
- "save it as <name>" / "save as <name>" / "save <name>" → action: "save", params: { name }
- "load <name>" / "restore <name>" → action: "load", params: { name }
- "run <saved flow name>" (intent is to load a saved flow and run it) → action: "runSaved", params: { name }
  - Use "runSaved" only when the user clearly references an existing saved flow by name, not when asking to run the current canvas
- "list my flows" / "show saved" → action: "list"
- "open in editor" / "show on canvas" → action: "openEditor"
- For save/load/list/runSaved: set workflow to the unchanged incoming workflow

### Natural language understanding
Understand intent freely — users often phrase things informally or chain steps in one sentence.

**Single-step examples:**
- "I want a log that says hello" → add log node, message: "hello"
- "make a log, the message Hello world" → add log node, message: "Hello world"
- "make a Log with message Hello world" → add log node, message: "Hello world"
- "make the text green" / "color the text red" → add color node, target: "text"
- "make the background blue" → add color node, target: "background"
- "uppercase everything" → add transform node, operation: "uppercase"
- "wait 2 seconds" → add delay node, milliseconds: 2000
- "only let through messages containing error" → add filter node

**Multi-step in one message — CRITICAL: add ALL mentioned steps as separate nodes:**

Example: user says "make a Log the message Hello world then make the text red"
Correct output:
{
  "reply": "Added a log step and a red text color step.",
  "workflow": {
    "nodes": [
      {"id":"node-0000000001","type":"log","position":{"x":100,"y":100},"config":{"message":"Hello world"}},
      {"id":"node-0000000002","type":"color","position":{"x":320,"y":100},"config":{"target":"text","color":"red"}}
    ],
    "connections": [{"id":"conn-1","fromNodeId":"node-0000000001","toNodeId":"node-0000000002"}]
  },
  "action": null,
  "params": {}
}

Example: user says "add a log that says hello and make it green"
Correct output has TWO nodes: log (message:"hello") + color (target:"text", color:"green")

Example: user says "log Hello, uppercase it, then wait 1 second"
Correct output has THREE nodes: log + transform(uppercase) + delay(1000)

Rules:
- Whenever you see "then", "and then", "and", "and also", "after that", or a comma separating actions — add ALL of them
- Never silently drop a step. If the user mentions N actions, produce N nodes
- Auto-connect the nodes in order whenever you add multiple nodes

**Editing:**
- "clear it" / "start over" → workflow: { nodes: [], connections: [] }
- "remove the log step" → remove log nodes from workflow
- "change the delay to 3 seconds" → update delay node config

### Tone
- Be brief and friendly. 1-2 sentences per reply.
- Confirm ALL steps added: "Added a log step and a red text color step."
- For unclear requests ask one short clarifying question.
- Never say you cannot do something — suggest what you can do instead.`;

/**
 * Split a user message into explicit numbered steps when it contains chaining
 * language like "then", "and then", etc. This helps weaker models that tend to
 * only process the last instruction in a multi-step sentence.
 */
function normalizeMultiStepMessage(msg) {
  // Don't touch save/load/run/list commands — those are not multi-step node requests
  const actionKeywords = /\b(save|load|run|list|restore|open in editor)\b/i;
  if (actionKeywords.test(msg)) return msg;

  // Split on chaining words: "then", "and then", "after that", "and also", "and"
  // Only split if each part looks like an instruction (contains a verb-ish word)
  const parts = msg
    .split(/\s+(?:and\s+then|then|after\s+that|and\s+also)\s+/i)
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return msg;

  // Rewrite as explicitly numbered steps
  const numbered = parts.map((p, i) => `Step ${i + 1}: ${p}`).join('\n');
  return `The user wants ${parts.length} separate steps:\n${numbered}\n\nPlease add a node for EVERY step listed above.`;
}

export async function callAI(userMessage, workflow, conversationHistory = []) {
  const workflowSummary = JSON.stringify(workflow, null, 2);
  const normalizedMessage = normalizeMultiStepMessage(userMessage);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-8),
    {
      role: 'user',
      content: `Current workflow state:\n${workflowSummary}\n\nUser message: ${normalizedMessage}`,
    },
  ];

  const requestPayload = {
    model: AI_MODEL,
    messages,
    [AI_TOKENS_PARAM]: 2048,
    response_format: { type: 'json_object' },
  };

  let response;
  try {
    response = await openai.chat.completions.create(requestPayload);
  } catch (err) {
    console.error("GROQ ERROR STATUS:", err?.status);
    console.error("GROQ ERROR MESSAGE:", err?.message);
    console.error("GROQ ERROR BODY:", JSON.stringify(err?.error, null, 2));

    const is403 = err?.status === 403 || /403/.test(err?.message);
    if (process.env.GROQ_API_KEY && AI_MODEL !== 'llama-3.1-8b-instant' && is403) {
      console.warn('[chat] Groq 403 — retrying with llama-3.1-8b-instant');
      requestPayload.model = 'llama-3.1-8b-instant';
      response = await openai.chat.completions.create(requestPayload);
    } else {
      throw err;
    }
  }

  const raw = response.choices?.[0]?.message?.content || '{}';

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      reply: "Sorry, I had trouble understanding that. Could you rephrase?",
      workflow,
      action: null,
      params: null,
    };
  }

  return {
    reply: parsed.reply || '...',
    workflow: sanitizeWorkflow(parsed.workflow, workflow),
    action: parsed.action || null,
    params: parsed.params || null,
  };
}

function sanitizeWorkflow(incoming, fallback) {
  if (!incoming || typeof incoming !== 'object') return fallback;
  const nodes = Array.isArray(incoming.nodes) ? incoming.nodes : (fallback.nodes || []);
  const connections = Array.isArray(incoming.connections) ? incoming.connections : (fallback.connections || []);
  return { nodes, connections };
}
