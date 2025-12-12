# CRM Architecture Low Level Design (LLD)

## 1. Architecture Overview

The CRM is built on a **Next.js** frontend hosted on Vercel (implied) or similar, interacting with **Firebase** services (Firestore, Authentication, Functions, Storage).

-   **Frontend**: Next.js (App Router), React, Tailwind CSS.
-   **Backend**: Firebase Cloud Functions (Node.js), Next.js API Routes.
-   **Database**: Cloud Firestore (NoSQL).
-   **Auth**: Firebase Authentication.
-   **Storage**: Firebase Cloud Storage (for documents).

### High-Level Data Flow
1.  **Leads Ingestion**: Leads enter via multiple sources (`ama_leads`, `billcutLeads`, `crm_leadss`).
2.  **Sales Process**: Sales team interacts with leads (filtering, calling, updating status).
3.  **Conversion**: "Converted" leads are aggregated in `Pending Details` and promoted to `clients`.
4.  **Client Management**: Advocates and Admins manage `clients` (documents, payments, history).
5.  **User Management**: Admins manage app users via `App Users` screen.

---

## 2. Data Structures (Firestore Collections)

### 2.1. Core Collections

#### `login_users`
*Stores application-specific user details and roles.*
-   `id` (string): Phone number prefixed (e.g., "919876543210").
-   `name` (string): User's full name.
-   `email` (string): User's email.
-   `phone` (string): User's phone number.
-   `role` (string): 'admin', 'sales', 'advocate', 'overlord', 'billcut'.
-   `status` (string): 'active', 'inactive'.
-   `otp` (string, optional): Current OTP for login (if applicable).
-   `week_topic` (string): Logic for weekly assignment/view.
-   `topic` (string): Topic subscription.
-   `created_at` (number/timestamp): Creation time.
-   `updated_at` (number/timestamp): Last update time.

#### `users`
*Firebase Auth user profiles, often synced with `login_users`.*
-   `uid` (string): Firebase Auth UID.
-   `firstName` (string)
-   `lastName` (string)
-   `email` (string)
-   `role` (string)
-   `status` (string)

#### `clients`
*The central entity for converted customers.*
-   `id` (string): Unique Client ID.
-   `leadId` (string): Reference to the original lead ID.
-   `name` (string)
-   `phone` (string)
-   `altPhone` (string)
-   `email` (string)
-   `status` (string): Client status (e.g., 'Active', 'Dropped').
-   `adv_status` (string): Advocate specific status.
-   `alloc_adv` (string): Primary advocate assigned.
-   `alloc_adv_secondary` (string): Secondary advocate.
-   `source_database` (string): Origin ('ama', 'billcut', etc.).
-   `startDate` (string): Date client started.
-   `sentAgreement` (boolean): If agreement was sent.
-   `request_letter` (boolean): If request letter has been generated.
-   `documentUrl` (string): URL to main document.
-   `documentName` (string): Name of main document.
-   `banks` (array of objects):
    -   `id`, `bankName`, `loanType`, `accountNumber`, `loanAmount`.
-   `client_app_status` (array of objects):
    -   `remarks`, `createdAt`, `createdBy`.
-   **Subcollection**: `history`
    -   `remark` (string)
    -   `advocateName` (string)
    -   `timestamp` (timestamp)

#### `clients_payments`
*Tracks payment schedules and status for clients.*
-   `clientId` (string)
-   `clientName` (string)
-   `totalPaymentAmount` (number)
-   `paidAmount` (number)
-   `pendingAmount` (number)
-   `monthlyFees` (number)
-   `tenure` (number)
-   `startDate` (timestamp)
-   `weekOfMonth` (number)

#### `payments`
*Tracks individual payment transactions.*
-   `amount` (string/number)
-   `status` (string): 'approved', etc.
-   `timestamp` (timestamp)
-   `userId` / `assignedTo` / `salesperson` (string): ID of the salesperson credited.

#### `targets`
*Stores monthly sales targets and performance.*
-   **Document ID**: Format `Month_Year` (e.g., `Jan_2024`).
-   **Subcollection**: `sales_targets`
    -   `userId` (string)
    -   `userName` (string)
    -   `amountCollected` (number)
    -   `amountCollectedTarget` (number)
    -   `convertedLeads` (number)
    -   `convertedLeadsTarget` (number)

#### `settlements`
*Tracks settlement negotiations with banks.*
-   `clientId` (string)
-   `clientName` (string)
-   `bankId` (string)
-   `bankName` (string)
-   `accountNumber` (string)
-   `loanAmount` (string)
-   `status` (string): 'New', 'Negotiation Started', 'Settled', etc.
-   `remarks` (string): Latest remark.
-   `successFeeStatus` (string)
-   `createdAt` (timestamp)
-   **Subcollection**: `history`
    -   `remark` (string), `advocateName` (string), `timestamp`.

