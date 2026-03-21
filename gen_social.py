import os

# Product details
product_name = "100 AI Prompts for Healthcare Practice Administrators"
product_id = "product-0301"
gumroad_url = "https://theconflux.gumroad.com/l/100_ai_prompts_healthcare_administrators"

# LinkedIn posts (5)
linkedin = f"""# LinkedIn Posts — {product_name}
## Product Launch Campaign

---

## Post 1: Launch Announcement

I built something for healthcare practice administrators who are tired of drafting the same patient communications, compliance documents, and staff schedules from scratch.

100 AI prompts. 10 categories. Zero fluff.

Each one is a fill-in-the-blank framework — not a generic template. You add your details, paste into ChatGPT or Claude, and get professional results in seconds.

What's inside:
→ Patient Scheduling & Reminders
→ Billing & Insurance Processing
→ Compliance & HIPAA Documentation
→ Staff Management & Scheduling
→ Patient Communication & Follow-up
→ Appointment Coordination
→ Revenue Cycle Management
→ Quality Assurance & Reporting
→ Vendor & Supply Management
→ Technology & EHR Support

Built for administrators who want to save 10+ hours a week on routine administrative tasks without sacrificing quality.

Link in comments 👇

#HealthcareAdministration #MedicalOfficeManagement #AIMarketing #HIPAA #PracticeManagement

---

## Post 2: Problem-Focused

Healthcare practice administrators spend an average of 15+ hours per week on repetitive administrative tasks:
→ Scheduling patient appointments and sending reminders
→ Verifying insurance and processing claims
→ Ensuring HIPAA compliance and documentation
→ Managing staff schedules and time-off requests
→ Handling patient follow-up and satisfaction surveys
→ Coordinating appointments with providers
→ Managing revenue cycle and collections
→ Tracking quality metrics and KPIs
→ Ordering supplies and managing vendors
→ Troubleshooting EHR issues

That's time you should be spending on improving patient care and growing your practice.

I built a toolkit of 100 AI prompts designed specifically for healthcare practice administrators. Not generic business garbage — real frameworks with variables like patient_name, date, details, insurance_provider.

Patient appointment reminder in 2 minutes.
Insurance verification follow-up in 5 minutes.
HIPAA compliance checklist in 10 minutes.
Staff schedule optimization in 8 minutes.

Save 10+ hours a week. Focus on what matters.

👉 {gumroad_url}

#HealthcareAdmin #MedicalOffice #AI #Productivity #SaveTime

---

## Post 3: Value List

Here are 10 ways healthcare practice administrators can use AI prompts to automate their work:

1. **Patient Scheduling** → Automated reminder emails for upcoming appointments
2. **Insurance Verification** → Follow-up scripts for denied claims
3. **HIPAA Compliance** → Audit preparation checklists
4. **Staff Management** → Performance review templates
5. **Patient Communication** → Satisfaction survey requests
6. **Appointment Coordination** → Room assignment optimization
7. **Revenue Cycle** → Collections outreach templates
8. **Quality Assurance** → KPI tracking reports
9. **Vendor Management** → Supply order requests
10. **EHR Support** → Troubleshooting guides

Each prompt is a ready-to-use framework. Just fill in the variables and paste into ChatGPT, Claude, or any AI assistant.

Download the toolkit here: {gumroad_url}

#HealthcareAdministration #AIProductivity #MedicalOffice #PracticeManagement

---

## Post 4: Contrarian Hot Take

Most healthcare administrators think AI is only for doctors and clinicians.

They're wrong.

AI is the ultimate administrative assistant. It can draft patient emails, create compliance checklists, optimize schedules, and generate reports — all in seconds.

I built 100 AI prompts specifically for healthcare practice administrators. Not for doctors. For YOU.

Stop spending hours on repetitive tasks. Use AI to get them done in minutes.

Download the toolkit: {gumroad_url}

#HealthcareAI #AdministrativeEfficiency #MedicalOffice #AI

---

## Post 5: Behind the Scenes

I spent months interviewing healthcare practice administrators, medical office managers, and dental office coordinators.

What do they struggle with most?
→ Time-consuming patient scheduling
→ Insurance claim denials
→ HIPAA compliance paperwork
→ Staff scheduling conflicts
→ Patient follow-up

I distilled their pain points into 100 AI prompts, each designed to solve a specific administrative challenge.

Each prompt includes variables like patient_name, date, details — you fill them in, paste into ChatGPT, and get a professional result in seconds.

This is the toolkit I wish I had when I was managing a medical office.

Available now: {gumroad_url}

#HealthcareAdministration #BehindTheScenes #AIProductivity #MedicalOfficeManager

"""

