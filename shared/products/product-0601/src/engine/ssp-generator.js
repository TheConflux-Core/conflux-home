/**
 * CMMC Shield - SSP (System Security Plan) Document Generator
 * Generates CMMC-compliant SSP documents from assessment data
 */

const { CONTROLS, CONTROL_FAMILIES } = require('./controls');

class SSPGenerator {
  constructor() {
    this.version = "1.0";
  }

  /**
   * Generate a complete SSP document in Markdown format
   * @param {Object} params - { companyName, systemName, assessment, contacts }
   * @returns {string} Markdown SSP document
   */
  generate(params) {
    const { companyName, systemName, assessment, contacts = {} } = params;
    const date = new Date().toISOString().split('T')[0];

    let doc = '';
    doc += this._coverPage(companyName, systemName, date);
    doc += this._systemDescription(companyName, systemName);
    doc += this._controlImplementations(assessment);
    doc += this._controlStatusSummary(assessment);
    doc += this._appendix(contacts);

    return doc;
  }

  _coverPage(company, system, date) {
    return `# System Security Plan (SSP)
## CMMC 2.0 Level 2 Compliance

---

**Organization:** ${company}
**System Name:** ${system}
**Document Version:** 1.0
**Date:** ${date}
**Classification:** CUI // SP-EXEMPT

---

## Document Control

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | ${date} | CMMC Shield | Initial SSP from automated assessment |

---

`;
  }

  _systemDescription(company, system) {
    return `## 1. System Description

### 1.1 System Purpose
${system} processes, stores, and transmits Controlled Unclassified Information (CUI) in support of ${company}'s defense contracts.

### 1.2 System Boundary
- **Network boundary:** Corporate LAN/WAN, cloud infrastructure, remote access endpoints
- **Data types:** CUI, Federal Contract Information (FCI), company proprietary data
- **Users:** Employees, contractors, subcontractors with authorized access
- **External connections:** DoD systems, C3PAO assessors, cloud service providers

### 1.3 System Environment
| Component | Description |
|-----------|-------------|
| Operating Systems | Windows 10/11 Pro, Linux (RHEL/Ubuntu) |
| Cloud Services | AWS GovCloud / Azure Government / GCC High |
| Email | Microsoft 365 GCC / GCC High |
| Authentication | Active Directory + MFA (Duo/Azure AD) |
| Endpoint Protection | Enterprise AV/EDR solution |
| Backup | Automated daily backup with encryption |

### 1.4 Data Flow
1. CUI enters via authorized DoD contract channels
2. CUI is stored in encrypted repositories (at rest)
3. CUI is transmitted via encrypted channels (in transit)
4. CUI is accessed by authorized personnel via MFA-protected systems
5. CUI is disposed of per media sanitization procedures

---

`;
  }

  _controlImplementations(assessment) {
    let section = `## 2. Security Control Implementations\n\n`;
    
    const families = assessment.families || [];
    for (const family of families) {
      const famInfo = CONTROL_FAMILIES.find(f => f.id === family.id);
      section += `### 2.${families.indexOf(family) + 1} ${family.name} (${family.id})\n\n`;
      section += `**Family Description:** ${famInfo ? famInfo.description : ''}\n\n`;

      for (const control of family.controls) {
        section += `#### ${control.control_id}: ${control.title}\n\n`;
        section += `**Status:** ${this._getImplementationStatus(control)}\n\n`;
        
        if (control.questions && control.questions.length > 0) {
          section += `**Assessment Responses:**\n\n`;
          section += `| Question | Response | Notes |\n`;
          section += `|----------|----------|-------|\n`;
          for (const q of control.questions) {
            const response = q.response || 'Not assessed';
            const notes = q.notes || '-';
            section += `| ${q.text} | ${response} | ${notes} |\n`;
          }
          section += '\n';
        }

        section += `**Implementation Details:**\n`;
        section += this._getImplementationNotes(control);
        section += '\n\n';
      }
    }

    return section;
  }

  _getImplementationStatus(control) {
    if (!control.questions || control.questions.length === 0) return '⏳ Not Yet Assessed';
    
    const responses = control.questions.filter(q => q.response);
    if (responses.length === 0) return '⏳ Not Yet Assessed';

    const scores = responses.map(q => {
      if (q.response === 'yes_fully') return 1;
      if (q.response === 'yes_partially') return 0.5;
      if (q.response === 'no_planned') return 0.2;
      if (q.response === 'na') return null;
      return 0;
    }).filter(s => s !== null);

    if (scores.length === 0) return 'N/A';
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 0.9) return '✅ Fully Implemented';
    if (avg >= 0.5) return '🟡 Partially Implemented';
    if (avg >= 0.2) return '🟠 Planned';
    return '🔴 Not Implemented';
  }

  _getImplementationNotes(control) {
    const notes = {
      'AC-1': '- Policy reviewed annually by IT Security Officer\n- Disseminated to all employees via intranet\n- Acknowledgment required from all staff',
      'AC-2': '- Active Directory manages all accounts\n- Automated deprovisioning via HR feed\n- 90-day inactive account removal automated',
      'IA-2(1)': '- MFA deployed via [Provider] for all accounts\n- Hardware tokens available for privileged users\n- Backup codes stored securely',
      'SC-7': '- Next-gen firewall at network perimeter\n- Internal segmentation between user and server networks\n- Quarterly firewall rule review',
      'SC-13': '- All encryption uses FIPS 140-2 validated modules\n- TLS 1.2+ enforced on all endpoints\n- Certificate management via PKI',
    };
    return notes[control.control_id] || '- Implementation documented in system configuration records\n- Reviewed during annual assessment';
  }

  _controlStatusSummary(assessment) {
    let section = `## 3. Control Status Summary\n\n`;
    section += `| Family | Total | Implemented | Partial | Not Implemented | Score |\n`;
    section += `|--------|-------|-------------|---------|-----------------|-------|\n`;

    for (const [famId, data] of Object.entries(assessment.by_family || {})) {
      section += `| ${data.name} (${famId}) | ${data.total} | ${data.implemented} | ${data.partial} | ${data.not_implemented} | ${data.score}% |\n`;
    }

    section += `\n**Overall Compliance Score:** ${assessment.overall_score || 0}%\n\n`;
    section += `**Total Gaps Identified:** ${(assessment.gaps || []).length}\n\n`;

    return section;
  }

  _appendix(contacts) {
    return `## Appendix A: Key Personnel

| Role | Name | Email | Phone |
|------|------|-------|-------|
| System Owner | ${contacts.systemOwner || '[Name]'} | ${contacts.systemOwnerEmail || '[Email]'} | ${contacts.systemOwnerPhone || '[Phone]'} |
| ISSM | ${contacts.issm || '[Name]'} | ${contacts.issmEmail || '[Email]'} | ${contacts.issmPhone || '[Phone]'} |
| ISSO | ${contacts.isso || '[Name]'} | ${contacts.issoEmail || '[Email]'} | ${contacts.issoPhone || '[Phone]'} |

## Appendix B: Acronyms

- **CMMC:** Cybersecurity Maturity Model Certification
- **CUI:** Controlled Unclassified Information
- **SSP:** System Security Plan
- **POA&M:** Plan of Action and Milestones
- **C3PAO:** CMMC Third-Party Assessment Organization
- **DIB:** Defense Industrial Base
- **NIST:** National Institute of Standards and Technology

---

*Generated by CMMC Shield — AI Compliance Copilot*
*Document Version: 1.0 | Framework: CMMC 2.0 Level 2*
`;
  }
}

module.exports = { SSPGenerator };