#### `arbitration`
*Tracks arbitration cases.*
-   `clientName` (string)
-   `bankName` (string)
-   `startDate` (string): Date of hearing.
-   `time` (string): Time of hearing.
-   `meetLink` (string)
-   `status` (string): 'Scheduled', 'In Progress', etc.
-   `teamEmails` (array): List of emails for invites.
-   `vakalatnama` (boolean), `onlineLinkLetter` (boolean).
-   `emailSent` (boolean)
-   **Subcollection**: `history`
    -   `remark` (string), `timestamp`.

### 2.2. Lead Collections (Fragmented)

#### `ama_leads`
*Leads from AMA source.*
-   `name`, `email`, `mobile` (or `phone`), `city`, `address`.
-   `status`: Lead status (e.g., 'New', 'Callback', 'Converted').
-   `source`: 'AMA', etc.
-   `assignedTo` (or `assigned_to`): Salesperson name.
-   `salesNotes` / `lastNote`: Notes.
-   `synced_at` / `date`: Timestamp for sync/creation.
-   **Subcollection**: `callback_info` (`scheduled_dt`, `scheduled_by`).
-   **Subcollection**: `history` (`content`, `timestamp`).

#### `billcutLeads`
*Leads from Billcut source.*
-   `name`, `email`, `mobile`.
-   `category`: Status field (equivalent to `status` in ama_leads).
-   `debt_range`, `income`.
-   `assigned_to`: Salesperson name.
-   `date` (number): Timestamp.
-   `synced_date` (timestamp/number).

#### `crm_leadss`
*Another lead source (Legacy/Other).*
-   Similar structure to `ama_leads`.

### 2.3. Utility Collections

#### `calendar_events`
*Stores generated calendar invites.*
-   `type`, `clientName`, `bankName`, `startDateTime`, `endDateTime`, `meetLink`.

#### `config`
*System configurations.*
-   `email` (doc): `email`, `appPassword` (SMTP config).

---

## 3. Screen Interactions & Data Flow

### 3.1. Dashboard (`src/app/dashboard`)
-   **Admin Dashboard (`admin.tsx`)**:
    -   **Stats**: Fetches `users` to count roles.
    -   **Targets**: Fetches `targets/{Month_Year}/sales_targets` to aggregate revenue and conversion stats. Falls back to `payments` collection for revenue if needed.
    -   **Leads Analytics**: Fetches `crm_leads` to calculate status distribution and monthly trends. **Warning**: Fetches all leads client-side.
    -   **Pending Letters**: Fetches `clients` where `request_letter !== true` to show advocate tasks.
    -   **Caching**: Uses custom `adminCache` to store heavy datasets.
-   **Sales Dashboard (`sales.tsx`)**:
    -   **Personal Stats**: Fetches specific user's doc from `targets/{Month_Year}/sales_targets`.
    -   **My Leads**: Fetches `crm_leads` and `billcutLeads` assigned to the user.
    -   **Analytics**: Calculates conversion rates and status breakdown locally.

### 3.2. Reports
-   **Sales Report (`src/app/sales-report`)**:
    -   **Data Source**: Fetches `ama_leads`.
    -   **Logic**: Filters leads by date range (creation or modification) entirely on the client side.
    -   **Productivity**: Groups leads by `assigned_to` and `lastModified` to show daily activity.
-   **Billcut Report (`src/app/billcutLeadReport`)**:
    -   **Data Source**: Fetches `billcutLeads`.
    -   **Logic**: Similar to Sales Report, uses `date` field for filtering.
-   **Operations Report (`src/app/opsreport`)**:
    -   **Data Source**: Fetches **ALL** `clients`.
    -   **Logic**: Heavy client-side processing to calculate:
        -   Advocate Performance (Active/Dropped counts).
        -   Bank Stats (Total loans, amount, type distribution).
        -   Demographics (Age, City, Income).
    -   **Bank Normalization**: Contains a massive hardcoded regex list to normalize bank names (e.g., "ICICI Bank" vs "ICICI").

### 3.3. Trackers
-   **Settlement Tracker (`src/app/settlement-tracker`)**:
    -   **Data Source**: `settlements` collection.
    -   **Features**: Infinite scroll, Search (client-side filtering), Status management.
    -   **Interaction**: Links to `clients` to select banks for settlement.
-   **Arbitration Tracker (`src/app/arbtracker`)**:
    -   **Data Source**: `arbitration` collection.
    -   **Features**: Date filtering (Next 7/30 days), Email/Calendar integration.
    -   **Backend**: Triggers `createCalendarEvent` Cloud Function.

