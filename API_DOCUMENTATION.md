# SKIT Placement Cell: API Reference

REST API for the SKIT Placement Cell portal (Express 5 + MongoDB). All routes are prefixed with `/api`.

**Base URL (local):** `http://localhost:5000/api`  
**Content type:** `application/json` (except resume upload: `multipart/form-data`)  
**Request body limit:** 1 MB JSON, 5 MB resume PDF  
**CORS:** only the origin in `CLIENT_URL` (default `http://localhost:5173`)

A ready-to-import Postman collection is provided: `SKIT_Placement_Cell.postman_collection.json`.

## Contents

- [System](#system)
- [Auth](#auth)
- [Students](#students)
- [Companies](#companies)
- [Drives](#drives)
- [Applications](#applications)
- [Statistics](#statistics)
- [Announcements](#announcements)
- [Conventions](#conventions)

## Conventions

### Authentication

Log in with `POST /auth/login` (or register as a student) to get a JWT valid for **7 days**. Send it on every protected route:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Roles: `admin` (placement officer), `recruiter` (scoped to their own company) and `student`.

### Status codes

| Code | Meaning |
| --- | --- |
| 200 / 201 | Success / created |
| 400 | Validation failure, bad status value, ineligible or closed drive, invalid upload |
| 401 | Missing, invalid or expired token, or account removed |
| 403 | Role not allowed, or accessing another user's data |
| 404 | Record not found, or unknown route |
| 409 | Duplicate (unique field or repeat application) |
| 500 | Unexpected server error |

### Error shape

```json
{ "message": "The email or password is incorrect." }
```

Ineligible applications add a `reasons` array. Unknown routes return `Route not found: <METHOD> <url>`. Mongoose validation messages are joined into one `message`. Invalid ObjectIds return `400 That record could not be found.`

Authentication errors (all protected routes):

| Code | Message |
| --- | --- |
| 401 | Please sign in to continue. |
| 401 | Your session has expired. Please sign in again. |
| 401 | This account is no longer available. |
| 403 | You do not have permission to perform this action. |

### Pagination

List endpoints that paginate return:

```json
{ "items": [], "page": 1, "limit": 25, "total": 0, "pages": 0 }
```

`page` defaults to 1; `limit` defaults to 25 (students) or 50 (drives, applications) and is capped at 100. Companies and announcements are **not** paginated and return bare arrays.

### Enums

| Field | Values |
| --- | --- |
| `department` | CSE, IT, ECE, Mechanical, Civil, Electrical |
| Drive `status` | Open, Closed, Draft |
| Application `status` | Applied, Under Review, Shortlisted, Selected, Rejected |
| Announcement `audience` | all, students, recruiters |
| User `role` | admin, student, recruiter |

### Eligibility rules

A student is eligible for a drive when **all** hold: `cgpa >= minimumCGPA`, `backlogs <= maximumBacklogs`, `department` is in `eligibleDepartments`, and `graduationYear` equals the drive's.

### Endpoint summary

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | Public |
| POST | `/auth/register` | Public (creates a student) |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Any signed-in role |
| GET | `/students` | admin |
| GET | `/students/:id` | admin; student (own); recruiter (own applicants) |
| PUT | `/students/:id` | admin; student (own) |
| POST | `/students/upload-resume` | student |
| GET | `/students/:id/resume` | admin; student (own); recruiter (own applicants) |
| DELETE | `/students/:id` | admin |
| GET | `/companies` | admin |
| GET | `/companies/mine` | recruiter |
| PUT | `/companies/mine` | recruiter |
| POST | `/companies` | admin |
| GET | `/companies/:id` | admin |
| PUT | `/companies/:id` | admin |
| DELETE | `/companies/:id` | admin |
| GET | `/drives` | All roles (scoped) |
| POST | `/drives` | admin, recruiter |
| GET | `/drives/:id` | All roles (recruiters: own company only) |
| PUT | `/drives/:id` | admin, recruiter (own company) |
| DELETE | `/drives/:id` | admin, recruiter (own company) |
| GET | `/applications` | All roles (scoped) |
| POST | `/applications` | student |
| PATCH | `/applications/:id/status` | admin, recruiter (own company) |
| DELETE | `/applications/:id` | student (own, status Applied only); admin |
| GET | `/stats/dashboard` | All roles (response shape depends on role) |
| GET | `/announcements` | All roles (filtered by audience) |
| POST | `/announcements` | admin |
| DELETE | `/announcements/:id` | admin |

---

## System

### Health check

`GET /api/health`

**Access:** Public

Liveness probe. No token required.

**Headers:** none

**Response 200**

```json
{
  "status": "ok",
  "service": "placement-cell-api"
}
```

---

## Auth

### Register student

`POST /api/auth/register`

**Access:** Public (creates a student)

Creates a student user and academic profile in one call. Role is always `student`. If the profile fails validation, the user is rolled back.

**Headers**

```http
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Max 100 chars |
| `email` | string | Yes | Valid email, unique, stored lowercase |
| `password` | string | Yes | Min 8 characters |
| `rollNumber` | string | Yes | Unique, stored uppercase |
| `department` | string | Yes | CSE, IT, ECE, Mechanical, Civil, Electrical |
| `course` | string | No | Default `B.Tech` |
| `semester` | number | No | 1-8, default 7 |
| `graduationYear` | number | Yes |  |
| `cgpa` | number | Yes | 0-10 |
| `backlogs` | number | No | Min 0, default 0 |
| `phone` | string | No |  |

**Example request body**

```json
{
  "name": "Aarav Sharma",
  "email": "student01@skit.ac.in",
  "password": "Campus@2026",
  "rollNumber": "24ESKIT001",
  "department": "CSE",
  "course": "B.Tech",
  "semester": 7,
  "graduationYear": 2027,
  "cgpa": 8.4,
  "backlogs": 0,
  "phone": "9876543210"
}
```

**Response 201**

```json
{
  "token": "<jwt>",
  "user": {
    "_id": "665f1c2a9b1e4a0012a00002",
    "name": "Aarav Sharma",
    "email": "student01@skit.ac.in",
    "role": "student",
    "companyId": null,
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z",
    "profile": {
      "_id": "665f1c2a9b1e4a0012a00001",
      "userId": "665f1c2a9b1e4a0012a00002",
      "rollNumber": "24ESKIT001",
      "department": "CSE",
      "course": "B.Tech",
      "semester": 7,
      "graduationYear": 2027,
      "cgpa": 8.4,
      "backlogs": 0,
      "phone": "9876543210",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z"
    }
  }
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Name, email, password, roll number and academic details are required. |
| 400 | Enter a valid email address. |
| 400 | Password must be at least 8 characters. |
| 409 | A record with that value already exists. |

### Login (student)

`POST /api/auth/login`

**Access:** Public

Returns a JWT (valid 7 days) and the user. Students include `profile`; recruiters include `company`. The collection script stores the token in `{{token}}`.

**Headers**

```http
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | Yes | Case-insensitive |
| `password` | string | Yes |  |

**Example request body**

```json
{
  "email": "student01@skit.ac.in",
  "password": "Campus@2026"
}
```

**Response 200**

```json
{
  "token": "<jwt>",
  "user": {
    "_id": "665f1c2a9b1e4a0012a00002",
    "name": "Aarav Sharma",
    "email": "student01@skit.ac.in",
    "role": "student",
    "companyId": null,
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z",
    "profile": {
      "_id": "665f1c2a9b1e4a0012a00001",
      "userId": "665f1c2a9b1e4a0012a00002",
      "rollNumber": "24ESKIT001",
      "department": "CSE",
      "course": "B.Tech",
      "semester": 7,
      "graduationYear": 2027,
      "cgpa": 8.4,
      "backlogs": 0,
      "phone": "9876543210",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z"
    }
  }
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Email and password are required. |
| 401 | The email or password is incorrect. |

### Current user

`GET /api/auth/me`

**Access:** Any signed-in role

Returns the authenticated user (password never included).

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "user": {
    "_id": "665f1c2a9b1e4a0012a00002",
    "name": "Aarav Sharma",
    "email": "student01@skit.ac.in",
    "role": "student",
    "companyId": null,
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z",
    "profile": {
      "_id": "665f1c2a9b1e4a0012a00001",
      "userId": "665f1c2a9b1e4a0012a00002",
      "rollNumber": "24ESKIT001",
      "department": "CSE",
      "course": "B.Tech",
      "semester": 7,
      "graduationYear": 2027,
      "cgpa": 8.4,
      "backlogs": 0,
      "phone": "9876543210",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z"
    }
  }
}
```

---

## Students

### List students

`GET /api/students`

**Access:** admin

Paginated student profiles sorted by roll number.

**Headers**

```http
Authorization: Bearer <token>
```

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `department` | string | CSE, IT, ECE, Mechanical, Civil or Electrical |
| `graduationYear` | number | Exact match |
| `minCGPA` | number | Inclusive lower bound |
| `maxCGPA` | number | Inclusive upper bound |
| `search` | string | Matches roll number or student name (case-insensitive) |
| `page` | number | 1-based page, default 1 |
| `limit` | number | Page size, default 25, max 100 |

**Response 200**

```json
{
  "items": [
    {
      "_id": "665f1c2a9b1e4a0012a00001",
      "userId": {
        "_id": "665f1c2a9b1e4a0012a00002",
        "name": "Aarav Sharma",
        "email": "student01@skit.ac.in"
      },
      "rollNumber": "24ESKIT001",
      "department": "CSE",
      "course": "B.Tech",
      "semester": 7,
      "graduationYear": 2027,
      "cgpa": 8.4,
      "backlogs": 0,
      "phone": "9876543210",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z",
      "resume": {
        "filename": "3fb46f38-08b5-4523-898e-2e170d93b606.pdf",
        "originalName": "Aarav_Resume.pdf",
        "contentType": "application/pdf",
        "size": 182340,
        "uploadedAt": "2026-10-31T10:15:00.000Z"
      }
    }
  ],
  "page": 1,
  "limit": 25,
  "total": 1,
  "pages": 1
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 403 | You do not have permission to perform this action. |

### Get student

`GET /api/students/:id`

**Access:** admin; student (own); recruiter (own applicants)

`:id` is the **user** id, not the profile id.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00001",
  "userId": {
    "_id": "665f1c2a9b1e4a0012a00002",
    "name": "Aarav Sharma",
    "email": "student01@skit.ac.in"
  },
  "rollNumber": "24ESKIT001",
  "department": "CSE",
  "course": "B.Tech",
  "semester": 7,
  "graduationYear": 2027,
  "cgpa": 8.4,
  "backlogs": 0,
  "phone": "9876543210",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z",
  "resume": {
    "filename": "3fb46f38-08b5-4523-898e-2e170d93b606.pdf",
    "originalName": "Aarav_Resume.pdf",
    "contentType": "application/pdf",
    "size": 182340,
    "uploadedAt": "2026-10-31T10:15:00.000Z"
  }
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 403 | You can only view your own profile. |
| 403 | You can only view applicants to your company. |
| 404 | Student not found. |

### Update student

`PUT /api/students/:id`

**Access:** admin; student (own)

Partial update: only supplied fields change. `name` updates the linked user. Email and password cannot be changed here.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | No | Updates the user record |
| `rollNumber` | string | No |  |
| `department` | string | No |  |
| `course` | string | No |  |
| `semester` | number | No | 1-8 |
| `graduationYear` | number | No |  |
| `cgpa` | number | No | 0-10 |
| `backlogs` | number | No | Min 0 |
| `phone` | string | No |  |

**Example request body**

```json
{
  "name": "Aarav Sharma",
  "department": "CSE",
  "semester": 7,
  "graduationYear": 2027,
  "cgpa": 8.6,
  "backlogs": 0,
  "phone": "9876543210"
}
```

**Response 200**

```json
{
  "profile": {
    "_id": "665f1c2a9b1e4a0012a00001",
    "userId": "665f1c2a9b1e4a0012a00002",
    "rollNumber": "24ESKIT001",
    "department": "CSE",
    "course": "B.Tech",
    "semester": 7,
    "graduationYear": 2027,
    "cgpa": 8.4,
    "backlogs": 0,
    "phone": "9876543210",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  },
  "message": "Profile updated successfully."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Validation message(s) joined by spaces |
| 403 | You can only edit your own profile. |
| 404 | Student not found. |

### Upload resume

`POST /api/students/upload-resume`

**Access:** student

`multipart/form-data` with a single `resume` file. PDF only, max 5 MB, `%PDF-` signature verified. Replaces any previous resume.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form fields**

| Field | Type | Notes |
| --- | --- | --- |
| `resume` | file | PDF, max 5 MB |

**Response 200**

```json
{
  "message": "Resume uploaded successfully.",
  "profile": {
    "_id": "665f1c2a9b1e4a0012a00001",
    "userId": "665f1c2a9b1e4a0012a00002",
    "rollNumber": "24ESKIT001",
    "department": "CSE",
    "course": "B.Tech",
    "semester": 7,
    "graduationYear": 2027,
    "cgpa": 8.4,
    "backlogs": 0,
    "phone": "9876543210",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z",
    "resume": {
      "filename": "3fb46f38-08b5-4523-898e-2e170d93b606.pdf",
      "originalName": "Aarav_Resume.pdf",
      "contentType": "application/pdf",
      "size": 182340,
      "uploadedAt": "2026-10-31T10:15:00.000Z"
    }
  }
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Choose a PDF resume to upload. |
| 400 | Upload a PDF file under 5 MB. |
| 400 | Resume must be 5 MB or smaller. |
| 400 | This file is not a valid PDF. |
| 404 | Student profile not found. |

### Download resume

`GET /api/students/:id/resume`

**Access:** admin; student (own); recruiter (own applicants)

Streams the PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment`. Not JSON on success.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

<binary PDF>

**Errors**

| Code | `message` |
| --- | --- |
| 403 | You can only view your own resume. |
| 403 | Resume access is limited to your applicants. |
| 404 | No resume has been uploaded. |

### Delete student

`DELETE /api/students/:id`

**Access:** admin

Removes the user, profile and all of the student's applications. The resume file on disk is not deleted.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "message": "Student and related placement records removed."
}
```

---

## Companies

### List companies

`GET /api/companies`

**Access:** admin

All companies sorted by name. Not paginated; returns a bare array.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
[
  {
    "_id": "665f1c2a9b1e4a0012a00010",
    "name": "Aster Digital",
    "description": "Product engineering studio",
    "website": "https://asterdigital.example",
    "location": "Jaipur",
    "industry": "Software",
    "contactEmail": "hr@asterdigital.example",
    "contactName": "Riya Mehta",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  }
]
```

**Errors**

| Code | `message` |
| --- | --- |
| 403 | You do not have permission to perform this action. |

### Get my company

`GET /api/companies/mine`

**Access:** recruiter

The recruiter's own company.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00010",
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Company profile not found. |

### Update my company

`PUT /api/companies/mine`

**Access:** recruiter

Partial update of the recruiter's own company.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | No | Unique |
| `description` | string | No |  |
| `website` | string | No |  |
| `location` | string | No |  |
| `industry` | string | No |  |
| `contactEmail` | string | No | Stored lowercase |
| `contactName` | string | No |  |

**Example request body**

```json
{
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta"
}
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00010",
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Validation message(s) |
| 409 | A record with that value already exists. |

### Create company + recruiter

`POST /api/companies`

**Access:** admin

Creates the company and its recruiter login together. `recruiterEmail` and `recruiterPassword` are consumed, not stored on the company. If the recruiter user fails, the company is rolled back.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Unique |
| `recruiterEmail` | string | Yes | Recruiter login email |
| `recruiterPassword` | string | Yes | Min 8 characters |
| `description` | string | No |  |
| `website` | string | No |  |
| `location` | string | No |  |
| `industry` | string | No |  |
| `contactEmail` | string | No |  |
| `contactName` | string | No | Also used as the recruiter's display name |

**Example request body**

```json
{
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "recruiterEmail": "recruiter@asterdigital.example",
  "recruiterPassword": "Campus@2026"
}
```

**Response 201**

```json
{
  "_id": "665f1c2a9b1e4a0012a00010",
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | A recruiter email and password of at least 8 characters are required. |
| 409 | A record with that value already exists. |

### Get company

`GET /api/companies/:id`

**Access:** admin

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00010",
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Company not found. |

### Update company

`PUT /api/companies/:id`

**Access:** admin

Partial update; same fields as *Update my company*.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example request body**

```json
{
  "industry": "Software & Services",
  "location": "Jaipur"
}
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00010",
  "name": "Aster Digital",
  "description": "Product engineering studio",
  "website": "https://asterdigital.example",
  "location": "Jaipur",
  "industry": "Software",
  "contactEmail": "hr@asterdigital.example",
  "contactName": "Riya Mehta",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Company not found. |
| 409 | A record with that value already exists. |

### Delete company

`DELETE /api/companies/:id`

**Access:** admin

Cascades to the recruiter account(s), drives and applications.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "message": "Company, recruiter account, drives and applications removed."
}
```

---

## Drives

### List drives

`GET /api/drives`

**Access:** All roles (scoped)

Students see only `Open` drives whose deadline is in the future, each with `eligibility` and their own `applicationStatus`. Recruiters see only their company's drives. Admins see all.

**Headers**

```http
Authorization: Bearer <token>
```

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `status` | string | Open, Closed or Draft (ignored for students) |
| `companyId` | ObjectId | Admin only |
| `page` | number | Default 1 |
| `limit` | number | Default 50, max 100 |

**Response 200**

```json
{
  "items": [
    {
      "_id": "665f1c2a9b1e4a0012a00020",
      "companyId": {
        "_id": "665f1c2a9b1e4a0012a00010",
        "name": "Aster Digital",
        "industry": "Software",
        "location": "Jaipur"
      },
      "jobRole": "Software Engineer",
      "description": "Full-stack role on the product team.",
      "package": 8.5,
      "location": "Jaipur",
      "minimumCGPA": 7.0,
      "maximumBacklogs": 0,
      "eligibleDepartments": [
        "CSE",
        "IT"
      ],
      "graduationYear": 2027,
      "deadline": "2026-12-15T18:29:59.000Z",
      "status": "Open",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z",
      "eligibility": {
        "eligible": true,
        "reasons": []
      },
      "applicationStatus": null
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 1,
  "pages": 1
}
```

`eligibility` is present only for students. For admins and recruiters it is omitted. `applicationStatus` is `null` when the student has not applied.

### Create drive

`POST /api/drives`

**Access:** admin, recruiter

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `companyId` | ObjectId | Admin only | Recruiters are forced to their own company |
| `jobRole` | string | Yes |  |
| `description` | string | Yes |  |
| `package` | number | Yes | Min 0 (e.g. LPA) |
| `location` | string | Yes |  |
| `minimumCGPA` | number | Yes | 0-10 |
| `maximumBacklogs` | number | Yes | Min 0 |
| `eligibleDepartments` | string[] | Yes | At least one of CSE, IT, ECE, Mechanical, Civil, Electrical |
| `graduationYear` | number | Yes | Batch the drive targets |
| `deadline` | ISO date | Yes |  |
| `status` | string | No | Open (default), Closed, Draft |

**Example request body**

```json
{
  "companyId": "665f1c2a9b1e4a0012a00010",
  "jobRole": "Software Engineer",
  "description": "Full-stack role on the product team.",
  "package": 8.5,
  "location": "Jaipur",
  "minimumCGPA": 7.0,
  "maximumBacklogs": 0,
  "eligibleDepartments": [
    "CSE",
    "IT"
  ],
  "graduationYear": 2027,
  "deadline": "2026-12-15T18:29:59.000Z",
  "status": "Open"
}
```

**Response 201**

```json
{
  "_id": "665f1c2a9b1e4a0012a00020",
  "companyId": "665f1c2a9b1e4a0012a00010",
  "jobRole": "Software Engineer",
  "description": "Full-stack role on the product team.",
  "package": 8.5,
  "location": "Jaipur",
  "minimumCGPA": 7.0,
  "maximumBacklogs": 0,
  "eligibleDepartments": [
    "CSE",
    "IT"
  ],
  "graduationYear": 2027,
  "deadline": "2026-12-15T18:29:59.000Z",
  "status": "Open",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Choose a valid company. |
| 400 | Choose at least one eligible department. |
| 400 | Validation message(s) |

### Get drive

`GET /api/drives/:id`

**Access:** All roles (recruiters: own company only)

`drive.companyId` is populated with the full company. `eligibility` appears for students only.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "drive": {
    "_id": "665f1c2a9b1e4a0012a00020",
    "companyId": {
      "_id": "665f1c2a9b1e4a0012a00010",
      "name": "Aster Digital",
      "description": "Product engineering studio",
      "website": "https://asterdigital.example",
      "location": "Jaipur",
      "industry": "Software",
      "contactEmail": "hr@asterdigital.example",
      "contactName": "Riya Mehta",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z"
    },
    "jobRole": "Software Engineer",
    "description": "Full-stack role on the product team.",
    "package": 8.5,
    "location": "Jaipur",
    "minimumCGPA": 7.0,
    "maximumBacklogs": 0,
    "eligibleDepartments": [
      "CSE",
      "IT"
    ],
    "graduationYear": 2027,
    "deadline": "2026-12-15T18:29:59.000Z",
    "status": "Open",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  },
  "eligibility": {
    "eligible": true,
    "reasons": []
  }
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Drive not found. |

### Update drive

`PUT /api/drives/:id`

**Access:** admin, recruiter (own company)

Partial update. `companyId` can be changed by admins only.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example request body**

```json
{
  "status": "Closed",
  "deadline": "2026-12-20T18:29:59.000Z"
}
```

**Response 200**

```json
{
  "_id": "665f1c2a9b1e4a0012a00020",
  "companyId": "665f1c2a9b1e4a0012a00010",
  "jobRole": "Software Engineer",
  "description": "Full-stack role on the product team.",
  "package": 8.5,
  "location": "Jaipur",
  "minimumCGPA": 7.0,
  "maximumBacklogs": 0,
  "eligibleDepartments": [
    "CSE",
    "IT"
  ],
  "graduationYear": 2027,
  "deadline": "2026-12-15T18:29:59.000Z",
  "status": "Closed",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Drive not found. |
| 400 | Validation message(s) |

### Delete drive

`DELETE /api/drives/:id`

**Access:** admin, recruiter (own company)

Also deletes the drive's applications.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "message": "Drive and its applications removed."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Drive not found. |

---

## Applications

### List applications

`GET /api/applications`

**Access:** All roles (scoped)

Students see their own, recruiters their company's, admins all. Newest first.

**Headers**

```http
Authorization: Bearer <token>
```

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `status` | string | Applied, Under Review, Shortlisted, Selected or Rejected |
| `companyId` | ObjectId | Admin only |
| `page` | number | Default 1 |
| `limit` | number | Default 50, max 100 |

**Response 200**

```json
{
  "items": [
    {
      "_id": "665f1c2a9b1e4a0012a00030",
      "studentId": {
        "_id": "665f1c2a9b1e4a0012a00002",
        "name": "Aarav Sharma",
        "email": "student01@skit.ac.in"
      },
      "driveId": {
        "_id": "665f1c2a9b1e4a0012a00020",
        "jobRole": "Software Engineer",
        "package": 8.5,
        "deadline": "2026-12-15T18:29:59.000Z"
      },
      "companyId": {
        "_id": "665f1c2a9b1e4a0012a00010",
        "name": "Aster Digital"
      },
      "status": "Applied",
      "appliedAt": "2026-10-31T10:15:00.000Z",
      "remarks": "",
      "createdAt": "2026-10-31T10:15:00.000Z",
      "updatedAt": "2026-10-31T10:15:00.000Z"
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 1,
  "pages": 1
}
```

### Apply to drive

`POST /api/applications`

**Access:** student

Runs server-side checks in order: drive exists, drive is Open and before deadline, student is eligible (CGPA, backlogs, department, graduation year), no duplicate application.

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `driveId` | ObjectId | Yes | Target drive |

**Example request body**

```json
{
  "driveId": "665f1c2a9b1e4a0012a00020"
}
```

**Response 201**

```json
{
  "application": {
    "_id": "665f1c2a9b1e4a0012a00030",
    "studentId": "665f1c2a9b1e4a0012a00002",
    "driveId": "665f1c2a9b1e4a0012a00020",
    "companyId": "665f1c2a9b1e4a0012a00010",
    "status": "Applied",
    "appliedAt": "2026-10-31T10:15:00.000Z",
    "remarks": "",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  },
  "message": "Application submitted successfully."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Placement drive not found. |
| 400 | Applications for this drive are closed. |
| 400 | You are not eligible for this placement drive. (response also contains `reasons`: string[]) |
| 409 | You have already applied for this placement drive. |

Example eligibility failure:

```json
{
  "message": "You are not eligible for this placement drive.",
  "reasons": [
    "CGPA 6.40 is below the required 7.00.",
    "This drive is for the 2027 graduating batch."
  ]
}
```

### Update status

`PATCH /api/applications/:id/status`

**Access:** admin, recruiter (own company)

Any status can be set from any other. `remarks` is overwritten (an omitted value resets it to an empty string).

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | Yes | Applied, Under Review, Shortlisted, Selected, Rejected |
| `remarks` | string | No | Defaults to empty string |

**Example request body**

```json
{
  "status": "Shortlisted",
  "remarks": "Strong coding round"
}
```

**Response 200**

```json
{
  "application": {
    "_id": "665f1c2a9b1e4a0012a00030",
    "studentId": {
      "_id": "665f1c2a9b1e4a0012a00002",
      "name": "Aarav Sharma",
      "email": "student01@skit.ac.in"
    },
    "driveId": {
      "_id": "665f1c2a9b1e4a0012a00020",
      "jobRole": "Software Engineer"
    },
    "companyId": {
      "_id": "665f1c2a9b1e4a0012a00010",
      "name": "Aster Digital"
    },
    "status": "Shortlisted",
    "appliedAt": "2026-10-31T10:15:00.000Z",
    "remarks": "Strong coding round",
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  },
  "message": "Application status updated."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Choose a valid application status. |
| 404 | Application not found. |

### Withdraw / delete application

`DELETE /api/applications/:id`

**Access:** student (own, status Applied only); admin

Students may withdraw only while the status is still `Applied`. Admins can delete any.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "message": "Application withdrawn."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | You may withdraw only applications that are still marked Applied. |
| 404 | Application not found. |

---

## Statistics

### Dashboard stats

`GET /api/stats/dashboard`

**Access:** All roles (response shape depends on role)

Three different shapes. Student, recruiter and admin examples are in the saved responses.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200** (admin)

```json
{
  "students": 18,
  "companies": 6,
  "drives": 7,
  "applications": 24,
  "placed": 5,
  "placementPercentage": 27.8,
  "departmentStats": [
    {
      "_id": "CSE",
      "department": "CSE",
      "placed": 3
    }
  ],
  "companyStats": [
    {
      "_id": "Aster Digital",
      "company": "Aster Digital",
      "placed": 2
    }
  ]
}
```

**Response 200 (student)**

```json
{
  "totalAvailableDrives": 5,
  "eligibleDrives": 3,
  "appliedCompanies": 2,
  "applications": [
    {
      "status": "Applied",
      "company": "Aster Digital",
      "role": "Software Engineer",
      "appliedAt": "2026-10-31T10:15:00.000Z"
    }
  ],
  "announcementCount": 4
}
```

**Response 200 (recruiter)**

```json
{
  "drives": 2,
  "applications": 9,
  "statuses": {
    "Applied": 4,
    "Shortlisted": 3,
    "Selected": 2
  }
}
```

---

## Announcements

### List announcements

`GET /api/announcements`

**Access:** All roles (filtered by audience)

Bare array, newest first. Students get `all` + `students`; recruiters `all` + `recruiters`; admins everything.

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
[
  {
    "_id": "665f1c2a9b1e4a0012a00040",
    "title": "Aster Digital drive on 12 Dec",
    "body": "Carry two copies of your resume.",
    "audience": "all",
    "postedBy": {
      "_id": "665f1c2a9b1e4a0012a00004",
      "name": "Placement Officer"
    },
    "createdAt": "2026-10-31T10:15:00.000Z",
    "updatedAt": "2026-10-31T10:15:00.000Z"
  }
]
```

### Create announcement

`POST /api/announcements`

**Access:** admin

**Headers**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body fields**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | Yes | Max 120 chars |
| `body` | string | Yes |  |
| `audience` | string | No | all (default), students, recruiters |

**Example request body**

```json
{
  "title": "Aster Digital drive on 12 Dec",
  "body": "Carry two copies of your resume.",
  "audience": "all"
}
```

**Response 201**

```json
{
  "_id": "665f1c2a9b1e4a0012a00040",
  "title": "Aster Digital drive on 12 Dec",
  "body": "Carry two copies of your resume.",
  "audience": "all",
  "postedBy": "665f1c2a9b1e4a0012a00004",
  "createdAt": "2026-10-31T10:15:00.000Z",
  "updatedAt": "2026-10-31T10:15:00.000Z"
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 400 | Title and announcement text are required. |

### Delete announcement

`DELETE /api/announcements/:id`

**Access:** admin

**Headers**

```http
Authorization: Bearer <token>
```

**Response 200**

```json
{
  "message": "Announcement removed."
}
```

**Errors**

| Code | `message` |
| --- | --- |
| 404 | Announcement not found. |
