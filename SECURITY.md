# Security Policy

## Overview

This document describes the security posture of the QuickBite platform, known limitations in the current prototype, and the roadmap for addressing them in future iterations.

QuickBite is an academic project (SLIIT SE4010 Cloud Computing). While it implements several production-grade security controls, some areas are intentionally simplified given the scope of the assignment. Each limitation is documented with a clear remediation path.

---

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch | ✅ Active |
| All other branches | ❌ Not supported |

---

## Reporting a Vulnerability

This is an academic project. If you identify a security issue, please open a GitHub Issue with the label `security`. Do not create public issues for vulnerabilities that could expose live infrastructure.

---

## Current Security Controls

### Authentication and Authorisation

| Control | Implementation | Status |
|---|---|---|
| Password hashing | bcrypt with 10 rounds | ✅ Implemented |
| JWT signing | HS256, 24h expiry, issuer + audience validation | ✅ Implemented |
| JWT storage | In-memory module variable (never localStorage) | ✅ Implemented |
| Token validation | Centralised in User service — Order service never holds the JWT secret | ✅ Implemented |
| Session persistence | User object only in sessionStorage — cleared on tab close | ✅ Implemented |
| User enumeration prevention | Identical error message for wrong email and wrong password | ✅ Implemented |
| Soft delete | `isActive: false` — preserves referential integrity for orders | ✅ Implemented |

### Transport Security

| Control | Implementation | Status |
|---|---|---|
| HTTPS | Enforced by Azure Container Apps and Static Web Apps | ✅ Azure-managed |
| TLS version | Minimum TLS 1.2 on all Azure resources | ✅ Azure-managed |
| HTTP → HTTPS redirect | Handled by Azure ingress | ✅ Azure-managed |
| HSTS | Set by helmet.js on all Node.js services | ✅ Implemented |

### API Security

| Control | Implementation | Status |
|---|---|---|
| Security headers | helmet.js on user-service and order-service | ✅ Implemented |
| CORS | Restricted to Static Web App origin in production | ✅ Implemented |
| Input validation | express-validator (Node.js), Pydantic (Python) | ✅ Implemented |
| Server-side price calculation | Order service fetches prices from Menu service — client prices are ignored | ✅ Implemented |
| MongoDB injection prevention | Mongoose ODM + status value whitelist (predefined filter objects) | ✅ Implemented |
| Sensitive data in logs | Email addresses removed from all log statements | ✅ Implemented |

### Container Security

| Control | Implementation | Status |
|---|---|---|
| Non-root user | All containers run as appuser (UID 1001) | ✅ Implemented |
| Minimal base image | Alpine Linux for Python services (no ncurses) | ✅ Implemented |
| CVE scanning | Docker Scout on every build — 0 critical CVEs | ✅ Implemented |
| CVE-2025-69720 | Mitigated by switching from Debian to Alpine | ✅ Fixed |
| Multi-stage builds | Node.js services use builder + production stages | ✅ Implemented |

### CI/CD Security

| Control | Implementation | Status |
|---|---|---|
| Secret management | GitHub Secrets — never hardcoded | ✅ Implemented |
| Branch protection | PRs required — direct push to main blocked | ✅ Implemented |
| Quality gate | SonarCloud blocks merge on failing quality gate | ✅ Implemented |
| SAST | SonarCloud static analysis on every PR | ✅ Implemented |

---

## Known Limitations and Roadmap

### 1. Admin Authentication — Shared Key (Medium Risk)

**Current:** Restaurant staff authenticate using a shared `X-Admin-Key` header. The key is stored in sessionStorage on the client and sent as a request header.

**Risk:** If the key is compromised, all admin operations are exposed. The key cannot be scoped to a specific user or revoked per-user.

**Planned remediation:**
- Add a `role` field to the User model (`customer` | `admin`)
- Issue JWTs with a `role: admin` claim for restaurant staff accounts
- Replace `requireAdminKey` middleware with `requireRole('admin')` middleware
- The admin key will then only be needed once — to bootstrap the first admin account
- This change does not break any existing customer flows

**Target:** Sprint 8 (Security Hardening)

