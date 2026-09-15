// Local investigation queue store (mock persistence via localStorage).
// Replaceable later with real backend endpoints.

import { getAllWorks } from '../data/mockData';

const KEY = 'mplads_sentinel_queue_v1';
const listeners = new Set();

function seed() {
  const works = getAllWorks()
    .filter((w) => w.riskTier === 'CRITICAL')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8);
  const officers = ['A. Nair (State Nodal)', 'R. Menon (District Cell)', 'S. Iyer (Audit Wing)', 'Unassigned'];
  const statuses = ['New', 'Under Review', 'Investigation', 'New', 'Under Review'];
  const now = Date.now();
  return works.map((w, i) => ({
    id: `INV-${500 + i}`,
    workId: w.id,
    description: w.description,
    state: w.state,
    district: w.district,
    riskScore: w.riskScore,
    riskTier: w.riskTier,
    reason: w.primarySignal,
    assignedTo: officers[i % officers.length],
    status: statuses[i % statuses.length],
    priority: i < 3 ? 'P1' : i < 6 ? 'P2' : 'P3',
    dueDate: new Date(now + (i + 3) * 86400000).toISOString(),
    addedAt: new Date(now - i * 3600000).toISOString(),
  }));
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const seeded = seed();
  write(seeded);
  return seeded;
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  listeners.forEach((fn) => fn(items));
}

export function getQueue() {
  return read();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addToQueue(work) {
  const items = read();
  if (items.some((i) => i.workId === work.id)) return { added: false, items };
  const item = {
    id: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
    workId: work.id,
    description: work.description,
    state: work.state,
    district: work.district,
    riskScore: work.riskScore,
    riskTier: work.riskTier,
    reason: work.primarySignal,
    assignedTo: 'Unassigned',
    status: 'New',
    priority: work.riskTier === 'CRITICAL' ? 'P1' : work.riskTier === 'HIGH' ? 'P2' : 'P3',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    addedAt: new Date().toISOString(),
  };
  const next = [item, ...items];
  write(next);
  return { added: true, items: next };
}

export function updateStatus(id, status) {
  const next = read().map((i) => (i.id === id ? { ...i, status } : i));
  write(next);
  return next;
}

export function isQueued(workId) {
  return read().some((i) => i.workId === workId);
}