### 3.4. App Users (`src/app/appUsers`)
-   **Read**: Fetches users via `/api/app-users` (server-side query to `login_users`).
-   **Write**:
    -   Add User: POST to `/api/app-users` -> Creates doc in `login_users` with custom ID (`91` + phone).
    -   Edit User: PATCH to `/api/app-users` -> Updates `login_users`.
    -   Status Update: PATCH to `/api/app-users`.

### 3.5. AMA Leads (`src/app/ama_leads`)
-   **Read**: Fetches `ama_leads` collection.
    -   **Filtering**: Heavy client-side filtering (`applyFiltersToLeads`) for source, status, salesperson.
    -   **Pagination**: Firestore cursor-based pagination (`startAfter`).
-   **Write**: Updates lead status, adds remarks (history), schedules callbacks (`callback_info` subcollection).

### 3.6. Pending Details (`src/app/pendingdetails`)
-   **Aggregation**:
    -   Fetches `crm_leadss` where `status == 'Converted'`.
    -   Fetches `billcutLeads` where `category == 'Converted'`.
    -   Fetches `ama_leads` where `status == 'Converted'`.
    -   Merges them into a single list in memory.
-   **Conversion Action**:
    -   User clicks "View/Edit".
    -   **Write**: Creates/Updates `clients` document.
    -   **Write**: Creates `clients_payments` document (Payment Schedule).
    -   **Check**: Verifies if `leadId` already exists in `clients` to prevent duplicates.

### 3.7. Clients (`src/app/clients`)
-   **Read**: Fetches `clients` collection.
    -   Supports search (Name/Phone) and filtering (Status, Advocate).
-   **Write**:
    -   Edit Client details.
    -   Upload Documents (Firebase Storage -> `clients/billcut/documents` or similar).
    -   Add History/Remarks (`clients/{id}/history`).

### 3.8. Advocate (`src/app/advocate`)
-   **Documents**:
    -   Provides UI for generating legal docs (Request Letter, Demand Notice, CFHAB, Sec 138, Sec 21).
    -   **API**: `/api/generate-letter` generates DOCX on the fly (no storage).
    -   **API**: `/api/agreement` generates Agreement, uploads to Storage, and returns URL.

### 3.9. Complaints Management (`src/app/advocate/complaints`)
-   **Data Source**: `complaints` collection.
-   **Structure**:
    -   `clientName`, `clientPhone`, `issue`, `assignedTo`, `status`, `remarks`.
    -   **Subcollection**: `history` (tracks changes and remarks).
-   **Features**:
    -   CRUD operations (Add, Edit, Delete).
    -   Filters: Status, Advocate, Issue, Date (Today, Yesterday, Last Week/Month).
    -   Role-based access (Advocate/Assistant).

### 3.10. Communication Modules
-   **Email Compose (`src/app/advocate/emailcompose`)**:
    -   **Features**: Rich email composition with attachments (10MB limit).
    -   **Recipients**: Select Clients (auto-fill email) or Banks (fetches emails from `bankData`).
    -   **Templates**: Pre-defined drafts for "Vakalatnama", "Demand Notice Reply", "Section 138 Reply", "Harassment Notice", etc.
    -   **Logic**: Replaces placeholders like `[CLIENT_NAME]` and `[CLIENT_EMAIL]` in templates.
-   **Send Agreement (`src/app/send-agreement`)**:
    -   **Purpose**: specialized email flow for sending agreements and proposals.
    -   **Templates**: "Agreement Draft", "Billcut Sign Up", "Part-payment", "Service Proposal" (includes HTML styling).
    -   **Design**: "Service Proposal" template uses inline CSS for a premium look.

### 3.11. Document Generation Details
-   **Section 21 Notice (`src/app/advocate/documents/sec21.tsx`)**:
    -   **UI**: Form with Client and Bank selection.
    -   **Bank Matching**: Uses Levenshtein distance (fuzzy matching) to find bank details in `bankData` even with slight name variations.
    -   **API**: POST `/api/sec21-notice`.
        -   Fetches `templates/sec21_notice_template.docx` from Firebase Storage.
        -   Uses `docxtemplater` to fill data (`ClientName`, `bankName`, `today`, etc.).
        -   Returns generated DOCX directly (no storage).

### 3.12. Client Management (`src/app/clients`)
-   **Core Features**:
    -   **Infinite Scroll**: Fetches clients in batches of 50 using Firestore cursors (`startAfter`).
    -   **Search**: Complex client-side + server-side hybrid. Generates search variants (lower, upper, title case) to query Firestore.
    -   **Filters**: Status, Primary/Secondary Advocate, Source (AMA/Billcut), Agreement Status, Bank Name.
    -   **URL Sync**: Syncs filter state with URL parameters for shareability.
