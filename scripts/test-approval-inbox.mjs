import {
  filterApprovalCases,
  findApprovalCase,
  initialApprovalCases,
  resolveApprovalCase,
  summarizeApprovalCases,
} from '../src/services/approvalInbox.js';

const summary = summarizeApprovalCases(initialApprovalCases);

if (summary.conflict !== 1 || summary.pending !== 1 || summary.resolved !== 0) {
  throw new Error('Expected approval summary to count conflict and pending cases.');
}

const conflictOnly = filterApprovalCases(initialApprovalCases, {
  status: 'CONFLICT_PENDING',
  line: 'ALL',
});

if (conflictOnly.length !== 1 || conflictOnly[0].status !== 'CONFLICT_PENDING') {
  throw new Error('Expected status filter to return only CONFLICT_PENDING cases.');
}

const lineOnly = filterApprovalCases(initialApprovalCases, {
  status: 'ALL',
  line: 'ASSY-01',
});

if (lineOnly.length !== 0) {
  throw new Error('Expected line filter to remove unrelated cases.');
}

if (!findApprovalCase(initialApprovalCases, 'Q-20260902-001')) {
  throw new Error('Expected active approval case lookup to work.');
}

const resolved = resolveApprovalCase(
  initialApprovalCases,
  'Q-20260902-001',
  'APPROVE_CURRENT',
  () => '2026-09-02T03:00:00.000Z',
);
const resolvedCase = findApprovalCase(resolved, 'Q-20260902-001');

if (resolvedCase.status !== 'APPROVED'
  || resolvedCase.staged_action !== 'APPROVE_CURRENT'
  || resolvedCase.reviewed_at !== '2026-09-02T03:00:00.000Z') {
  throw new Error('Expected approval action to stage reviewed status.');
}

let rejected = false;
try {
  resolveApprovalCase(initialApprovalCases, 'Q-20260902-001', 'DELETE_ROW');
} catch {
  rejected = true;
}

if (!rejected) {
  throw new Error('Expected unknown approval action to be rejected.');
}

console.log('approval inbox test ok');