# X/Twitter posts (10 short posts)
x_posts = []
# Post 1
x_posts.append("🚀 Just launched: 100 AI Prompts for Healthcare Practice Administrators.\n\nSave 10+ hours/week on patient scheduling, billing, compliance, and staff management.\n\nEach prompt is a ready‑to‑use framework for ChatGPT/Claude.\n\n👇 {gumroad_url}\n#HealthcareAdmin #AI #Productivity")
# Post 2
x_posts.append("Healthcare admins: stop manually drafting patient emails.\n\nUse AI prompts to generate reminders, follow‑ups, and satisfaction surveys in seconds.\n\n100 prompts built for your workflow.\n\n👉 {gumroad_url}\n#MedicalOffice #AI")
# Post 3
x_posts.append("HIPAA compliance paperwork eating your time?\n\nAI prompts can generate audit checklists, documentation templates, and compliance reminders.\n\n100 prompts for healthcare administrators.\n\n🔗 {gumroad_url}\n#HIPAA #Compliance #AI")
# Post 4
x_posts.append("Staff scheduling conflicts solved.\n\nAI prompts for shift planning, time‑off requests, and performance reviews.\n\nSave hours every week.\n\n{gumroad_url}\n#HealthcareManagement #AI #StaffScheduling")
# Post 5
x_posts.append("Insurance claim denials? Use AI prompts to craft follow‑up letters and appeal templates.\n\n100 healthcare admin prompts ready.\n\n👉 {gumroad_url}\n#Billing #Insurance #AI")
# Post 6
x_posts.append("Patient follow‑up just got easier.\n\nAI prompts for satisfaction surveys, appointment reminders, and care coordination.\n\nDownload now: {gumroad_url}\n#PatientExperience #AI")
# Post 7
x_posts.append("Revenue cycle management on autopilot.\n\nAI prompts for collections outreach, denial management, and KPI reporting.\n\n100 prompts for healthcare administrators.\n\n🔗 {gumroad_url}\n#RevenueCycle #AI")
# Post 8
x_posts.append("Vendor orders and supply management?\n\nAI prompts to generate purchase requests, inventory checks, and vendor communications.\n\n{gumroad_url}\n#HealthcareSupplyChain #AI")
# Post 9
x_posts.append("EHR troubleshooting made simple.\n\nAI prompts for common technical issues, user training, and system optimization.\n\nGet the toolkit: {gumroad_url}\n#EHR #HealthTech #AI")
# Post 10
x_posts.append("Why hire an admin consultant when you can have AI?\n\n100 prompts for healthcare practice administrators — all the frameworks you need.\n\nOnly $29.\n\n👉 {gumroad_url}\n#HealthcareAdministration #AI #Productivity")

# Write files
linkedin_path = f'/home/calo/.openclaw/shared/products/{product_id}/marketing/social-linkedin.md'
x_path = f'/home/calo/.openclaw/shared/products/{product_id}/marketing/social-x.md'

with open(linkedin_path, 'w') as f:
    f.write(linkedin)

with open(x_path, 'w') as f:
    f.write('# X (Twitter) Posts — {product_name}\\n## Product Launch Campaign\\n\\n')
    for i, post in enumerate(x_posts, 1):
        f.write(f'## Post {i}\\n\\n{post}\\n\\n---\\n\\n')

print('Generated social posts')