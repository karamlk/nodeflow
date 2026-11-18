// Simple natural-language parser that turns a user message into one or more
// workflow actions. Pattern based — works fully offline, no external API.

const COLOR_NAMES = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#10b981',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  white: '#ffffff',
  black: '#000000',
  gray: '#6b7280',
  grey: '#6b7280',
};

function newId(prefix = 'node') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function nextPosition(nodes) {
  const i = nodes.length;
  return { x: 100 + i * 60, y: 100 + i * 60 };
}

function extractQuoted(text) {
  // returns first quoted string, single or double quotes
  const m = text.match(/["“”'‘’]([^"“”'‘’]+)["“”'‘’]/);
  return m ? m[1] : null;
}

function extractAfter(text, keyword) {
  const re = new RegExp(`${keyword}\\s+(.+)$`, 'i');
  const m = text.match(re);
  return m ? m[1].trim().replace(/[.!?]+$/, '') : null;
}

function parseDuration(text) {
  // Returns milliseconds, or null
  const ms = text.match(/(\d+)\s*(ms|millisecond)/i);
  if (ms) return parseInt(ms[1], 10);
  const sec = text.match(/(\d+(?:\.\d+)?)\s*(s|sec|second)/i);
  if (sec) return Math.round(parseFloat(sec[1]) * 1000);
  const min = text.match(/(\d+(?:\.\d+)?)\s*(m|min|minute)/i);
  if (min) return Math.round(parseFloat(min[1]) * 60 * 1000);
  return null;
}

function findColor(text) {
  const lower = text.toLowerCase();
  for (const name of Object.keys(COLOR_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return COLOR_NAMES[name];
  }
  const hex = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hex) return hex[0];
  return null;
}

function autoConnect(nodes) {
  const conns = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    conns.push({
      id: `conn-${nodes[i].id}-${nodes[i + 1].id}`,
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
    });
  }
  return conns;
}

function describeNode(n) {
  switch (n.type) {
    case 'log':
      return `log "${n.config?.message || ''}"`;
    case 'color': {
      const tgt = n.config?.target || 'text';
      return `color (${tgt}: ${n.config?.color || '#10b981'})`;
    }
    case 'transform': {
      const op = n.config?.operation || 'uppercase';
      const v = n.config?.value;
      return v ? `transform (${op} "${v}")` : `transform (${op})`;
    }
    case 'filter':
      return `filter contains "${n.config?.condition || ''}"`;
    case 'delay':
      return `delay ${n.config?.milliseconds || 1000}ms`;
    default:
      return n.type;
  }
}

function describeWorkflow(workflow) {
  if (!workflow.nodes.length) return 'The workflow is empty.';
  const lines = workflow.nodes.map((n, i) => `  ${i + 1}. ${describeNode(n)}`);
  return `Current workflow (${workflow.nodes.length} step${
    workflow.nodes.length === 1 ? '' : 's'
  }):\n${lines.join('\n')}`;
}

const HELP_TEXT = [
  'Here are some things you can ask me:',
  '• "Log: Hello world" — adds a log step',
  '• "Make the text red" or "Background blue" — adds a color step',
  '• "Uppercase it" / "Lowercase" / "Add prefix \\"Hi: \\"" / "Add suffix \\"!\\""',
  '• "Only if it contains hello" — adds a filter',
  '• "Wait 2 seconds" or "Delay 500ms"',
  '• "Connect them in order" — links every step',
  '• "Show me the workflow" / "What do I have?"',
  '• "Remove the last step" / "Undo"',
  '• "Clear" or "Reset" — start over',
  '• "Run it" — execute the workflow',
  '• "Run <name>" — load a saved workflow by name and run it',
  '• "Save it as <name>" — save the current workflow',
  '• "Load <name>" or "Restore <name>" — bring back a saved workflow',
  '• "List my flows" — see what you have saved',
  '• "Open in editor" — view the current workflow on the visual canvas',
].join('\n');