---

### 2. JWT Blacklisting — Logout Does Not Invalidate Tokens (Low Risk)

**Current:** `POST /auth/logout` returns 200 but does not invalidate the JWT. A token remains valid until its 24-hour expiry even after logout.

**Risk:** If a token is stolen after the user logs out, it can still be used for up to 24 hours.

**Planned remediation:**
- Add a `jti` (JWT ID) claim to every issued token
- On logout, store the `jti` in a Redis blacklist with TTL matching token expiry
- Update `validateToken` to reject tokens whose `jti` is in the blacklist
- Alternatively, reduce JWT expiry to 1 hour and implement refresh tokens

**Target:** Sprint 8 (Security Hardening)

---

### 3. Account Lockout — No Brute Force Protection (Low Risk)

**Current:** There is no limit on failed login attempts to `POST /auth/login`.

**Risk:** An attacker can attempt unlimited password guesses against any account.

**Planned remediation:**
- `express-rate-limit` is already installed in user-service
- Add a per-IP rate limiter of 10 requests per 15 minutes on `POST /auth/login`
- Add a per-email lockout after 10 consecutive failures stored in MongoDB
- Implement exponential backoff for repeated failures

**Target:** Sprint 8 (Security Hardening)

---

### 4. MongoDB Atlas Network Access — Open to All IPs (Low Risk for M0)

**Current:** MongoDB Atlas network access is set to `0.0.0.0/0` to allow GitHub Actions runners (which use dynamic IPs).

**Risk:** Any IP can attempt to connect to the Atlas cluster. Authentication is still required.

**Planned remediation:**
- In production, use Azure Private Link to restrict Atlas access to the Container Apps VNet
- For CI/CD, use Atlas API to dynamically whitelist runner IPs during the test job

**Target:** Post-submission infrastructure improvement

---

### 5. Secrets in Environment Variables (Accepted Risk)

**Current:** Secrets (JWT_SECRET, ADMIN_KEY, MONGODB_URI, SENDGRID_API_KEY) are stored as Container App environment variables.

**Risk:** Anyone with Azure portal access can view these values.

**Planned remediation:**
- Store all secrets in Azure Key Vault
- Grant each Container App a system-assigned managed identity
- Assign Key Vault Secrets User role to each identity
- Reference secrets as Key Vault references in Container App configuration

**Target:** Sprint 8 (Security Hardening)

---

## Security Checklist

The following checklist reflects the current state of the codebase:

- [x] Passwords hashed with bcrypt (10 rounds)
- [x] JWTs signed with HS256, 24h expiry
- [x] JWTs stored in memory only — never in localStorage or cookies
- [x] Token validation centralised — JWT secret never shared between services
- [x] HTTPS enforced on all production endpoints
- [x] Security headers via helmet.js (CSP, HSTS, X-Frame-Options)
- [x] CORS restricted to known origin in production
- [x] Input validation on all API endpoints
- [x] Server-side price calculation — client prices never trusted
- [x] MongoDB queries use predefined filter objects — no user input in query construction
- [x] Sensitive data (email addresses) removed from log statements
- [x] Non-root container execution (UID 1001)
- [x] 0 critical CVEs on all Docker images (Docker Scout verified)
- [x] SonarCloud Security Rating A (all 5 projects)
- [x] Branch protection — all changes via pull request
- [x] Secrets in GitHub Secrets — never committed to source
- [ ] JWT blacklist on logout
- [ ] Account lockout after repeated failures
- [ ] Role-based JWT claims for admin access
- [ ] Azure Key Vault for secret management
- [ ] Per-user admin authentication

---

## Dependencies

Security-relevant dependencies are kept up to date. The following tools are used to monitor vulnerabilities:

- **Docker Scout** — scans container images on every CI build
- **SonarCloud** — static analysis on every pull request
- **GitHub Dependabot** — planned for automated dependency alerts

To manually check for vulnerabilities in Node.js services:

```bash
cd user-service && npm audit
cd order-service && npm audit
```

---

*Last reviewed: March 2026 — Dumidu Rajapaksha, SLIIT*
