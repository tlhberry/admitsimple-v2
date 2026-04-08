# HIPAA Business Associate Agreement (BAA) Guide
## AdmitSimple — Vendor BAAs + Client BAA Template

---

## PART 1: Signing BAAs With Your Vendors

---

### 1. AWS — Amazon Web Services

**Why:** All patient data is stored on AWS (RDS, EC2, S3). AWS must be a signed BAA before you go live.

**How to sign:**
1. Log in to your AWS account at https://console.aws.amazon.com
2. In the top-right, click your account name → **My Account**
3. Scroll down to **Configure AWS Artifact** and click it
4. Go to **AWS Artifact** → **Agreements**
5. Under "Organization agreements," find **AWS Business Associate Addendum (BAA)**
6. Click **Download** to review it, then click **Accept**
7. Save a copy — it auto-populates with your account info

**Cost:** Free  
**Turnaround:** Instant — it's a self-service click-through  
**What it covers:** All AWS services used under that account (RDS, EC2, S3, VPC, CloudWatch, etc.)

**Important:** If you create separate AWS accounts per client (recommended), each account must accept the BAA individually. The steps above are the same for each account.

---

### 2. Twilio

**Why:** Twilio handles inbound calls, outbound calls, and SMS — all of which may contain PHI (caller names, inquiry details, treatment discussion).

**How to sign:**
1. Log in to https://console.twilio.com
2. Click your account name (top right) → **Account Settings**
3. In the left sidebar, click **General Settings**
4. Scroll to **HIPAA Eligible Products** or search for "BAA" in the support search
5. Twilio does **not** offer a self-service BAA — you must contact their sales/compliance team

**Email to send:**

> **To:** hipaa@twilio.com  
> **Subject:** BAA Request — AdmitSimple (Addiction Treatment SaaS)
>
> Hi Twilio Compliance Team,
>
> I am the owner of AdmitSimple, a HIPAA-covered admissions CRM built for addiction treatment centers. We use Twilio for inbound/outbound voice calls and SMS messaging, which may involve protected health information (PHI).
>
> We are requesting a Business Associate Agreement (BAA) with Twilio to ensure compliance with HIPAA regulations.
>
> Account SID: [YOUR ACCOUNT SID]  
> Account Name: [YOUR ACCOUNT NAME]  
> Contact: [YOUR NAME]  
> Email: [YOUR EMAIL]  
> Phone: [YOUR PHONE]
>
> Please let me know what information you need from us to complete this process.
>
> Thank you,  
> [YOUR NAME]  
> AdmitSimple

**Cost:** Requires Twilio's HIPAA-eligible plan (typically Enterprise tier — contact sales for pricing)  
**Turnaround:** 3–10 business days  
**What it covers:** All Twilio services (Voice, SMS, Verify) under that account SID

---

### 3. Anthropic

**Why:** Patient inquiry details, pre-screen information, and referral data may be passed to Claude AI for stage suggestions, task generation, and referral parsing.

**How to sign:**
1. Go to https://www.anthropic.com/contact-sales or https://console.anthropic.com
2. Anthropic does **not** offer a self-service BAA — contact their enterprise/compliance team

**Email to send:**

> **To:** sales@anthropic.com  
> **CC:** privacy@anthropic.com  
> **Subject:** HIPAA BAA Request — Healthcare SaaS Application
>
> Hi Anthropic Team,
>
> I am the founder of AdmitSimple, a HIPAA-covered admissions CRM for addiction treatment centers. We use the Claude API to power AI features including stage recommendations, task generation, and referral document parsing. These features may process protected health information (PHI).
>
> We are requesting a Business Associate Agreement (BAA) with Anthropic to maintain HIPAA compliance for our customers.
>
> Our usage:
> - API: Claude claude-opus-4-5 via the Anthropic Messages API
> - Use cases: Clinical admissions pipeline AI suggestions, referral document parsing, task board generation
> - Data involved: Patient inquiry details, insurance information, clinical notes (PHI)
>
> Organization: AdmitSimple  
> Contact: [YOUR NAME]  
> Email: [YOUR EMAIL]  
> Current Anthropic Organization ID: [FOUND IN CONSOLE → ACCOUNT SETTINGS]
>
> Please advise on next steps and any enterprise plan requirements.
>
> Thank you,  
> [YOUR NAME]

**Cost:** Anthropic BAAs are typically tied to an Enterprise plan — expect $40–$200+/month minimum commitment. Contact sales for current pricing.  
**Turnaround:** 5–15 business days  
**What it covers:** All Claude API usage under your organization account

---

## PART 2: BAA Template — For Your Clients to Sign With You

