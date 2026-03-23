/**
 * CMMC Shield - Gap Assessment Engine
 * Guides contractors through NIST SP 800-171 control assessment
 */

const { CONTROLS, CONTROL_FAMILIES, RESPONSE_TYPES } = require('./controls');

class GapAssessmentEngine {
  constructor() {
    this.controls = CONTROLS;
    this.families = CONTROL_FAMILIES;
    this.responseTypes = RESPONSE_TYPES;
  }

  /**
   * Generate a structured assessment questionnaire
   * @param {Object} options - { familyFilter, includeNA }
   * @returns {Object} questionnaire with grouped controls and questions
   */
  generateQuestionnaire(options = {}) {
    const { familyFilter = null, includeNA = true } = options;
    let controls = this.controls;
    if (familyFilter) {
      controls = controls.filter(c => c.family === familyFilter);
    }

    const families = {};
    for (const ctrl of controls) {
      if (!families[ctrl.family]) {
        const fam = this.families.find(f => f.id === ctrl.family);
        families[ctrl.family] = {
          id: ctrl.family,
          name: fam ? fam.name : ctrl.family,
          description: fam ? fam.description : '',
          controls: []
        };
      }
      families[ctrl.family].controls.push({
        control_id: ctrl.id,
        title: ctrl.title,
        description: ctrl.description,
        questions: (ctrl.assessment_qs || []).map((q, i) => ({
          id: `${ctrl.id}-q${i + 1}`,
          text: q,
          response: null,
          notes: '',
          evidence_ref: ''
        }))
      });
    }

    return {
      generated_at: new Date().toISOString(),
      framework: "CMMC 2.0 Level 2",
      nist_basis: "NIST SP 800-171 Rev 2",
      total_controls: controls.length,
      families: Object.values(families),
      response_options: Object.values(this.responseTypes)
    };
  }

  /**
   * Process assessment responses and identify gaps
   * @param {Object} assessment - Completed questionnaire with responses
   * @returns {Object} gap analysis with scores, gaps, and remediation priorities
   */
  analyzeGaps(assessment) {
    const results = {
      assessed_at: new Date().toISOString(),
      total_controls: 0,
      fully_implemented: 0,
      partially_implemented: 0,
      not_implemented: 0,
      not_applicable: 0,
      gaps: [],
      by_family: {}
    };

    for (const family of assessment.families) {
      const famResult = {
        id: family.id,
        name: family.name,
        total: 0,
        implemented: 0,
        partial: 0,
        not_implemented: 0,
        na: 0,
        score: 0
      };

      for (const control of family.controls) {
        const responses = control.questions || [];
        if (responses.length === 0) continue;

        famResult.total++;
        results.total_controls++;

        const avgScore = this._calculateControlScore(responses);
        
        if (avgScore >= 0.9) {
          famResult.implemented++;
          results.fully_implemented++;
        } else if (avgScore >= 0.3) {
          famResult.partial++;
          results.partially_implemented++;
          results.gaps.push({
            control_id: control.control_id,
            title: control.title,
            family: family.id,
            family_name: family.name,
            status: 'partial',
            score: avgScore,
            priority: this._getPriority(control.control_id, avgScore),
            remediation: this._getRemediationHint(control.control_id)
          });
        } else {
          famResult.not_implemented++;
          results.not_implemented++;
          results.gaps.push({
            control_id: control.control_id,
            title: control.title,
            family: family.id,
            family_name: family.name,
            status: 'not_implemented',
            score: avgScore,
            priority: 'high',
            remediation: this._getRemediationHint(control.control_id)
          });
        }
      }

      const assessable = famResult.total - famResult.na;
      famResult.score = assessable > 0
        ? Math.round(((famResult.implemented + famResult.partial * 0.5) / assessable) * 100)
        : 100;
      
      results.by_family[family.id] = famResult;
    }

    const assessable = results.total_controls - results.not_applicable;
    results.overall_score = assessable > 0
      ? Math.round(((results.fully_implemented + results.partially_implemented * 0.5) / assessable) * 100)
      : 100;

    // Sort gaps by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    results.gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return results;
  }

  _calculateControlScore(responses) {
    const scored = responses.filter(r => r.response && r.response !== 'na');
    if (scored.length === 0) return 1.0;
    const total = scored.reduce((sum, r) => {
      const rt = Object.values(this.responseTypes).find(t => t.value === r.response);
      return sum + (rt ? rt.score : 0);
    }, 0);
    return total / scored.length;
  }

  _getPriority(controlId, score) {
    const criticalControls = ['AC-3', 'AC-6', 'IA-2(1)', 'IA-5', 'SC-8', 'SC-13', 'SC-28', 'SI-3', 'SI-4', 'AU-2', 'AU-9', 'CM-7'];
    if (criticalControls.includes(controlId)) return 'high';
    if (score < 0.3) return 'high';
    if (score < 0.7) return 'medium';
    return 'low';
  }

  _getRemediationHint(controlId) {
    const hints = {
      'AC-1': 'Document access control policy with annual review cycle.',
      'AC-2': 'Implement identity management system with automated account lifecycle.',
      'AC-3': 'Deploy RBAC with centralized access control lists.',
      'AC-6': 'Audit all privileged accounts; implement privilege escalation workflows.',
      'IA-2(1)': 'Deploy MFA solution (e.g., Duo, Microsoft Authenticator) for all accounts.',
      'IA-5': 'Enforce password policy via Active Directory or identity provider.',
      'SC-7': 'Deploy next-gen firewall with documented rule review process.',
      'SC-8': 'Enforce TLS 1.2+ on all external communications; VPN for internal.',
      'SC-13': 'Audit all cryptographic modules for FIPS 140-2/3 validation.',
      'SC-28': 'Enable BitLocker (Windows) or FileVault (Mac) on all endpoints.',
      'SI-2': 'Implement automated patch management (WSUS, SCCM, or cloud equivalent).',
      'SI-3': 'Deploy enterprise anti-malware with real-time scanning and auto-update.',
      'SI-4': 'Deploy SIEM or equivalent for continuous monitoring.',
      'AU-2': 'Enable audit logging on all systems; centralize in SIEM.',
      'AU-9': 'Set log retention to 1+ year; restrict log modification to admins.',
      'CM-7': 'Disable unnecessary services; implement application whitelisting.',
    };
    return hints[controlId] || `Review and implement ${controlId} per NIST SP 800-171 guidance.`;
  }
}

module.exports = { GapAssessmentEngine };
