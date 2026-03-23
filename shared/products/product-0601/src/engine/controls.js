/**
 * CMMC 2.0 Level 2 - NIST SP 800-171 Control Taxonomy
 * 14 families, ~110 security requirements
 */

const CONTROL_FAMILIES = [
  { id: "AC", name: "Access Control", count: 30, description: "Limit information system access to authorized users, processes, and devices." },
  { id: "AT", name: "Awareness and Training", count: 5, description: "Ensure managers and users know security risks and policies." },
  { id: "AU", name: "Audit and Accountability", count: 12, description: "Create, protect, retain, and review system audit records." },
  { id: "CM", name: "Configuration Management", count: 11, description: "Establish and maintain baseline configurations and inventories." },
  { id: "IA", name: "Identification and Authentication", count: 12, description: "Identify and authenticate users, devices, and processes." },
  { id: "IR", name: "Incident Response", count: 8, description: "Establish operational incident handling capability." },
  { id: "MA", name: "Maintenance", count: 6, description: "Perform maintenance on organizational systems." },
  { id: "MP", name: "Media Protection", count: 9, description: "Protect system media containing CUI, including during transport." },
  { id: "PE", name: "Physical Protection", count: 6, description: "Limit physical access to systems and equipment." },
  { id: "PS", name: "Personnel Security", count: 5, description: "Screen individuals prior to authorizing access to CUI." },
  { id: "RA", name: "Risk Assessment", count: 6, description: "Assess and manage risk to organizational operations and assets." },
  { id: "CA", name: "Security Assessment", count: 5, description: "Periodically assess security controls and correct deficiencies." },
  { id: "SC", name: "System & Communications Protection", count: 18, description: "Monitor, control, and protect communications at boundaries." },
  { id: "SI", name: "System & Information Integrity", count: 10, description: "Identify, report, and correct system flaws in a timely manner." }
];