Use this template for every treatment center that signs up for AdmitSimple. Have your attorney review it once before use. Deliver via DocuSign, HelloSign, or any e-signature platform.

---

# BUSINESS ASSOCIATE AGREEMENT

**Effective Date:** _______________

This Business Associate Agreement ("BAA") is entered into between:

**Covered Entity:**
Name: _______________________________________________
Address: ____________________________________________
Authorized Representative: ___________________________
("Client" or "Covered Entity")

**Business Associate:**
Name: AdmitSimple, LLC (or your legal entity name)
Address: ____________________________________________
Authorized Representative: ___________________________
("AdmitSimple" or "Business Associate")

---

### 1. Definitions

All capitalized terms not otherwise defined herein shall have the meanings ascribed to them under the Health Insurance Portability and Accountability Act of 1996, as amended ("HIPAA"), and its implementing regulations, including the HIPAA Privacy Rule (45 C.F.R. Parts 160 and 164) and the HIPAA Security Rule (45 C.F.R. Parts 160 and 164), as amended by the Health Information Technology for Economic and Clinical Health Act ("HITECH Act").

- **"PHI"** means Protected Health Information as defined by 45 C.F.R. § 160.103.
- **"Services"** means the admissions CRM software and related services provided by AdmitSimple under any applicable service or subscription agreement between the parties.

---

### 2. Obligations of Business Associate

AdmitSimple agrees to:

a) Not use or disclose PHI other than as permitted or required by this BAA, or as required by law.

b) Use appropriate safeguards and comply with the HIPAA Security Rule with respect to electronic PHI ("ePHI") to prevent use or disclosure not permitted by this BAA.

c) Report to Client any use or disclosure of PHI not provided for by this BAA, including breaches of unsecured PHI, within **30 calendar days** of discovery.

d) Ensure that any subcontractors that create, receive, maintain, or transmit PHI on behalf of AdmitSimple agree to the same restrictions and conditions that apply to AdmitSimple under this BAA.

e) Make PHI available to Client as necessary to satisfy Client's obligations under 45 C.F.R. § 164.524.

f) Make its internal practices, books, and records relating to the use and disclosure of PHI available to the Secretary of the U.S. Department of Health and Human Services for purposes of compliance determination.

g) Upon termination of this BAA, return or destroy all PHI that AdmitSimple maintains in any form, if feasible. If return or destruction is not feasible, extend the protections of this BAA to the PHI and limit further use and disclosure to those purposes that make return or destruction infeasible.

---

### 3. Permitted Uses and Disclosures

AdmitSimple may use and disclose PHI:

a) To perform the Services described in the applicable subscription or service agreement.

b) As required for AdmitSimple's proper management and administration, provided disclosures are required by law or AdmitSimple receives written assurances from the recipient.

c) To provide data aggregation services related to health care operations of Client, if applicable.

d) As required by law.

---

### 4. Obligations of Covered Entity

Client agrees to:

a) Notify AdmitSimple of any limitations in Client's Notice of Privacy Practices that may affect AdmitSimple's use or disclosure of PHI.

b) Notify AdmitSimple of any changes in, or revocation of, permission by an individual to use or disclose PHI.

c) Not request that AdmitSimple use or disclose PHI in any manner that would violate HIPAA if done by Client.

---

### 5. Term and Termination

a) This BAA is effective as of the Effective Date and shall continue until the termination of all Services between the parties.

b) Either party may terminate this BAA immediately upon written notice if the other party has breached a material term of this BAA and failed to cure such breach within **30 days** of receiving written notice.

c) Upon termination, the provisions of Section 2(g) regarding return or destruction of PHI shall apply.

---

### 6. Miscellaneous

a) **Entire Agreement.** This BAA, together with any applicable subscription or service agreement, constitutes the entire agreement between the parties with respect to its subject matter.

b) **Amendment.** This BAA may only be amended by a written instrument signed by both parties.

c) **Governing Law.** This BAA shall be governed by the laws of the State of [YOUR STATE], without regard to its conflict of law provisions.

d) **Regulatory References.** Any reference in this BAA to a regulatory provision means the provision as in effect or as amended.

e) **Survival.** The obligations of this BAA that by their nature should survive termination shall so survive.

---

### 7. Signatures

| | |
|---|---|
| **Covered Entity (Client)** | **Business Associate (AdmitSimple)** |
| Signature: ___________________ | Signature: ___________________ |
| Name: ________________________ | Name: ________________________ |
| Title: ________________________ | Title: ________________________ |
| Date: _________________________ | Date: _________________________ |

---

*This template is provided for informational purposes. Have a licensed healthcare attorney review before first use.*
