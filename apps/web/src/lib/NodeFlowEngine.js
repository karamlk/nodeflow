export class NodeFlowEngine {
  constructor(nodes, connections) {
    this.nodes = nodes;
    this.connections = connections;
    this.executionLog = [];
    this.currentData = '';
    this.currentStyle = null;
  }

  log(message, type = 'info', style = null) {
    this.executionLog.push({
      timestamp: new Date().toISOString(),
      message,
      type,
      style
    });
  }

  findNodeById(id) {
    return this.nodes.find(node => node.id === id);
  }

  findConnectionsFromNode(nodeId) {
    return this.connections.filter(conn => conn.fromNodeId === nodeId);
  }

  findStartNode() {
    const connectedNodeIds = new Set(this.connections.map(c => c.toNodeId));
    return this.nodes.find(node => !connectedNodeIds.has(node.id));
  }

  async executeNode(node) {
    this.log(`Executing ${node.type} node: ${node.id}`, 'info');

    switch (node.type) {
      case 'log':
        return this.executeLogNode(node);
      case 'color':
        return this.executeColorNode(node);
      case 'transform':
        return this.executeTransformNode(node);
      case 'filter':
        return this.executeFilterNode(node);
      case 'delay':
        return this.executeDelayNode(node);
      default:
        this.log(`Unknown node type: ${node.type}`, 'error');
        return { continue: true, data: this.currentData, style: this.currentStyle };
    }
  }

  executeLogNode(node) {
    const message = node.config?.message || 'No message';
    this.log(`Log action: Set message to "${message}"`, 'success');
    this.currentData = message;
    
    // Output current state
    this.log(this.currentData, 'info', this.currentStyle);
    
    return { continue: true, data: message, style: this.currentStyle };
  }

  executeColorNode(node) {
    const color = node.config?.color || '#10b981';
    const target = node.config?.target || 'text';
    
    this.log(`Color node executed: Applied ${color} to ${target}`, 'success');
    
    const newStyle = target === 'text' 
      ? { color } 
      : { backgroundColor: color, color: '#ffffff', padding: '2px 6px', borderRadius: '4px' };
      
    this.currentStyle = newStyle;

    if (this.currentData) {
      this.log(this.currentData, 'info', this.currentStyle);
    }

    return { continue: true, data: this.currentData, style: this.currentStyle };
  }

  executeTransformNode(node) {
    const operation = node.config?.operation || 'uppercase';
    const value = node.config?.value || '';
    let result = this.currentData;

    switch (operation) {
      case 'uppercase':
        result = this.currentData.toUpperCase();
        break;
      case 'lowercase':
        result = this.currentData.toLowerCase();
        break;
      case 'addPrefix':
        result = value + this.currentData;
        break;
      case 'addSuffix':
        result = this.currentData + value;
        break;
    }

    this.log(`Transform node: ${operation} → "${result}"`, 'success');
    this.currentData = result;
    
    this.log(this.currentData, 'info', this.currentStyle);
    
    return { continue: true, data: result, style: this.currentStyle };
  }

  executeFilterNode(node) {
    const condition = node.config?.condition || '';
    const passes = this.currentData.toLowerCase().includes(condition.toLowerCase());
    
    if (passes) {
      this.log(`Filter PASSED: "${condition}" found in data`, 'success');
      return { continue: true, data: this.currentData, style: this.currentStyle };
    } else {
      this.log(`Filter BLOCKED: "${condition}" not found in data`, 'warning');
      return { continue: false, data: this.currentData, style: this.currentStyle };
    }
  }

  async executeDelayNode(node) {
    const ms = parseInt(node.config?.milliseconds || '1000', 10);
    this.log(`Delaying execution for ${ms}ms...`, 'info');
    
    await new Promise(resolve => setTimeout(resolve, ms));
    
    this.log(`Delay completed (${ms}ms)`, 'success');
    return { continue: true, data: this.currentData, style: this.currentStyle };
  }

  async run() {
    this.executionLog = [];
    this.currentData = '';
    this.currentStyle = null;

    if (this.nodes.length === 0) {
      this.log('No nodes in workflow', 'error');
      return this.executionLog;
    }

    const startNode = this.findStartNode();
    if (!startNode) {
      this.log('No start node found (all nodes have incoming connections)', 'error');
      return this.executionLog;
    }

    this.log('Starting workflow execution...', 'info');
    await this.executeFromNode(startNode);
    this.log('Workflow execution completed', 'success');

    return this.executionLog;
  }

  async executeFromNode(node) {
    const result = await this.executeNode(node);
    
    if (!result.continue) {
      this.log('Execution stopped by filter node', 'warning');
      return;
    }

    const outgoingConnections = this.findConnectionsFromNode(node.id);
    
    for (const connection of outgoingConnections) {
      const nextNode = this.findNodeById(connection.toNodeId);
      if (nextNode) {
        await this.executeFromNode(nextNode);
      }
    }
  }
}