-   **Document Viewer**: Uses Google Docs Viewer via iframe to preview documents (`documentUrl`).
-   **Bulk Actions**:
    -   **Bulk Assign**: Assign advocates to multiple selected clients.
    -   **Bulk WhatsApp**: Send WhatsApp messages to selected clients (via `ClientBulkWhatsAppModal`).
-   **Data Enhancement**:
    -   Auto-fetches `latestRemark` from `history` subcollection for each client.
    -   Checks for Billcut specific documents in Storage if `documentUrl` is missing.

### 3.13. Cloud Functions (`functions/src/index.ts`)
-   **Productivity Tracking**:
    -   `checkUserStatus`: Calculates productivity metrics (leads worked, converted, conversion rate) by analyzing `billcutLeads` and `ama_leads`.
    -   **Logic**: Checks `convertedAt` for conversions and `lastModified` for activity. Aggregates data by `assigned_to`.
-   **Client Sync**:
    -   `onClientCreate`: Triggered when a new document is added to `clients`.
    -   **Action**: Automatically creates or updates a corresponding user in `login_users` with `role='client'`.
    -   **Logic**: Calculates `week_topic` based on `startDate` (1st-4th week) to determine content access.
-   **Admin Alerts**:
    -   `notifyAdmin`: Placeholder for sending alerts (currently logs to console).

---

## 4. Scope for Betterment (Performance & Structure)

### 4.1. Database Normalization & Consolidation
-   **Issue**: Leads are fragmented across `ama_leads`, `crm_leadss`, and `billcutLeads`. This forces the frontend (`pendingdetails`) to make 3 separate network requests and merge data manually, leading to complexity and potential inconsistency.
-   **Solution**: Consolidate all leads into a single `leads` collection.
    -   Add a `source` field (e.g., 'ama', 'billcut', 'crm').
    -   Standardize status field (use `status` everywhere, map `category` to `status`).
    -   Standardize assignment field (use `assignedToId` and `assignedToName`).

### 4.2. Field Name Standardization
-   **Issue**: Inconsistent naming (`mobile` vs `phone`, `assignedTo` vs `assigned_to`, `salesNotes` vs `sales_notes`) requires complex mapping logic in the frontend.
-   **Solution**: Enforce a strict schema interface (TypeScript) for the database and run a one-time migration script to standardize all field names.

### 4.3. Performance Optimization (Frontend)
-   **Issue**: `opsreport`, `ama_leads`, and Report pages perform significant filtering on the client side. They often fetch *all* documents to calculate stats.
-   **Solution**:
    -   **Firestore Aggregation Queries**: Use `count()` and `sum()` queries for stats instead of fetching all docs.
    -   **Composite Indexes**: Move filtering logic to Firestore using composite indexes (e.g., `status + assignedTo + date`).
    -   **Server-Side Pagination**: Ensure all lists use cursor-based pagination.

### 4.4. Backend Functions Optimization
-   **Issue**: `checkUserStatus` and sync logic seem to trigger on document writes.
-   **Solution**:
    -   Ensure idempotency in triggers to prevent infinite loops (e.g., check if data actually changed before writing back).
    -   Use `onCall` functions for heavy operations (like "Convert Lead") instead of client-side batch writes, to ensure atomicity and validation.

### 4.5. Security Rules
-   **Observation**: Frontend accesses collections directly (`getDocs(collection(db, 'clients'))`).
-   **Recommendation**: Ensure Firestore Security Rules are strictly defined.
    -   `sales` role should only read/write their assigned leads.
    -   `advocate` role should only read/write their assigned clients.
    -   Only `admin`/`overlord` should have unrestricted access.

### 4.6. State Management & Caching
-   **Issue**: Custom caching logic (`adminCache`, `salesCache`) is manually implemented in dashboard components.
-   **Solution**: Adopt a standard library like **TanStack Query (React Query)** or **SWR**. This handles caching, invalidation, background refetching, and loading states much more robustly and with less boilerplate.

### 4.7. Type Safety
-   **Issue**: Many `any` types used in data mapping (e.g., `leads.map((doc) => { const d = doc.data() as any ... }`).
-   **Solution**: Create shared TypeScript interfaces (DTOs) for all Firestore documents in a `src/types/firestore` directory and use them strictly in both Frontend and Functions.

### 4.8. Code Reusability
-   **Issue**: Bank name normalization logic (regex list) is hardcoded in `opsreport/page.tsx`.
-   **Solution**: Move this to a shared utility function `src/utils/bankUtils.ts` or better, normalize bank names *before* saving to the database.