export function parseMessage(rawMessage, workflowIn) {
  const workflow = {
    nodes: [...(workflowIn?.nodes || [])],
    connections: [...(workflowIn?.connections || [])],
  };
  const message = (rawMessage || '').trim();
  const lower = message.toLowerCase();

  if (!message) {
    return { reply: 'Type something and I will help build your workflow.', workflow };
  }

  // --- Commands ---
  if (/^(help|what can you do|commands?)\b/.test(lower)) {
    return { reply: HELP_TEXT, workflow };
  }

  if (/^(hi|hello|hey|yo|sup)\b/.test(lower)) {
    return {
      reply:
        "Hi! I can help you build an automation step-by-step. Tell me what you want to do, " +
        'or type "help" to see examples.',
      workflow,
    };
  }

  if (/^(clear|reset|start over|restart|wipe)\b/.test(lower)) {
    return {
      reply: 'Cleared. Tell me what to build next.',
      workflow: { nodes: [], connections: [] },
    };
  }

  // "list saved", "list my flows", "what flows do I have"
  if (
    /^(list|show)\s+(my\s+)?(saved\s+)?(flows?|workflows?)\b/.test(lower) ||
    /^(my\s+)?(saved\s+)?(flows?|workflows?)\??$/.test(lower) ||
    /what.*(saved|flows? do i have)/.test(lower)
  ) {
    return {
      reply: 'Here are your saved workflows:',
      workflow,
      action: 'list',
    };
  }

  if (/^(show|list|what.*(have|workflow|steps))/.test(lower) || /describe/.test(lower)) {
    return { reply: describeWorkflow(workflow), workflow };
  }

  // "save it as <name>", "save as <name>", "save <name>", "save this as <name>"
  {
    const m =
      message.match(/^save(?:\s+(?:it|this|the\s+(?:flow|workflow)))?\s+as\s+(.+)$/i) ||
      message.match(/^save\s+(?:it|this)?\s*[:\-]?\s*"([^"]+)"$/i) ||
      message.match(/^save\s+(?:it|this)?\s*[:\-]?\s*'([^']+)'$/i) ||
      message.match(/^save\s+(.+)$/i);
    if (m) {
      let name = (m[1] || '').trim().replace(/^["'“”‘’]|["'“”‘’]$/g, '').replace(/[.!?]+$/, '');
      if (!name || /^(it|this|flow|workflow)$/i.test(name)) {
        return {
          reply: 'What name should I save it under? Try "save it as My Cool Flow".',
          workflow,
        };
      }
      if (!workflow.nodes.length) {
        return {
          reply: 'There is nothing to save yet. Add some steps first.',
          workflow,
        };
      }
      return {
        reply: `Saving the workflow as "${name}"…`,
        workflow,
        action: 'save',
        params: { name },
      };
    }
  }

  // "load <name>", "restore <name>", "open <name>", "load my flow <name>"
  {
    const m =
      message.match(/^(?:load|restore|open|bring\s+back|get)\s+(?:(?:my\s+)?(?:saved\s+)?(?:flow|workflow)\s+(?:called\s+)?)?["'“”‘’]([^"'“”‘’]+)["'“”‘’]\s*$/i) ||
      message.match(/^(?:load|restore|open|bring\s+back|get)\s+(?:(?:my\s+)?(?:saved\s+)?(?:flow|workflow)\s+(?:called\s+)?)?(.+)$/i);
    if (m && /^(load|restore|open|bring|get)\b/i.test(message)) {
      const raw = (m[1] || '').trim().replace(/^["'“”‘’]|["'“”‘’]$/g, '').replace(/[.!?]+$/, '');
      // "open in editor" / "open editor" / "open canvas" should not be treated as load
      if (/^(in\s+(the\s+)?(editor|canvas)|editor|canvas|visual\s+editor|on\s+(the\s+)?canvas)$/i.test(raw)) {
        return {
          reply: workflow.nodes.length
            ? 'Opening the current workflow in the visual editor…'
            : 'There is nothing to show yet. Add some steps first, then say "open in editor".',
          workflow,
          action: workflow.nodes.length ? 'openEditor' : null,
        };
      }
      if (!raw) {
        return {
          reply: 'Which one? Try "load My Cool Flow", or say "list my flows" to see them.',
          workflow,
        };
      }
      return {
        reply: `Looking for "${raw}"…`,
        workflow,
        action: 'load',
        params: { name: raw },
      };
    }
  }

  // "open in editor", "open the canvas", "send to editor", "view on canvas"
  if (
    /\b(open|view|show|send|take\s+(this|me|it))\b.*\b(editor|canvas|visual)\b/.test(lower) ||
    /^(open|view)\s+(in\s+)?(the\s+)?(editor|canvas|visual\s+editor)\.?$/i.test(message)
  ) {
    return {
      reply: workflow.nodes.length
        ? 'Opening the current workflow in the visual editor…'
        : 'There is nothing to show yet. Add some steps first, then say "open in editor".',
      workflow,
      action: workflow.nodes.length ? 'openEditor' : null,
    };
  }

  if (/^(undo|remove (the )?last|delete (the )?last|pop)\b/.test(lower)) {
    if (!workflow.nodes.length) {
      return { reply: 'There is nothing to remove yet.', workflow };
    }
    const removed = workflow.nodes.pop();
    workflow.connections = workflow.connections.filter(
      (c) => c.fromNodeId !== removed.id && c.toNodeId !== removed.id
    );
    return {
      reply: `Removed the last step (${describeNode(removed)}).\n\n${describeWorkflow(workflow)}`,
      workflow,
    };
  }

  if (/(connect|chain|link).*(order|all|them|nodes|steps)/.test(lower) ||
      /^(connect|chain|link)( them| all)?\.?$/.test(lower) ||
      /(in order|sequentially)/.test(lower)) {
    if (workflow.nodes.length < 2) {
      return {
        reply: 'I need at least two steps before I can connect them. Add another step first.',
        workflow,
      };
    }
    workflow.connections = autoConnect(workflow.nodes);
    return {
      reply: `Connected all ${workflow.nodes.length} steps in order.\n\n${describeWorkflow(workflow)}`,
      workflow,
    };
  }

  if (/^(run|execute|start|go|play)\b/.test(lower)) {
    // Strip the leading verb and any "the/my/saved/flow/workflow/called" filler
    const rest = message
      .replace(/^(run|execute|start|go|play)\s*/i, '')
      // Only strip filler like "the/my/saved flow/workflow [called]" when
      // "flow"/"workflow" actually appears — otherwise leave the name intact.
      .replace(/^(?:(?:the\s+)?(?:my\s+)?(?:saved\s+)?(?:flow|workflow)\s+(?:called\s+)?)?/i, '')
      .trim()
      .replace(/^["'“”‘’]|["'“”‘’]$/g, '')
      .replace(/[.!?]+$/, '');

    // "run", "run it", "run this", "run now", "run the workflow", "run automation"
    const refersToCurrent =
      !rest ||
      /^(it|this|that|now|automation|please)$/i.test(rest) ||
      /^(the\s+)?(current\s+)?(flow|workflow)$/i.test(rest);

    if (refersToCurrent) {
      if (!workflow.nodes.length) {
        return { reply: 'There is nothing to run. Add some steps first.', workflow };
      }
      if (workflow.nodes.length > 1 && workflow.connections.length === 0) {
        workflow.connections = autoConnect(workflow.nodes);
      }
      return {
        reply: 'Running the workflow now…',
        workflow,
        action: 'run',
      };
    }

    // "run My Cool Flow" — load the saved flow by name and run it
    return {
      reply: `Loading and running "${rest}"…`,
      workflow,
      action: 'runSaved',
      params: { name: rest },
    };
  }

  // --- Add nodes ---
  const created = [];

  // Log: "log X", "say X", "print X", "output X", "log: hello", "add log hello"
  {
    const m =
      message.match(/^(?:add\s+)?(?:a\s+)?log(?:\s+node)?\s*[:\-]?\s*(.+)$/i) ||
      message.match(/^(?:say|print|output|message)\s*[:\-]?\s*(.+)$/i);
    if (m) {
      const quoted = extractQuoted(m[1]);
      const text = (quoted || m[1]).trim().replace(/^[:\-]\s*/, '').replace(/[.!?]+$/, '');
      const node = {
        id: newId('node'),
        type: 'log',
        position: nextPosition(workflow.nodes),
        config: { message: text || 'Hello' },
      };
      workflow.nodes.push(node);
      created.push(node);
    }
  }

  // Color: "make text red", "background blue", "color text #ff0000"
  if (created.length === 0) {
    if (/(color|colour|paint|style|background|bg|text)/.test(lower) && findColor(lower)) {
      const color = findColor(lower);
      const target = /(background|bg|behind|highlight)/.test(lower) ? 'background' : 'text';
      const node = {
        id: newId('node'),
        type: 'color',
        position: nextPosition(workflow.nodes),
        config: { color, target },
      };
      workflow.nodes.push(node);
      created.push(node);
    }
  }

  // Transform
  if (created.length === 0) {
    if (/(uppercase|upper case|all caps|capitalize all|shout)/.test(lower)) {
      const node = {
        id: newId('node'),
        type: 'transform',
        position: nextPosition(workflow.nodes),
        config: { operation: 'uppercase', value: '' },
      };
      workflow.nodes.push(node);
      created.push(node);
    } else if (/(lowercase|lower case|all small)/.test(lower)) {
      const node = {
        id: newId('node'),
        type: 'transform',
        position: nextPosition(workflow.nodes),
        config: { operation: 'lowercase', value: '' },
      };
      workflow.nodes.push(node);
      created.push(node);
    } else if (/(prefix|prepend|before)/.test(lower) && /(add|put|insert|with)/.test(lower)) {
      const value = extractQuoted(message) || extractAfter(message, /prefix|prepend/i.source) || '';
      const node = {
        id: newId('node'),
        type: 'transform',
        position: nextPosition(workflow.nodes),
        config: { operation: 'addPrefix', value },
      };
      workflow.nodes.push(node);
      created.push(node);
    } else if (/(suffix|append|after)/.test(lower) && /(add|put|insert|with)/.test(lower)) {
      const value = extractQuoted(message) || extractAfter(message, /suffix|append/i.source) || '';
      const node = {
        id: newId('node'),
        type: 'transform',
        position: nextPosition(workflow.nodes),
        config: { operation: 'addSuffix', value },
      };
      workflow.nodes.push(node);
      created.push(node);
    }
  }

  // Filter
  if (created.length === 0) {
    if (/(filter|only if|if it (has|contains)|contains|when it has)/.test(lower)) {
      const quoted = extractQuoted(message);
      let condition = quoted;
      if (!condition) {
        const m = message.match(/(?:contains?|has|with|for)\s+(.+)$/i);
        if (m) condition = m[1].trim().replace(/[.!?]+$/, '');
      }
      condition = (condition || '').replace(/^["'“”‘’]|["'“”‘’]$/g, '');
      const node = {
        id: newId('node'),
        type: 'filter',
        position: nextPosition(workflow.nodes),
        config: { condition: condition || '' },
      };
      workflow.nodes.push(node);
      created.push(node);
    }
  }

  // Delay
  if (created.length === 0) {
    const ms = parseDuration(message);
    if (ms !== null && /(wait|delay|pause|sleep|hold)/.test(lower)) {
      const node = {
        id: newId('node'),
        type: 'delay',
        position: nextPosition(workflow.nodes),
        config: { milliseconds: String(ms) },
      };
      workflow.nodes.push(node);
      created.push(node);
    }
  }

  if (created.length > 0) {
    // Auto-connect each new node to its predecessor for a smoother experience.
    if (workflow.nodes.length >= 2) {
      const prev = workflow.nodes[workflow.nodes.length - 2];
      const last = workflow.nodes[workflow.nodes.length - 1];
      const exists = workflow.connections.some(
        (c) => c.fromNodeId === prev.id && c.toNodeId === last.id
      );
      if (!exists) {
        workflow.connections.push({
          id: `conn-${prev.id}-${last.id}`,
          fromNodeId: prev.id,
          toNodeId: last.id,
        });
      }
    }

    const summaries = created.map(describeNode).join(', ');
    return {
      reply: `Added ${summaries}.\n\n${describeWorkflow(workflow)}\n\nSay "run it" to execute, or keep adding steps.`,
      workflow,
    };
  }

  // Fallback
  return {
    reply:
      "I'm not sure how to do that yet. Try things like:\n" +
      '• "Log: Hello world"\n' +
      '• "Make the text green"\n' +
      '• "Uppercase it"\n' +
      '• "Wait 2 seconds"\n' +
      '• "Connect them in order"\n' +
      '• "Run it"\n\nType "help" for more.',
    workflow,
  };
}
