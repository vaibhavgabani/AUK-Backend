# DEEP BACKEND API TEST REPORT

**Generated:** 2026-09-11T09:50:46.215Z  
**Database Safety Check:** PASSED  
**Final Verdict:** **READY**

---

## 1. SUMMARY METRICS

- **Total Test Cases Executed:** 28
- **Passed:** 28
- **Failed:** 0
- **Skipped:** 0
- **Not Tested:** 0

### Seeding Performance & Row Counts
- **Database Cleanup Duration:** 620ms
- **Scale Seeding Duration:** 1584ms

| Table Name | Final Row Count |
| :--- | :--- |
| `users` | 1002 |
| `manager_profiles` | 1001 |
| `gig_profiles` | 1000 |
| `events` | 1001 |
| `event_gig_assignments` | 1001 |
| `event_expenses` | 1001 |
| `invoices` | 0 |
| `audit_logs` | 8 |

---

## 2. REGRESSION STATUS OF PREVIOUSLY REPORTED BUGS

1. **PATCH /api/events/:id entityId undefined bug:** **PASS**
2. **DELETE /api/events/:id entityId undefined bug:** **PASS**
3. **audit_logs entity_id NULL constraint violation bug:** **PASS**
4. **Events Export ExcelJS Generation:** **PASS**
5. **Gigs Export ExcelJS Generation:** **PASS**

---

## 3. DETAILED TEST CASE RESULTS

| Category | Test Name | Endpoint | Status | Duration | Output / Error |
| :--- | :--- | :--- | :---: | :---: | :--- |
| AUTHENTICATION | Admin Login - Valid credentials set httpOnly cookie | POST /api/auth/admin/login | **PASS** | 291ms | OK |
| AUTHENTICATION | Admin Login - Wrong password returns 401 | POST /api/auth/admin/login | **PASS** | 275ms | OK |
| AUTHENTICATION | Manager Login - Valid credentials succeed | POST /api/auth/manager/login | **PASS** | 283ms | OK |
| AUTHENTICATION | Logout - Clears auth_token cookie | POST /api/auth/logout | **PASS** | 3ms | OK |
| MANAGERS | Admin List Managers - Returns full manager list at scale (1000+) | GET /api/managers | **PASS** | 19ms | OK |
| MANAGERS | Admin Create Manager - Valid creation via API | POST /api/managers | **PASS** | 301ms | OK |
| MANAGERS | Admin Create Manager - Duplicate email returns 409 | POST /api/managers | **PASS** | 7ms | OK |
| MANAGERS | Manager Create Manager - Non-admin returns 403 Forbidden | POST /api/managers | **PASS** | 4ms | OK |
| EVENTS | Manager Create Event - Dynamic status upcoming | POST /api/events | **PASS** | 12ms | OK |
| EVENTS | Manager Create Event - endDatetime <= startDatetime returns 400 | POST /api/events | **PASS** | 5ms | OK |
| EVENTS | PATCH /api/events/:id — Regression Check: entityId bug fix on update | PATCH /api/events/:id | **PASS** | 12ms | OK |
| EVENTS | DELETE /api/events/:id — Regression Check: entityId bug fix on soft delete | DELETE /api/events/:id | **PASS** | 10ms | OK |
| EVENTS | Admin GET Events - Scale listing (1000+ records) | GET /api/events | **PASS** | 315ms | OK |
| GIG_ASSIGNMENTS | Create Gig Assignment - API creation with calculated totalHours | POST /api/events/:id/gigs | **PASS** | 18ms | OK |
| GIG_ASSIGNMENTS | Create Gig Assignment - Duplicate assignment returns 409 Conflict | POST /api/events/:id/gigs | **PASS** | 11ms | OK |
| GIG_ASSIGNMENTS | GET Event Gigs - Retrieves assignment list | GET /api/events/:id/gigs | **PASS** | 12ms | OK |
| EXPENSES | Create Event Expense - API creation | POST /api/events/:id/expenses | **PASS** | 19ms | OK |
| EXPENSES | Create Event Expense - Negative amount returns 400 | POST /api/events/:id/expenses | **PASS** | 7ms | OK |
| INVOICES | GET Invoice Data - Dynamic invoice assembly with currency totals | GET /api/events/:id/invoice | **PASS** | 16ms | OK |
| EXPORTS | Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+) | GET /api/export/events | **PASS** | 484ms | OK |
| EXPORTS | Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+) | GET /api/export/gigs | **PASS** | 256ms | OK |
| EXPORTS | Export Validation - from > to returns 400 | GET /api/export/events?from=2026-12-31&to=2026-01-01 | **PASS** | 6ms | OK |
| FILTERS | Filter by place - Accuracy check at scale | GET /api/events?place=London | **PASS** | 38ms | OK |
| FILTERS | Filter by managerId - Accuracy check at scale | GET /api/events?managerId=2007 | **PASS** | 10ms | OK |
| SECURITY | Manager Ownership Isolation - Accessing unowned resource returns 404 | GET /api/events/999999 | **PASS** | 7ms | OK |
| VALIDATION | Fuzz Validation - Invalid payload types return 400 with error message | POST /api/events | **PASS** | 5ms | OK |
| PERFORMANCE | Concurrency Testing - 20 simultaneous GET events requests succeed cleanly | GET /api/events (20x concurrent) | **PASS** | 566ms | OK |
| INTEGRITY | Database Integrity - Final table row counts meet scale thresholds (1000+ per table) | DB Query | **PASS** | 5ms | OK |

---

## 4. FINAL VERDICT

**READY**
