import os
import fitz  # PyMuPDF
import docx
import pandas as pd

os.makedirs("samples", exist_ok=True)

# 1. Information Security Policy (.docx)
doc = docx.Document()
doc.add_heading("Enterprise Information Security & Compliance Policy", level=0)
doc.add_heading("1. Multi-Factor Authentication (MFA) Standards", level=1)
doc.add_paragraph(
    "All employees, contractors, and third-party vendors accessing company systems "
    "must enforce hardware-backed or authenticator-app Multi-Factor Authentication (MFA). "
    "SMS-based OTP is strictly prohibited for administrative or code repository access."
)
doc.add_heading("2. Remote Work and Virtual Private Network (VPN)", level=1)
doc.add_paragraph(
    "When accessing internal servers, databases, or confidential customer telemetry from "
    "untrusted networks, employees must route all traffic through the corporate WireGuard VPN. "
    "Split tunneling is disabled on managed corporate devices."
)
doc.add_heading("3. Data Retention and Encryption Standards", level=1)
doc.add_paragraph(
    "Customer personal data (PII) must be encrypted at rest using AES-256-GCM and in transit "
    "using TLS 1.3. Logs and audit records must be retained in immutable cold storage for a minimum "
    "of 365 days in accordance with SOC2 Type II and ISO 27001 requirements."
)
doc.save("samples/Information_Security_Policy.docx")

# 2. Travel & Expense Policy (.pdf)
pdf_doc = fitz.open()
page1 = pdf_doc.new_page()
text_page1 = """Enterprise Travel & Expense Reimbursement Policy

Section 1: General Principles
Employees incurring legitimate business expenses on behalf of the company are entitled to timely reimbursement. All expense reports must be submitted within 30 days of expense incurrence via the finance portal with itemized receipts.

Section 2: Air Travel and Ground Transportation
Domestic flights under 6 hours must be booked in Economy Class. Flights exceeding 6 continuous hours qualify for Premium Economy. Rideshare (Uber/Lyft) is reimbursable for official travel between airport, lodging, and client sites.

Section 3: Lodging and Hotel Caps
Standard hotel room rates are capped at $250 per night in tier-1 metropolitan cities and $180 per night elsewhere. Incidental expenses such as in-room movies or minibar refreshments are non-reimbursable.
"""
page1.insert_text((50, 60), text_page1, fontsize=11, fontname="helv")

page2 = pdf_doc.new_page()
text_page2 = """Section 4: Meal Per Diem and Client Entertainment
Daily meals are subsidized up to a maximum per diem of $75 per day ($20 breakfast, $25 lunch, $30 dinner). Alcohol is eligible for reimbursement only during pre-approved client entertainment dinners with prior director approval.

Section 5: Submission and Approval Workflow
All expenses exceeding $1,000 require dual approval from the department head and VP of Finance. Reimbursements are processed via ACH direct deposit within two payroll cycles.
"""
page2.insert_text((50, 60), text_page2, fontsize=11, fontname="helv")
pdf_doc.save("samples/Travel_and_Expense_Policy.pdf")
pdf_doc.close()

# 3. Employee Handbook (.txt)
with open("samples/Employee_Handbook_2025.txt", "w", encoding="utf-8") as f:
    f.write("""Enterprise Employee Handbook & Workplace Guidelines (2025 Edition)

1. Annual Paid Leave (PTO)
Full-time employees receive 20 days of paid vacation leave per calendar year. Leave accrues monthly at a rate of 1.67 days. A maximum of 5 unused leave days can be rolled over into the subsequent fiscal year.

2. Medical and Sick Leave
Employees are granted 10 paid medical leave days per year. Absences exceeding three consecutive business days require medical certification from a licensed physician.

3. Remote and Hybrid Work Schedule
The organization operates on a hybrid schedule. Employees are required to be on-site on Tuesdays and Thursdays for collaborative syncs, with flexibility to work remotely on Mondays, Wednesdays, and Fridays.

4. Health, Dental, and Wellness Benefits
Comprehensive health insurance coverage is effective on the first day of employment. The company covers 100% of employee premiums and 75% of dependent premiums. An annual $800 wellness stipend is provided for gym memberships and fitness equipment.

5. Code of Professional Conduct
The organization upholds a zero-tolerance policy towards harassment, discrimination, and retaliation. Violations will result in immediate disciplinary review up to and including termination.
""")

# 4. Financial Summary Q3 (.csv)
df_finance = pd.DataFrame([
    {"Department": "Engineering", "Q3_Budget_USD": 1250000, "Q3_Actual_USD": 1180000, "Variance_Pct": -5.6, "Headcount": 48},
    {"Department": "Sales & Marketing", "Q3_Budget_USD": 950000, "Q3_Actual_USD": 995000, "Variance_Pct": 4.7, "Headcount": 32},
    {"Department": "Customer Success", "Q3_Budget_USD": 420000, "Q3_Actual_USD": 410000, "Variance_Pct": -2.4, "Headcount": 18},
    {"Department": "Operations & HR", "Q3_Budget_USD": 380000, "Q3_Actual_USD": 372000, "Variance_Pct": -2.1, "Headcount": 12},
    {"Department": "Legal & Compliance", "Q3_Budget_USD": 210000, "Q3_Actual_USD": 205000, "Variance_Pct": -2.4, "Headcount": 6},
])
df_finance.to_csv("samples/Financial_Summary_Q3.csv", index=False)

# 5. Engineering Architecture Standards (.txt)
with open("samples/Engineering_Architecture_Standards.txt", "w", encoding="utf-8") as f:
    f.write("""Engineering Architecture & Microservices Guidelines

1. API Design & Versioning
All backend services must expose RESTful APIs under '/api/v1' with semantic versioning. OpenAPI / Swagger documentation is mandatory. Asynchronous endpoints for long-running workflows must return HTTP 202 Accepted.

2. Vector Database & RAG Infrastructure
Vector search operations utilize Qdrant with Cosine distance metric and 768-dimensional float32 embeddings. Payloads must include organization_id, access_level, and allowed_roles to enforce multi-tenant isolation at the query filter level.

3. Database Access & ORM
Services utilize SQLAlchemy 2.0 async engine with connection pooling. Migrations are managed via Alembic. Direct raw SQL execution without parameterized queries is strictly prohibited to prevent SQL injection vulnerabilities.
""")

print("Successfully generated 5 sample enterprise documents in samples/")
