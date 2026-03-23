// Conflux Home — Life Autopilot View
// Central hub: reminders, documents, knowledge, AI Q&A.

import { useState, useCallback } from 'react';
import { useLifeAutopilot } from '../hooks/useLifeAutopilot';
import type { LifeReminder } from '../types';

const PRIORITY_CONFIG: Record<string, { emoji: string; color: string }> = {
  urgent: { emoji: '🔴', color: '#ef4444' },
  high:   { emoji: '🟠', color: '#f97316' },
  normal: { emoji: '🟡', color: '#f59e0b' },
  low:    { emoji: '🟢', color: '#10b981' },
};

const DOC_TYPE_EMOJI: Record<string, string> = {
  bill: '📄', school: '🏫', warranty: '🛡️', medical: '🏥',
  insurance: '📋', tax: '📊', contract: '📝', receipt: '🧾', other: '📎',
};

function daysUntil(date: string): number {
  const diff = new Date(date + 'T23:59:59').getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function dueLabel(date: string): string {
  const d = daysUntil(date);
  if (d < 0) return `${Math.abs(d)} days overdue!`;
  if (d === 0) return 'Due today!';
  if (d === 1) return 'Due tomorrow';
  if (d <= 7) return `Due in ${d} days`;
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LifeAutopilotView() {
  const { dashboard, loading, analyzeDocument, askQuestion, addReminder } = useLifeAutopilot();
  const [docText, setDocText] = useState('');
  const [docType, setDocType] = useState('other');
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  const handleAnalyze = useCallback(async () => {
    if (!docText.trim() || analyzing) return;
    setAnalyzing(true);
    try {
      await analyzeDocument(docText, docType);
      setDocText('');
    } finally {
      setAnalyzing(false);
    }
  }, [docText, docType, analyzing, analyzeDocument]);

  const handleAsk = useCallback(async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    try {
      const result = await askQuestion(question);
      setAnswer(result);
    } finally {
      setAsking(false);
    }
  }, [question, asking, askQuestion]);

  const handleAddReminder = useCallback(async () => {
    if (!reminderTitle.trim() || !reminderDate) return;
    await addReminder(reminderTitle, reminderDate);
    setReminderTitle('');
    setReminderDate('');
    setShowReminderForm(false);
  }, [reminderTitle, reminderDate, addReminder]);

  const overdue = dashboard?.overdue_reminders ?? [];
  const upcoming = dashboard?.upcoming_reminders ?? [];
  const documents = dashboard?.recent_documents ?? [];

  return (
    <div className="life-view">
      <div className="life-header">
        <h2 className="life-title">🧠 Life Autopilot</h2>
        <div className="life-stats">
          <span className="life-stat">📄 {dashboard?.documents_count ?? 0} docs</span>
          <span className="life-stat">🔔 {upcoming.length} reminders</span>
          <span className="life-stat">🧠 {dashboard?.knowledge_count ?? 0} facts</span>
        </div>
      </div>

      {/* Ask the AI */}
      <div className="life-ask-section">
        <div className="fridge-scan-header">
          <span className="ai-add-icon">💬</span>
          <span>Ask Your Life AI</span>
        </div>
        <p className="fridge-scan-desc">
          Ask anything about your family. "When did Emma last see the dentist?" "What's our HVAC filter size?" "What bills are due this month?"
        </p>
        <div className="ai-add-row">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask a question about your family..."
            className="ai-add-input"
          />
          <button className="btn-primary" onClick={handleAsk} disabled={asking || !question.trim()}>
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {answer && (
          <div className="life-answer">
            <p>{answer}</p>
          </div>
        )}
      </div>

      {/* Overdue Reminders */}
      {overdue.length > 0 && (
        <div className="life-section overdue">
          <h3 className="section-title">🚨 Overdue</h3>
          {overdue.map(r => (
            <ReminderCard key={r.id} reminder={r} overdue />
          ))}
        </div>
      )}

      {/* Upcoming Reminders */}
      <div className="life-section">
        <div className="section-header">
          <h3 className="section-title">🔔 Upcoming Reminders</h3>
          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowReminderForm(!showReminderForm)}>
            + Add
          </button>
        </div>

        {showReminderForm && (
          <div className="goal-form" style={{ marginBottom: 12 }}>
            <input type="text" value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} placeholder="Reminder title" className="goal-form-input" />
            <div className="goal-form-row" style={{ marginTop: 8 }}>
              <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="goal-form-input" style={{ width: 160 }} />
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={handleAddReminder} disabled={!reminderTitle || !reminderDate}>Add</button>
            </div>
          </div>
        )}

        {upcoming.length === 0 && overdue.length === 0 ? (
          <p className="life-empty">No upcoming reminders. Upload a document to auto-generate reminders!</p>
        ) : (
          upcoming.slice(0, 10).map(r => <ReminderCard key={r.id} reminder={r} />)
        )}
      </div>

      {/* Document Scanner */}
      <div className="life-section">
        <h3 className="section-title">📄 Upload Document</h3>
        <p className="fridge-scan-desc" style={{ marginBottom: 8 }}>
          Paste any document text — bill, school email, warranty, medical record. AI will extract key dates, action items, and add reminders automatically.
        </p>
        <select value={docType} onChange={e => setDocType(e.target.value)} className="kitchen-select" style={{ marginBottom: 8 }}>
          <option value="bill">📄 Bill</option>
          <option value="school">🏫 School</option>
          <option value="warranty">🛡️ Warranty</option>
          <option value="medical">🏥 Medical</option>
          <option value="insurance">📋 Insurance</option>
          <option value="tax">📊 Tax</option>
          <option value="contract">📝 Contract</option>
          <option value="receipt">🧾 Receipt</option>
          <option value="other">📎 Other</option>
        </select>
        <textarea
          value={docText}
          onChange={e => setDocText(e.target.value)}
          placeholder="Paste document text here..."
          className="fridge-textarea"
          rows={4}
        />
        <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing || !docText.trim()} style={{ marginTop: 8 }}>
          {analyzing ? '✨ Analyzing...' : '✨ Analyze Document'}
        </button>
      </div>

      {/* Recent Documents */}
      {documents.length > 0 && (
        <div className="life-section">
          <h3 className="section-title">📂 Recent Documents</h3>
          {documents.slice(0, 5).map(doc => (
            <div key={doc.id} className="life-doc-card">
              <div className="life-doc-header">
                <span>{DOC_TYPE_EMOJI[doc.doc_type] ?? '📎'} {doc.title}</span>
              </div>
              {doc.ai_summary && <p className="life-doc-summary">{doc.ai_summary}</p>}
              <span className="life-doc-date">{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderCard({ reminder, overdue }: { reminder: LifeReminder; overdue?: boolean }) {
  const pri = PRIORITY_CONFIG[reminder.priority] ?? PRIORITY_CONFIG.normal;
  return (
    <div className={`life-reminder-card ${overdue ? 'overdue' : ''}`}>
      <span className="reminder-priority" style={{ color: pri.color }}>{pri.emoji}</span>
      <div className="reminder-info">
        <div className="reminder-title">{reminder.title}</div>
        <div className={`reminder-due ${overdue ? 'overdue' : ''}`}>{dueLabel(reminder.due_date)}</div>
      </div>
    </div>
  );
}
