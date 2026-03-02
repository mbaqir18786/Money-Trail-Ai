const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const { Server } = require('socket.io');
const axios = require('axios');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 5001;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const TRANSACTIONS_PATH = path.resolve(__dirname, '../transactions.json');

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════

async function readTransactions() {
  const data = await fs.readFile(TRANSACTIONS_PATH, 'utf-8');
  return JSON.parse(data);
}

async function callMLService(transactions) {
  const { data } = await axios.post(
    `${ML_SERVICE_URL}/fraud/analyze`,
    transactions,
    {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return data;
}

async function generateAlertWithOpenAI(fraudType, findings) {
  const prompt = `You are a senior AML Investigation Officer at Union Bank of India 
with 15 years experience. Write a professional fraud alert for the following:

Fraud Type: ${fraudType}
Findings: ${JSON.stringify(findings, null, 2)}

Write exactly 4 sections:
EXECUTIVE SUMMARY: (2 sentences — what happened in plain English)
TECHNICAL PATTERN: (2 sentences — exact pattern with amounts and timeline)
REGULATORY IMPLICATION: (1 sentence — specific PMLA 2002 section violated)
RECOMMENDED ACTION: (3 bullet points — immediate steps)

Sound like a real fraud officer. Be specific with amounts and accounts.`;

  const payload = {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
  };

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    timeout: 15000,
  };

  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      payload,
      config
    );
    return data.choices?.[0]?.message?.content?.trim() || getFallbackAlert(fraudType);
  } catch (err) {
    if (GROQ_API_KEY) {
      return generateAlertWithGroq(fraudType, findings);
    }
    return getFallbackAlert(fraudType);
  }
}

async function generateAlertWithGroq(fraudType, findings) {
  const prompt = `You are a senior AML Investigation Officer at Union Bank of India.
Write a professional fraud alert for:
Fraud Type: ${fraudType}
Findings: ${JSON.stringify(findings, null, 2)}
Include: Executive Summary, Technical Pattern, Regulatory Implication, Recommended Action.`;

  try {
    const { data } = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 15000,
      }
    );
    return data.choices?.[0]?.message?.content?.trim() || getFallbackAlert(fraudType);
  } catch (err) {
    return getFallbackAlert(fraudType);
  }
}

function getFallbackAlert(fraudType) {
  const alerts = {
    circular_transactions: `EXECUTIVE SUMMARY: Circular fund movement detected across multiple accounts indicating potential money laundering activity. Immediate investigation required.
TECHNICAL PATTERN: Funds routed through 4 mule accounts completing full circle within 12 minutes totaling ₹47,00,000.
REGULATORY IMPLICATION: Pattern constitutes offence under Section 3 of PMLA 2002 — proceeds of crime concealment.
RECOMMENDED ACTION:
- Freeze all involved accounts immediately
- File Suspicious Transaction Report with FIU within 7 days
- Preserve all transaction evidence for law enforcement`,

    rapid_layering: `EXECUTIVE SUMMARY: Rapid fund layering detected with money split across multiple accounts to obscure origin. Classic placement and layering behavior identified.
TECHNICAL PATTERN: Single large transaction split into multiple smaller transfers across 5 accounts within 30 minutes.
REGULATORY IMPLICATION: Violates Section 3 PMLA 2002 — laundering through layering technique.
RECOMMENDED ACTION:
- Place accounts under enhanced monitoring
- Request source of funds documentation
- Escalate to CISO and Compliance Head`,

    structuring: `EXECUTIVE SUMMARY: Structuring pattern detected with multiple transactions deliberately kept below reporting threshold. Clear intent to evade regulatory reporting.
TECHNICAL PATTERN: 9 transactions of ₹1,95,000 each to same beneficiary within 24 hours — total ₹17,55,000.
REGULATORY IMPLICATION: Structuring is explicit offence under PMLA 2002 Section 3 and RBI KYC Master Direction 2016.
RECOMMENDED ACTION:
- File STR with FIU India immediately
- Freeze beneficiary account
- Conduct full KYC review of all involved parties`,

    dormant_activation: `EXECUTIVE SUMMARY: Previously dormant account suddenly activated with high-value transfer inconsistent with customer profile. Potential account takeover or mule account activation.
TECHNICAL PATTERN: Account inactive for 8 months received ₹92,00,000 — 50x the account's historical average transaction value.
REGULATORY IMPLICATION: Triggers enhanced due diligence requirement under RBI KYC Master Direction 2016 Section 38.
RECOMMENDED ACTION:
- Halt all outgoing transactions immediately
- Verify account holder identity in person
- File STR if source of funds unverified within 24 hours`,

    round_tripping: `EXECUTIVE SUMMARY: Round-trip transaction detected where funds returned to originating account via multiple intermediaries. Classic integration stage of money laundering identified.
TECHNICAL PATTERN: ₹35,00,000 departed and returned to Account via 6 intermediaries completing cycle in 2 hours.
REGULATORY IMPLICATION: Round-tripping constitutes Section 3 PMLA 2002 offence — integration of laundered funds.
RECOMMENDED ACTION:
- Freeze all 6 intermediary accounts
- Map complete transaction network for FIU report
- Coordinate with law enforcement for account seizure`
  };

  return alerts[fraudType] || `EXECUTIVE SUMMARY: Suspicious transaction pattern detected requiring immediate investigation.
TECHNICAL PATTERN: Anomalous fund movement identified inconsistent with customer profile.
REGULATORY IMPLICATION: Potential PMLA 2002 Section 3 violation.
RECOMMENDED ACTION:
- Investigate immediately
- File STR if confirmed
- Freeze accounts`;
}

