/**
 * @fileoverview NetShield Sim - Routing Engine
 * Dijkstra's shortest path algorithm with Binary Min-Heap priority queue.
 * Pure, testable, and highly optimized (<500ms for 100+ nodes).
 * Matches specifications in DESIGN.md §3 and Prompt.
 */

/**
 * Binary Min-Heap Priority Queue
 */
export class MinHeap {
  constructor() {
    this.heap = [];
  }

  /**
   * Pushes an item with a priority into the heap.
   * @param {any} item 
   * @param {number} priority 
   */
  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the item with the lowest priority.
   * @returns {{ item: any, priority: number }|null}
   */
  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._sinkDown(0);
    }
    return min;
  }

  /**
   * Checks if heap is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Number of items in heap.
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  _bubbleUp(index) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.priority >= parent.priority) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      let leftChildIndex = 2 * index + 1;
      let rightChildIndex = 2 * index + 2;
      let swap = null;

      if (leftChildIndex < length) {
        const leftChild = this.heap[leftChildIndex];
        if (leftChild.priority < element.priority) {
          swap = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        const rightChild = this.heap[rightChildIndex];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < this.heap[leftChildIndex].priority)
        ) {
          swap = rightChildIndex;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      this.heap[swap] = element;
      index = swap;
    }
  }
}

/**
 * Builds an adjacency list from nodes and links.
 * Only considers online nodes and up links.
 * @param {Array<{ id: string, status?: string }>} nodes 
 * @param {Array<{ id: string, source: string, target: string, cost: number, status?: string }>} links 
 * @returns {Map<string, Array<{ neighborId: string, linkId: string, cost: number }>>}
 */
export function buildAdjacencyList(nodes, links) {
  const adj = new Map();
  const onlineNodes = new Set();

  for (const node of nodes) {
    if (node.status !== 'disabled') {
      onlineNodes.add(node.id);
      adj.set(node.id, []);
    }
  }

  for (const link of links) {
    if (link.status === 'down') continue;
    if (!onlineNodes.has(link.source) || !onlineNodes.has(link.target)) continue;

    const cost = Math.max(1, Number(link.cost) || 1);
    
    // Bidirectional network links
    if (adj.has(link.source)) {
      adj.get(link.source).push({ neighborId: link.target, linkId: link.id, cost });
    }
    if (adj.has(link.target)) {
      adj.get(link.target).push({ neighborId: link.source, linkId: link.id, cost });
    }
  }

  return adj;
}

/**
 * Computes shortest path from sourceId to targetId using Dijkstra's algorithm.
 * @param {Array<any>} nodes 
 * @param {Array<any>} links 
 * @param {string} sourceId 
 * @param {string} targetId 
 * @returns {{ path: string[], totalCost: number, hops: number, linkIds: string[], stepDetails: Array<{ node: string, distance: number, predecessor: string|null }> } | null}
 */
export function findShortestPath(nodes, links, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return null;

  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);

  if (!sourceNode || sourceNode.status === 'disabled') return null;
  if (!targetNode || targetNode.status === 'disabled') return null;

  const adj = buildAdjacencyList(nodes, links);
  if (!adj.has(sourceId) || !adj.has(targetId)) return null;

  const distances = new Map();
  const predecessors = new Map(); // nodeId -> { prevNode: string, linkId: string }
  const visited = new Set();
  const heap = new MinHeap();

  for (const [nodeId] of adj) {
    distances.set(nodeId, Infinity);
  }

  distances.set(sourceId, 0);
  heap.push(sourceId, 0);

  const stepDetails = [];

  while (!heap.isEmpty()) {
    const { item: current, priority: currentDist } = heap.pop();

    if (visited.has(current)) continue;
    visited.add(current);

    const prevInfo = predecessors.get(current);
    stepDetails.push({
      node: current,
      distance: currentDist,
      predecessor: prevInfo ? prevInfo.prevNode : null
    });

    if (current === targetId) break;

    const neighbors = adj.get(current) || [];
    for (const { neighborId, linkId, cost } of neighbors) {
      if (visited.has(neighborId)) continue;

      const alt = currentDist + cost;
      if (alt < distances.get(neighborId)) {
        distances.set(neighborId, alt);
        predecessors.set(neighborId, { prevNode: current, linkId });
        heap.push(neighborId, alt);
      }
    }
  }

  // Check if target was reached
  if (!predecessors.has(targetId) && sourceId !== targetId) {
    return null;
  }

  // Reconstruct path
  const path = [];
  const linkIds = [];
  let curr = targetId;

  while (curr !== sourceId) {
    path.unshift(curr);
    const step = predecessors.get(curr);
    if (!step) return null;
    linkIds.unshift(step.linkId);
    curr = step.prevNode;
  }
  path.unshift(sourceId);

  return {
    path,
    linkIds,
    totalCost: distances.get(targetId),
    hops: path.length - 1,
    stepDetails
  };
}

/**
 * Performance benchmark helper to verify Dijkstra execution time.
 * @param {number} [nodeCount=100] 
 * @param {number} [edgeProbability=0.08] 
 * @returns {{ timeMs: number, nodeCount: number, edgeCount: number }}
 */
export function benchmarkDijkstra(nodeCount = 100, edgeProbability = 0.08) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `bench-node-${i}`, status: 'online' });
  }

  const links = [];
  let edgeId = 0;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (Math.random() < edgeProbability) {
        links.push({
          id: `bench-link-${edgeId++}`,
          source: nodes[i].id,
          target: nodes[j].id,
          cost: Math.floor(Math.random() * 10) + 1,
          status: 'up'
        });
      }
    }
  }

  const src = nodes[0].id;
  const dst = nodes[nodeCount - 1].id;

  const start = performance.now();
  findShortestPath(nodes, links, src, dst);
  const timeMs = performance.now() - start;

  console.log(`[NetShield Sim Benchmark] Dijkstra with ${nodeCount} nodes and ${links.length} links computed in ${timeMs.toFixed(2)} ms.`);
  return { timeMs, nodeCount, edgeCount: links.length };
}