// Sample controls per family (representative set for assessment engine)
// In production, this expands to full 110 controls
const CONTROLS = [
  // AC - Access Control
  { id: "AC-1", family: "AC", title: "Access Control Policy and Procedures", description: "Develop, document, and disseminate access control policy.", assessment_qs: ["Is an access control policy documented?", "Is the policy reviewed annually?", "Are procedures defined for account management?"] },
  { id: "AC-2", family: "AC", title: "Account Management", description: "Manage system accounts including creation, modification, disabling, and removal.", assessment_qs: ["Are accounts uniquely assigned to individuals?", "Are temporary accounts auto-expired?", "Is account activity monitored?"] },
  { id: "AC-3", family: "AC", title: "Access Enforcement", description: "Enforce approved authorizations for logical access to information.", assessment_qs: ["Is role-based access control implemented?", "Are access decisions logged?", "Is the principle of least privilege enforced?"] },
  { id: "AC-5", family: "AC", title: "Separation of Duties", description: "Separate duties to prevent malevolent activity.", assessment_qs: ["Are conflicting duties separated?", "Is there oversight for privileged functions?"] },
  { id: "AC-6", family: "AC", title: "Least Privilege", description: "Allow only authorized access needed to accomplish tasks.", assessment_qs: ["Do users operate with least privilege?", "Are admin accounts restricted to designated personnel?", "Is privileged access audited?"] },
  { id: "AC-7", family: "AC", title: "Unsuccessful Logon Attempts", description: "Enforce a limit on consecutive invalid logon attempts.", assessment_qs: ["Is there an account lockout policy?", "After how many failed attempts is an account locked?"] },
  { id: "AC-8", family: "AC", title: "System Use Notification", description: "Display system-use notification before granting access.", assessment_qs: ["Is a logon banner displayed?", "Does the banner identify the system and warn of monitoring?"] },
  { id: "AC-11", family: "AC", title: "Session Lock", description: "Initiate session lock after defined period of inactivity.", assessment_qs: ["Is screen lock configured for all workstations?", "What is the inactivity timeout?"] },
  { id: "AC-12", family: "AC", title: "Session Termination", description: "Automatically terminate a user session after a defined condition.", assessment_qs: ["Are sessions automatically terminated after extended inactivity?"] },
  { id: "AC-17", family: "AC", title: "Remote Access", description: "Authorize and monitor remote access to the system.", assessment_qs: ["Is remote access authorized and documented?", "Is multi-factor authentication required for remote access?", "Is remote access encrypted?"] },
  { id: "AC-18", family: "AC", title: "Wireless Access", description: "Establish configuration requirements for wireless access.", assessment_qs: ["Is wireless access authorized?", "Are wireless networks encrypted (WPA2/WPA3)?", "Is unauthorized wireless access detected?"] },
  { id: "AC-19", family: "AC", title: "Access Control for Mobile Devices", description: "Implement measures to manage mobile device connections.", assessment_qs: ["Are mobile device connections managed?", "Is MDM/MAM in place?"] },
  { id: "AC-20", family: "AC", title: "Use of External Systems", description: "Establish terms for use of external systems.", assessment_qs: ["Are policies for using external systems documented?", "Is CUI access from personal devices restricted?"] },
  { id: "AC-22", family: "AC", title: "Use of Publicly Accessible Computers", description: "Prohibit access from publicly accessible computers.", assessment_qs: ["Is access from public computers prohibited?", "Is the policy communicated to staff?"] },
  // AT - Awareness and Training
  { id: "AT-1", family: "AT", title: "Awareness and Training Policy", description: "Develop awareness and training policy.", assessment_qs: ["Is a security awareness training policy documented?"] },
  { id: "AT-2", family: "AT", title: "Awareness Training", description: "Provide security awareness training to system users.", assessment_qs: ["Is security awareness training provided to all users?", "Is training completed on hire and annually?", "Does training cover CUI handling?"] },
  { id: "AT-3", family: "AT", title: "Role-Based Security Training", description: "Provide role-based training to personnel with security roles.", assessment_qs: ["Is role-based training provided?", "Does training cover insider threat awareness?"] },
  // AU - Audit and Accountability
  { id: "AU-1", family: "AU", title: "Audit and Accountability Policy", description: "Develop audit and accountability policy.", assessment_qs: ["Is an audit policy documented and disseminated?"] },
  { id: "AU-2", family: "AU", title: "Event Logging", description: "Audit events including logon, account management, and object access.", assessment_qs: ["Are audit events defined and logged?", "Are failed logons recorded?", "Are privileged actions logged?"] },
  { id: "AU-3", family: "AU", title: "Content of Audit Records", description: "Ensure audit records contain event type, time, source, and outcome.", assessment_qs: ["Do audit logs capture sufficient detail?", "Are timestamps included?"] },
  { id: "AU-6", family: "AU", title: "Audit Record Review", description: "Review and analyze audit records for unusual activity.", assessment_qs: ["Are audit logs reviewed regularly?", "Who is responsible for log review?"] },
  { id: "AU-8", family: "AU", title: "Time Stamps", description: "Use internal system clocks for audit record timestamps.", assessment_qs: ["Are system clocks synchronized (NTP)?"] },
  { id: "AU-9", family: "AU", title: "Protection of Audit Information", description: "Protect audit information from unauthorized access and modification.", assessment_qs: ["Are audit logs protected from modification?", "Are audit logs backed up?"] },
  { id: "AU-11", family: "AU", title: "Audit Record Retention", description: "Retain audit records per retention requirements.", assessment_qs: ["Are audit logs retained for at least 1 year?"] },
  { id: "AU-12", family: "AU", title: "Audit Record Generation", description: "Audit events across the system.", assessment_qs: ["Is audit logging enabled on all system components?"] },
  // CM - Configuration Management
  { id: "CM-1", family: "CM", title: "Configuration Management Policy", description: "Develop configuration management policy.", assessment_qs: ["Is a configuration management policy documented?"] },
  { id: "CM-2", family: "CM", title: "Baseline Configuration", description: "Maintain baseline configuration under configuration control.", assessment_qs: ["Are system baselines documented?", "Are baselines reviewed when changes occur?"] },
  { id: "CM-3", family: "CM", title: "Configuration Change Control", description: "Control changes to the system.", assessment_qs: ["Is there a change control process?", "Are changes approved before implementation?"] },
  { id: "CM-6", family: "CM", title: "Configuration Settings", description: "Establish configuration settings using security checklists.", assessment_qs: ["Are security configuration standards applied?", "Are systems hardened per benchmarks (CIS, DISA STIG)?"] },
  { id: "CM-7", family: "CM", title: "Least Functionality", description: "Configure systems to provide only essential capabilities.", assessment_qs: ["Are unnecessary services disabled?", "Are unauthorized software installations prevented?"] },
  { id: "CM-8", family: "CM", title: "Component Inventory", description: "Maintain an accurate inventory of system components.", assessment_qs: ["Is a hardware/software inventory maintained?", "Is the inventory updated when changes occur?"] },
  // IA - Identification and Authentication
  { id: "IA-1", family: "IA", title: "ID and Authentication Policy", description: "Develop identification and authentication policy.", assessment_qs: ["Is an authentication policy documented?"] },
  { id: "IA-2", family: "IA", title: "User Identification", description: "Uniquely identify and authenticate users.", assessment_qs: ["Are unique IDs assigned to each user?", "Is shared account usage prohibited?"] },
  { id: "IA-2(1)", family: "IA", title: "Multi-Factor Authentication", description: "Implement MFA for privileged and non-privileged accounts.", assessment_qs: ["Is MFA enabled for all accounts?", "What MFA methods are used?"] },
  { id: "IA-4", family: "IA", title: "Identifier Management", description: "Manage system identifiers.", assessment_qs: ["Are identifiers managed centrally?", "Is re-use of identifiers prohibited?"] },
  { id: "IA-5", family: "IA", title: "Authenticator Management", description: "Manage authenticators including passwords and certificates.", assessment_qs: ["Are password complexity requirements enforced?", "Is there a password rotation policy?"] },
  { id: "IA-5(1)", family: "IA", title: "Password-Based Authentication", description: "Enforce password complexity and rotation.", assessment_qs: ["Minimum password length >= 14 chars?", "Complexity requirements enforced?", "Password history >= 24?"] },
  // IR - Incident Response
  { id: "IR-1", family: "IR", title: "Incident Response Policy", description: "Develop incident response policy.", assessment_qs: ["Is an IR policy documented?"] },
  { id: "IR-2", family: "IR", title: "Incident Response Training", description: "Provide IR training.", assessment_qs: ["Is IR training provided to relevant staff?"] },
  { id: "IR-4", family: "IR", title: "Incident Handling", description: "Implement incident handling capability.", assessment_qs: ["Is there an incident response plan?", "Are incidents categorized and prioritized?"] },
  { id: "IR-5", family: "IR", title: "Incident Monitoring", description: "Track and document security incidents.", assessment_qs: ["Are incidents tracked in a ticketing system?"] },
  { id: "IR-6", family: "IR", title: "Incident Reporting", description: "Report incidents to designated officials.", assessment_qs: ["Is there a reporting chain for incidents?", "Are incidents reported to DoD as required?"] },
  { id: "IR-8", family: "IR", title: "Incident Response Plan", description: "Develop an incident response plan.", assessment_qs: ["Is the IR plan documented and tested?"] },
  // Remaining families use a simplified structure
  { id: "MA-1", family: "MA", title: "System Maintenance Policy", description: "Develop maintenance policy.", assessment_qs: ["Is a maintenance policy documented?"] },
  { id: "MA-2", family: "MA", title: "Controlled Maintenance", description: "Perform controlled maintenance.", assessment_qs: ["Is maintenance performed per schedule?", "Are maintenance records kept?"] },
  { id: "MA-4", family: "MA", title: "Nonlocal Maintenance", description: "Control nonlocal maintenance.", assessment_qs: ["Is remote maintenance authorized and monitored?"] },
  { id: "MA-5", family: "MA", title: "Maintenance Personnel", description: "Authorize maintenance personnel.", assessment_qs: ["Are maintenance personnel screened?"] },
  { id: "MP-1", family: "MP", title: "Media Protection Policy", description: "Develop media protection policy.", assessment_qs: ["Is a media protection policy documented?"] },
  { id: "MP-2", family: "MP", title: "Media Access", description: "Restrict media access to authorized individuals.", assessment_qs: ["Is media access restricted?"] },
  { id: "MP-4", family: "MP", title: "Media Storage", description: "Physically control and store media securely.", assessment_qs: ["Is media stored in controlled areas?"] },
  { id: "MP-5", family: "MP", title: "Media Transport", description: "Protect media during transport.", assessment_qs: ["Is media encrypted during transport?"] },
  { id: "MP-6", family: "MP", title: "Media Sanitization", description: "Sanitize media before disposal.", assessment_qs: ["Is media sanitized before disposal?", "Are sanitization records maintained?"] },
  { id: "MP-7", family: "MP", title: "Media Use", description: "Restrict types of media on system components.", assessment_qs: ["Are USB drives restricted?"] },
  { id: "PE-1", family: "PE", title: "Physical Protection Policy", description: "Develop physical protection policy.", assessment_qs: ["Is a physical protection policy documented?"] },
  { id: "PE-2", family: "PE", title: "Physical Access Authorizations", description: "Maintain access authorization lists.", assessment_qs: ["Is a physical access list maintained?"] },
  { id: "PE-3", family: "PE", title: "Physical Access Control", description: "Enforce physical access controls.", assessment_qs: ["Are physical access controls in place (locks, badges, escorts)?"] },
  { id: "PE-6", family: "PE", title: "Physical Access Monitoring", description: "Monitor physical access.", assessment_qs: ["Is physical access monitored (cameras, logs)?"] },
  { id: "PS-1", family: "PS", title: "Personnel Security Policy", description: "Develop personnel security policy.", assessment_qs: ["Is a personnel security policy documented?"] },
  { id: "PS-2", family: "PS", title: "Position Risk Designation", description: "Assign risk designations to positions.", assessment_qs: ["Are positions designated by risk level?"] },
  { id: "PS-3", family: "PS", title: "Personnel Screening", description: "Screen individuals before authorizing access.", assessment_qs: ["Are background checks performed?"] },
  { id: "RA-1", family: "RA", title: "Risk Assessment Policy", description: "Develop risk assessment policy.", assessment_qs: ["Is a risk assessment policy documented?"] },
  { id: "RA-3", family: "RA", title: "Risk Assessment", description: "Conduct risk assessments periodically.", assessment_qs: ["Are risk assessments performed annually?", "Are risks documented and prioritized?"] },
  { id: "RA-5", family: "RA", title: "Vulnerability Monitoring", description: "Monitor and scan for vulnerabilities.", assessment_qs: ["Are vulnerability scans performed regularly?", "Are critical vulnerabilities remediated promptly?"] },
  { id: "CA-1", family: "CA", title: "Security Assessment Policy", description: "Develop security assessment policy.", assessment_qs: ["Is a security assessment policy documented?"] },
  { id: "CA-2", family: "CA", title: "Security Assessments", description: "Assess security controls periodically.", assessment_qs: ["Are security controls assessed annually?"] },
  { id: "CA-7", family: "CA", title: "Continuous Monitoring", description: "Implement continuous monitoring strategy.", assessment_qs: ["Is continuous monitoring implemented?", "What monitoring tools are in use?"] },
  { id: "CA-8", family: "CA", title: "Penetration Testing", description: "Conduct penetration testing.", assessment_qs: ["Is penetration testing performed annually?"] },
  { id: "SC-1", family: "SC", title: "System & Comms Protection Policy", description: "Develop SC policy.", assessment_qs: ["Is a system and communications protection policy documented?"] },
  { id: "SC-7", family: "SC", title: "Boundary Protection", description: "Monitor and protect communications at boundaries.", assessment_qs: ["Are firewalls deployed at network boundaries?", "Are firewall rules reviewed?"] },
  { id: "SC-8", family: "SC", title: "Transmission Confidentiality", description: "Protect transmitted information.", assessment_qs: ["Is data encrypted in transit (TLS 1.2+)?"] },
  { id: "SC-12", family: "SC", title: "Cryptographic Key Management", description: "Manage cryptographic keys.", assessment_qs: ["Are cryptographic keys managed securely?"] },
  { id: "SC-13", family: "SC", title: "Cryptographic Protection", description: "Use FIPS-validated cryptographic modules.", assessment_qs: ["Are FIPS 140-2 validated modules used?"] },
  { id: "SC-28", family: "SC", title: "Protection at Rest", description: "Protect information at rest.", assessment_qs: ["Is data encrypted at rest?"] },
  { id: "SI-1", family: "SI", title: "System & Info Integrity Policy", description: "Develop SI policy.", assessment_qs: ["Is a system integrity policy documented?"] },
  { id: "SI-2", family: "SI", title: "Flaw Remediation", description: "Identify and correct system flaws.", assessment_qs: ["Are patches applied within defined timelines?", "Is there a patch management process?"] },
  { id: "SI-3", family: "SI", title: "Malicious Code Protection", description: "Implement malware protection.", assessment_qs: ["Is anti-malware deployed on all endpoints?", "Are definitions updated regularly?"] },
  { id: "SI-4", family: "SI", title: "System Monitoring", description: "Monitor for attacks and indicators.", assessment_qs: ["Are intrusion detection/prevention systems deployed?"] },
  { id: "SI-5", family: "SI", title: "Security Alerts", description: "Receive and respond to security alerts.", assessment_qs: ["Are security advisories monitored?"] },
  { id: "SI-7", family: "SI", title: "Software Integrity", description: "Employ integrity verification tools.", assessment_qs: ["Is file integrity monitoring deployed?"] },
  { id: "SI-10", family: "SI", title: "Input Validation", description: "Check information inputs for accuracy.", assessment_qs: ["Is input validation implemented on applications?"] },
  { id: "SI-11", family: "SI", title: "Error Handling", description: "Generate proper error messages.", assessment_qs: ["Do error messages avoid exposing sensitive info?"] },
];

// Assessment response types
const RESPONSE_TYPES = {
  YES_FULLY: { value: "yes_fully", label: "Yes - Fully Implemented", score: 1.0 },
  YES_PARTIALLY: { value: "yes_partially", label: "Yes - Partially Implemented", score: 0.5 },
  NO_PLANNED: { value: "no_planned", label: "No - But Planned", score: 0.2 },
  NO_NOT_STARTED: { value: "no_not_started", label: "No - Not Started", score: 0.0 },
  NOT_APPLICABLE: { value: "na", label: "Not Applicable", score: null }
};

module.exports = { CONTROL_FAMILIES, CONTROLS, RESPONSE_TYPES };