// ═══════════════════════════════════
// ROUTES
// ═══════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MoneyTrail AI Backend',
    mlServiceUrl: ML_SERVICE_URL,
    timestamp: new Date().toISOString()
  });
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await readTransactions();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get graph data — built from account_id based transaction data
app.get('/api/graph', async (req, res) => {
  try {
    const transactions = await readTransactions();
    const nodesMap = {};
    const edges = [];

    // Build nodes from account_id
    transactions.forEach(txn => {
      if (!nodesMap[txn.account_id]) {
        nodesMap[txn.account_id] = {
          id: txn.account_id,
          name: txn.account_id,
          type: txn.channel || 'Unknown',
          branch: txn.city || 'Unknown',
          state: txn.state || '',
          totalAmount: 0,
          txnCount: 0,
          fraudCount: 0,
          risk: 0,
          riskLevel: 'normal'
        };
      }
      nodesMap[txn.account_id].totalAmount += txn.amount;
      nodesMap[txn.account_id].txnCount += 1;
      if (txn.is_fraud) {
        nodesMap[txn.account_id].fraudCount += 1;
        nodesMap[txn.account_id].risk = 90;
        nodesMap[txn.account_id].riskLevel = 'high';
      }
    });

    // Build edges: pair CREDIT and DEBIT accounts in same city within 1 hour
    const credits = transactions.filter(t => t.txn_type === 'CREDIT').slice(0, 200);
    const debits = transactions.filter(t => t.txn_type === 'DEBIT').slice(0, 200);

    credits.forEach(credit => {
      const match = debits.find(debit =>
        debit.city === credit.city &&
        debit.account_id !== credit.account_id &&
        Math.abs(new Date(debit.timestamp) - new Date(credit.timestamp)) < 3600000 &&
        !edges.find(e => e.source === credit.account_id && e.target === debit.account_id)
      );
      if (match && edges.length < 150) {
        edges.push({
          source: credit.account_id,
          target: match.account_id,
          amount: credit.amount,
          type: credit.channel,
          timestamp: credit.timestamp,
          id: credit.transaction_id,
          suspicious: credit.is_fraud || match.is_fraud || false
        });
      }
    });

    // Add fraud scenario nodes with pre-built edges for demo
    const fraudNodes = [
      { id: 'FRAUD001', name: 'Rajesh Kumar', type: 'RTGS', branch: 'Mumbai', state: 'Maharashtra', totalAmount: 4700000, txnCount: 4, fraudCount: 4, risk: 95, riskLevel: 'high' },
      { id: 'FRAUD002', name: 'Shell Co. Mumbai', type: 'NEFT', branch: 'Mumbai', state: 'Maharashtra', totalAmount: 4650000, txnCount: 3, fraudCount: 3, risk: 92, riskLevel: 'high' },
      { id: 'FRAUD003', name: 'Priya Enterprises', type: 'IMPS', branch: 'Delhi', state: 'Delhi', totalAmount: 4600000, txnCount: 3, fraudCount: 3, risk: 89, riskLevel: 'high' },
      { id: 'FRAUD004', name: 'Quick Trade Ltd', type: 'RTGS', branch: 'Mumbai', state: 'Maharashtra', totalAmount: 4550000, txnCount: 3, fraudCount: 3, risk: 94, riskLevel: 'high' },
    ];

    fraudNodes.forEach(n => { nodesMap[n.id] = n; });

    edges.push(
      { source: 'FRAUD001', target: 'FRAUD002', amount: 4700000, type: 'RTGS', timestamp: '2025-12-01T14:32:01', id: 'DEMO001', suspicious: true },
      { source: 'FRAUD002', target: 'FRAUD003', amount: 4650000, type: 'NEFT', timestamp: '2025-12-01T14:38:44', id: 'DEMO002', suspicious: true },
      { source: 'FRAUD003', target: 'FRAUD004', amount: 4600000, type: 'IMPS', timestamp: '2025-12-01T14:41:22', id: 'DEMO003', suspicious: true },
      { source: 'FRAUD004', target: 'FRAUD001', amount: 4550000, type: 'RTGS', timestamp: '2025-12-01T14:44:07', id: 'DEMO004', suspicious: true }
    );

    const nodes = Object.values(nodesMap);

    res.json({
      nodes,
      edges,
      totalTransactions: transactions.length,
      totalAccounts: nodes.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const transactions = await readTransactions();
    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const fraudTxns = transactions.filter(t => t.is_fraud);
    const uniqueAccounts = [...new Set(transactions.map(t => t.account_id))];

    res.json({
      totalTransactions: transactions.length,
      totalAccounts: uniqueAccounts.length,
      totalAmount: totalAmount,
      suspiciousCount: fraudTxns.length,
      highRiskAccounts: Math.ceil(fraudTxns.length / 3),
      alertsGenerated: 4,
      monitoredBranches: 6
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run full fraud analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const transactions = await readTransactions();
    io.emit('analysis:started', { transactionCount: transactions.length });

    let fraudResults;
    try {
      fraudResults = await callMLService(transactions);
    } catch (mlErr) {
      console.warn('ML service unavailable, using mock results:', mlErr.message);
      fraudResults = getMockFraudResults();
    }

    io.emit('fraud:detected', fraudResults);

    const alerts = [];
    const types = [
      'circular_transactions',
      'rapid_layering',
      'structuring',
      'dormant_activation',
      'round_tripping',
    ];

    for (const type of types) {
      const result = fraudResults[type];
      if (result?.detected) {
        const findings = {
          cycles: result.cycles,
          paths: result.paths,
          accounts: result.accounts,
          round_trips: result.round_trips,
          total_amount: result.total_amount,
          risk_score: result.risk_score
        };
        const alertText = await generateAlertWithOpenAI(type, findings);
        const alert = {
          id: `alert_${Date.now()}_${type}`,
          type,
          text: alertText,
          findings,
          timestamp: new Date().toISOString(),
          severity: result.risk_score > 85 ? 'CRITICAL' : 'HIGH',
          status: 'NEW'
        };
        alerts.push(alert);
        io.emit('alert:generated', alert);
      }
    }

    res.json({ fraudResults, alerts });
  } catch (err) {
    console.error('Analyze error:', err.message);
    io.emit('analysis:error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Demo mode — pre-scripted dramatic sequence
app.get('/api/demo', async (req, res) => {
  try {
    const demoAlert = getFallbackAlert('circular_transactions');
    res.json({
      scenario: 'LAYERING_47L',
      accounts: [
        { id: 'FRAUD001', name: 'Rajesh Kumar', risk: 95, role: 'originator' },
        { id: 'FRAUD002', name: 'Shell Co. Mumbai', risk: 92, role: 'mule_1' },
        { id: 'FRAUD003', name: 'Priya Enterprises', risk: 89, role: 'mule_2' },
        { id: 'FRAUD004', name: 'Quick Trade Ltd', risk: 94, role: 'mule_3' },
      ],
      transactions: [
        { from: 'FRAUD001', to: 'FRAUD002', amount: 4700000, time: '14:32:01', type: 'RTGS' },
        { from: 'FRAUD002', to: 'FRAUD003', amount: 4650000, time: '14:38:44', type: 'NEFT' },
        { from: 'FRAUD003', to: 'FRAUD004', amount: 4600000, time: '14:41:22', type: 'IMPS' },
        { from: 'FRAUD004', to: 'FRAUD001', amount: 4550000, time: '14:44:07', type: 'RTGS' },
      ],
      riskScore: 94,
      patternType: 'CIRCULAR_LAYERING',
      timeWindowMinutes: 12,
      totalAmount: 4700000,
      alert: demoAlert,
      pmlaSection: 'Section 3 — Offence of Money Laundering',
      fiuDeadline: '7 days from detection'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate FIU report data
app.post('/api/report', async (req, res) => {
  try {
    const { caseId, fraudType, findings } = req.body;
    const alertText = await generateAlertWithOpenAI(fraudType, findings);
    res.json({
      reportId: `STR-UBI-${Date.now()}`,
      caseId,
      generatedAt: new Date().toISOString(),
      bankName: 'Union Bank of India',
      branchCode: 'MUM-001',
      alertNarrative: alertText,
      fiuSubmissionDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'READY_FOR_SUBMISSION'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════

function getMockFraudResults() {
  return {
    circular_transactions: {
      detected: true,
      risk_score: 94,
      cycles: [['FRAUD001', 'FRAUD002', 'FRAUD003', 'FRAUD004', 'FRAUD001']],
      total_amount: 4700000,
      time_window_minutes: 12
    },
    rapid_layering: {
      detected: true,
      risk_score: 87,
      paths: [['ACC012', 'ACC034', 'ACC056', 'ACC089']],
      total_amount: 2300000,
      time_window_minutes: 28
    },
    structuring: {
      detected: true,
      risk_score: 78,
      accounts: ['ACC045'],
      transaction_count: 9,
      amount_each: 195000
    },
    dormant_activation: {
      detected: true,
      risk_score: 82,
      accounts: ['ACC067'],
      inactive_months: 8,
      activation_amount: 9200000
    },
    round_tripping: {
      detected: false,
      risk_score: 0
    }
  };
}

// ═══════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('connected', { message: 'Connected to MoneyTrail AI' });

  const interval = setInterval(() => {
    socket.emit('transaction:live', {
      id: `TXN${Date.now()}`,
      amount: Math.floor(Math.random() * 500000) + 10000,
      type: ['NEFT', 'RTGS', 'IMPS', 'UPI'][Math.floor(Math.random() * 4)],
      suspicious: Math.random() < 0.1,
      timestamp: new Date().toISOString()
    });
  }, 3000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Client disconnected:', socket.id);
  });
});

// ═══════════════════════════════════
// START SERVER
// ═══════════════════════════════════

server
  .listen(PORT, () => {
    console.log(`✅ MoneyTrail AI Backend running on http://localhost:${PORT}`);
    console.log(`✅ Socket.io enabled`);
    console.log(`✅ ML service: ${ML_SERVICE_URL}`);
    console.log(`✅ OpenAI: ${OPENAI_API_KEY ? 'Configured' : 'Not configured — using fallback alerts'}`);
    console.log(`✅ Groq: ${GROQ_API_KEY ? 'Configured as backup' : 'Not configured'}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use. Change PORT in .env file.`);
      process.exit(1);
    }
    throw err;
  });