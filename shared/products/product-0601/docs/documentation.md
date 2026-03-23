# CMMC Shield — Documentation

## Table of Contents

1. [Getting Started](#getting-started)
2. [Gap Assessment](#gap-assessment)
3. [SSP Generation](#ssp-generation)
4. [POA&M Creation](#poam-creation)
5. [Readiness Scoring](#readiness-scoring)
6. [Remediation Tracker](#remediation-tracker)
7. [Billing & Plans](#billing--plans)
8. [API Reference](#api-reference)

---

## Getting Started

### What is CMMC Shield?

CMMC Shield is an AI-powered compliance copilot designed for small defense contractors (1-50 employees) navigating CMMC 2.0 Level 2 certification. It automates the most expensive parts of compliance: gap assessment, SSP generation, POA&M creation, and readiness scoring.

### Account Setup

1. Navigate to `https://app.cmmcshield.com/register`
2. Enter your email, password, and company name
3. Select your plan (Starter $99/mo, Pro $199/mo, or Team $299/mo)
4. Verify your email address
5. Start your first gap assessment

### Key Concepts

- **CMMC 2.0 Level 2**: The cybersecurity maturity level required for handling Controlled Unclassified Information (CUI) on DoD contracts. Based on NIST SP 800-171.
- **110 Controls**: The security requirements across 14 control families that must be implemented.
- **SSP (System Security Plan)**: Document describing how your organization implements each security control.
- **POA&M (Plan of Action & Milestones)**: Document tracking remediation of identified gaps.
- **C3PAO**: CMMC Third-Party Assessment Organization — the certified assessor that evaluates your compliance.

---

## Gap Assessment

### Starting an Assessment

1. Go to **Assessment > New Assessment**
2. Enter your system name and company details
3. Select control families to assess (or assess all 14)

### Assessment Process

The assessment covers all 14 NIST SP 800-171 control families:

| Family ID | Family Name | Controls |
|-----------|-------------|----------|
| AC | Access Control | 30 |
| AT | Awareness and Training | 5 |
| AU | Audit and Accountability | 12 |
| CM | Configuration Management | 11 |
| IA | Identification and Authentication | 12 |
| IR | Incident Response | 8 |
| MA | Maintenance | 6 |
| MP | Media Protection | 9 |
| PE | Physical Protection | 6 |
| PS | Personnel Security | 5 |
| RA | Risk Assessment | 6 |
| CA | Security Assessment | 5 |
| SC | System & Communications Protection | 18 |
| SI | System & Information Integrity | 10 |

### Response Options

For each control question, select one of:

- **Yes - Fully Implemented**: Control is fully in place and documented
- **Yes - Partially Implemented**: Control is partially in place, gaps exist
- **No - But Planned**: Control is not implemented but is planned
- **No - Not Started**: Control is not implemented and not planned
- **Not Applicable**: Control does not apply to your environment

### Adding Notes and Evidence

For each response, you can add:
- **Notes**: Explanation of your implementation status
- **Evidence Reference**: Link or reference to supporting documentation

### Saving Progress

Your assessment auto-saves every 30 seconds. You can also click **Save** at any time. Return to continue where you left off.

---

## SSP Generation

### What is an SSP?

A System Security Plan (SSP) describes how your organization implements each of the 110 NIST SP 800-171 security requirements. It is a required document for CMMC Level 2 certification.

### Generating Your SSP

1. Complete your gap assessment (or at least one control family)
2. Go to **Documents > Generate SSP**
3. CMMC Shield creates a comprehensive SSP including:
   - Cover page with organization details
   - System description and boundary
   - Control implementations for each family
   - Assessment response tables
   - Implementation notes
   - Control status summary
   - Key personnel appendix

### SSP Output Format

SSPs are generated in Markdown format and can be:
- Viewed in the browser
- Exported as PDF
- Downloaded as Markdown for further editing

### SSP Sections

| Section | Description |
|---------|-------------|
| Cover Page | Organization name, system name, document version, date |
| System Description | Purpose, boundary, environment, data flow |
| Control Implementations | Detailed status for each control |
| Status Summary | Score table by family, overall compliance percentage |
| Appendix | Key personnel, acronyms, references |

---

## POA&M Creation

### What is a POA&M?

A Plan of Action & Milestones (POA&M) documents the specific steps your organization will take to correct gaps identified during assessment. It is required for any controls not fully implemented.

### Generating Your POA&M

1. Complete your gap assessment
2. Go to **Documents > Generate POA&M**
3. CMMC Shield creates entries for each identified gap with:
   - Control ID and title
   - Gap description
   - Priority level (high/medium/low)
   - Remediation steps
   - Target completion date
   - Resources required
   - Status tracking

### Priority Scoring

Controls are prioritized based on:
- **High**: Critical security controls (AC-3, AC-6, IA-2(1), SC-8, SC-13, SI-3, SI-4)
- **Medium**: Controls with partial implementation (score 0.3-0.7)
- **Low**: Controls with minor gaps (score > 0.7)

### Tracking Remediation

Update POA&M entries as you implement controls:
1. Go to **Remediation > [Gap Item]**
2. Update status: Not Started → In Progress → Completed
3. Add notes and evidence
4. Your readiness score updates automatically

---

## Readiness Scoring

### How the Score is Calculated

Your C3PAO readiness score is calculated as:

```
Score = (Fully Implemented + Partially Implemented × 0.5) / Assessable Controls × 100
```

- **Fully Implemented** = controls scored yes_fully
- **Partially Implemented** = controls scored yes_partially
- **Assessable Controls** = total controls minus N/A responses

### Score Thresholds

| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100% | Excellent | Ready for C3PAO assessment |
| 70-89% | Good | Minor gaps to address |
| 50-69% | Moderate | Significant work needed |
| Below 50% | At Risk | Major remediation required |

### Family-Level Scores

Each control family shows an individual score so you can focus remediation efforts where they matter most.

---

## Billing & Plans

### Plan Comparison

| Feature | Starter ($99/mo) | Pro ($199/mo) | Team ($299/mo) |
|---------|-----------------|---------------|----------------|
| Assessments | 1/month | Unlimited | Unlimited |
| SSP Generation | Basic | Full | Full |
| POA&M | No | Yes | Yes |
| Remediation Tracker | No | Yes | Yes |
| Readiness Scoring | Basic | Full | Full |
| Team Members | 1 | 1 | Up to 10 |
| Support | Email | Priority | Dedicated |

### Managing Your Subscription

1. Go to **Settings > Billing**
2. View current plan and usage
3. Upgrade or downgrade at any time
4. Changes take effect at the start of the next billing cycle

### Payment

Payments are processed via Stripe. Accepted methods:
- Credit card
- Debit card

---

## API Reference

### Authentication

All API requests require a Bearer token:

```
Authorization: Bearer your-api-token
```

### Endpoints

#### Get Assessments
```
GET /api/assessments
```

#### Create Assessment
```
POST /api/assessments
Content-Type: application/json

{
  "userId": "string",
  "companyName": "string",
  "systemName": "string"
}
```

#### Generate SSP
```
GET /api/documents/ssp
```

#### Generate POA&M
```
GET /api/documents/poam
```

#### Create Checkout Session
```
POST /api/billing
Content-Type: application/json

{
  "plan": "starter|pro|team",
  "email": "string",
  "userId": "string"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request — check payload |
| 401 | Unauthorized — invalid token |
| 404 | Resource not found |
| 409 | Conflict — resource already exists |
| 500 | Internal server error |

---

*CMMC Shield — Built for the Defense Industrial Base*
*Version 1.0 | CMMC 2.0 Level 2 | NIST SP 800-171 Rev 2*
