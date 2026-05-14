// Conflux Home — Family Setup Modal
// Add/edit family members with age group selection.

import { useState } from 'react';
import type { AgeGroup, CreateFamilyMemberRequest } from '../types';
import { AGE_GROUP_CONFIG } from '../types';

interface FamilySetupProps {
  onSubmit: (req: CreateFamilyMemberRequest) => Promise<void>;
  onCancel: () => void;
  parentId?: string;  // if adding a child to existing parent
}

const EMOJI_OPTIONS = ['👨', '👩', '👦', '👧', '🧒', '👶', '🧓', '👴', '👵', '🧑', '👤'];
const COLOR_OPTIONS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function FamilySetup({ onSubmit, onCancel, parentId }: FamilySetupProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
  const [avatar, setAvatar] = useState('👤');
  const [color, setColor] = useState('#6366f1');
  const [submitting, setSubmitting] = useState(false);

  // Auto-suggest age group based on age
  const handleAgeChange = (val: string) => {
    const num = val ? parseInt(val, 10) : '';
    setAge(num);
    if (typeof num === 'number' && !isNaN(num)) {
      if (num <= 2) setAgeGroup('toddler');
      else if (num <= 5) setAgeGroup('preschool');
      else if (num <= 13) setAgeGroup('kid');
      else if (num <= 18) setAgeGroup('teen');
      else if (num <= 29) setAgeGroup('young_adult');
      else setAgeGroup('adult');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        age: typeof age === 'number' ? age : undefined,
        age_group: ageGroup,
        avatar,
        color,
        parent_id: parentId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content family-setup" onClick={e => e.stopPropagation()}>
        <h2>👋 Add Family Member</h2>
        <p className="modal-subtitle">Everyone gets their own AI agents, tailored to their age.</p>

        {/* Name */}
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Emma"
            autoFocus
          />
        </div>

        {/* Age */}
        <div className="form-group">
          <label>Age (optional)</label>
          <input
            type="number"
            value={age}
            onChange={e => handleAgeChange(e.target.value)}
            placeholder="e.g., 8"
            min={0}
            max={120}
          />
        </div>

        {/* Age Group */}
        <div className="form-group">
          <label>Age Group</label>
          <div className="age-group-grid">
            {(Object.entries(AGE_GROUP_CONFIG) as [AgeGroup, typeof AGE_GROUP_CONFIG[AgeGroup]][]).map(
              ([key, config]) => (
                <button
                  key={key}
                  className={`age-group-btn ${ageGroup === key ? 'selected' : ''}`}
                  onClick={() => setAgeGroup(key)}
                  style={{ borderColor: ageGroup === key ? config.color : 'transparent' }}
                >
                  <span className="age-group-emoji">{config.emoji}</span>
                  <span className="age-group-label">{config.label}</span>
                  <span className="age-group-range">{config.ageRange}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Avatar */}
        <div className="form-group">
          <label>Avatar</label>
          <div className="emoji-picker">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                className={`emoji-btn ${avatar === e ? 'selected' : ''}`}
                onClick={() => setAvatar(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="form-group">
          <label>Color</label>
          <div className="color-picker">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
