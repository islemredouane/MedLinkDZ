# MedLink DZ — API reference

> Version **2.0** · REST · JSON

Base URL: `http://localhost:5000` in development, your Render URL in production (the front-end reads it from `VITE_API_URL`).

## Global Patterns

- **Authentication**: Endpoints requiring authentication need a JWT token passed in the `Authorization` header as `Bearer <token>`.
- **Response Format**: All responses provide a standard JSON format with at minimum a `success` field (boolean).
- **File Uploads**: Endpoints that accept file uploads use `multipart/form-data` instead of `application/json`.

---

## 1. Authentication & Profile (`/api/auth`)

### 1.1 Register
Create a new user account.
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Auth Required**: No
- **Request Body** (`application/json`):
  ```json
  {
    "nom": "Doe",
    "prenom": "John",
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "phone": "0555123456"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Inscription réussie !",
    "token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "user": {
      "id": 1,
      "nom": "Doe",
      "prenom": "John",
      "email": "john.doe@example.com",
      "phone": "0555123456",
      "role": "USER",
      "is_verified": false,
      "created_at": "2026-04-13T20:00:00.000Z"
    }
  }
  ```

### 1.2 Login
Authenticate an existing user.
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth Required**: No
- **Request Body** (`application/json`):
  ```json
  {
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Connexion réussie !",
    "token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "user": {
      "id": 1,
      "nom": "Doe",
      ...
    }
  }
  ```

### 1.3 Get Current Profile
Fetch the currently authenticated user's profile.
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Auth Required**: Yes
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "nom": "Doe",
      ...
    }
  }
  ```

### 1.4 Update Profile
Update the user's profile information, including avatar.
- **Method**: `PATCH`
- **URL**: `/api/auth/update-profile`
- **Auth Required**: Yes
- **Request Format**: `multipart/form-data`
  - `nom` (text) - Optional
  - `prenom` (text) - Optional
  - `phone` (text) - Optional
  - `avatar` (file, max 5MB, JPG/PNG/WEBP) - Optional
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Profil mis à jour avec succès.",
    "user": { ... }
  }
  ```

---

### 1.5 Email verification & password reset
| Method | URL | Body / query | Notes |
|---|---|---|---|
| `GET` | `/api/auth/verify-email` | `?token=…` | token from the verification email |
| `POST` | `/api/auth/resend-verification` | `{ "email": "…" }` | sends a new verification link |
| `POST` | `/api/auth/forgot-password` | `{ "email": "…" }` | sends a reset link (same answer whether the email exists or not) |
| `POST` | `/api/auth/reset-password` | `{ "token": "…", "newPassword": "…" }` | token from the reset email |

Without Brevo keys (`BREVO_API_KEY`, `SENDER_EMAIL`), the emails are printed in the server log instead of being sent.

---

## 2. Annonces (`/api/annonces`)

### 2.1 Get All Annonces
Fetch all published annonces, with optional filtering.
- **Method**: `GET`
- **URL**: `/api/annonces`
- **Auth Required**: No
- **Query Parameters**:
  - `type` (`DON` or `DEMANDE`) - Optional
  - `wilaya_id` (integer) - Optional
  - `medicament_id` (integer) - Optional
  - `search` (string) - Optional
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "count": 10,
    "annonces": [
      {
        "id": 1,
        "type": "DON",
        "quantite": 2,
        "dci": "Paracetamol",
        "wilaya_nom": "Alger",
        ...
      }
    ]
  }
  ```

### 2.2 Get Annonce by ID
Unpublished annonces are visible only to their owner and admins. The owner's phone number is returned only to signed-in users.
Fetch a single annonce with all its details, including uploaded media.
- **Method**: `GET`
- **URL**: `/api/annonces/:id`
- **Auth Required**: No
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "annonce": {
      "id": 1,
      "type": "DON",
      "dci": "Paracetamol",
      "medias": [
        { "id": 1, "url": "/uploads/image.jpg", "type": "IMAGE" }
      ],
      ...
    }
  }
  ```

### 2.3 Get My Annonces
Fetch all annonces posted by the authenticated user.
- **Method**: `GET`
- **URL**: `/api/annonces/user/my-annonces`
- **Auth Required**: Yes
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "count": 3,
    "annonces": [ { ... } ]
  }
  ```

### 2.4 Create Annonce
Post a new annonce.
- **Method**: `POST`
- **URL**: `/api/annonces`
- **Auth Required**: Yes
- **Request Format**: `multipart/form-data`
  - `medicament_name` (string, required) — the medicine is found by name or created
  - `categorie_id` (integer, required) — saved on a new medicine, never overwrites an existing one
  - `wilaya_id` (integer, required)
  - `type` (`DON` or `DEMANDE`, required)
  - `quantite` (integer, required)
  - `date_peremption` (`YYYY-MM-DD`, **required for `DON`**, must be today or later)
  - `ordonnance_id` (integer, `DEMANDE` only) — an uploaded prescription owned by the user and not yet attached. **Required** when the medicine has `prescription_required = true`
  - `description` (text, optional)
  - `images` (file, max 5 files, 5MB each) - Optional
- New annonces start as `EN_ATTENTE` and are published by an admin.
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Annonce créée avec succès.",
    "annonce": { ... }
  }
  ```

### 2.5 Update Annonce
Update an existing annonce (Only owner or Admin).
- **Method**: `PUT`
- **URL**: `/api/annonces/:id`
- **Auth Required**: Yes
- **Request Body** (`application/json`):
  ```json
  {
    "quantite": 3,
    "description": "Updated description"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Annonce mise à jour.",
    "annonce": { ... }
  }
  ```

### 2.6 Delete Annonce
Delete an annonce (Only owner or Admin).
- **Method**: `DELETE`
- **URL**: `/api/annonces/:id`
- **Auth Required**: Yes
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Annonce supprimée avec succès."
  }
  ```

---

## 3. Catalog (`/api/catalog`)

### 3.1 Get Categories
List all medicine categories.
- **Method**: `GET`
- **URL**: `/api/catalog/categories`
- **Auth Required**: No
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "categories": [
      { "id": 1, "nom": "Antibiotiques", "description": "..." }
    ]
  }
  ```

### 3.2 Get Medicaments
List medicines (with optional search and category filtering).
- **Method**: `GET`
- **URL**: `/api/catalog/medicaments`
- **Auth Required**: No
- **Query Parameters**:
  - `search` (string) - Optional
  - `categorie_id` (integer) - Optional
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "medicaments": [
      { "id": 1, "dci": "Amoxicilline", "marque": "Clamoxyl", ... }
    ]
  }
  ```

### 3.3 Get Summary
Public counters shown on the home page.
- **Method**: `GET`
- **URL**: `/api/catalog/summary`
- **Auth Required**: No

### 3.4 Get Wilayas
List all wilayas in Algeria.
- **Method**: `GET`
- **URL**: `/api/catalog/wilayas`
- **Auth Required**: No
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "wilayas": [
      { "id": 1, "nom_fr": "Adrar", "nom_ar": "أدرار" }
    ]
  }
  ```

---

## 4. Ordonnances (`/api/ordonnances`)

Prescriptions are private: files are stored outside the public `uploads/` folder and are never returned as a URL. Only the uploader and admins can read them; anyone else gets `404`.

### 4.1 Upload Ordonnance
Upload a prescription document, returning the ID to attach to a new annonce.
- **Method**: `POST`
- **URL**: `/api/ordonnances/upload`
- **Auth Required**: Yes
- **Request Format**: `multipart/form-data`
  - `ordonnance` (file, required, PDF or Image, max 5MB)
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Ordonnance uploadée avec succès. En attente de validation.",
    "ordonnance": {
      "id": 1,
      "statut": "EN_ATTENTE",
      "admin_comment": null,
      "created_at": "2026-11-23T21:00:00.000Z"
    }
  }
  ```

### 4.2 Get Ordonnance By ID
Fetch details of a prescription.
- **Method**: `GET`
- **URL**: `/api/ordonnances/:id`
- **Auth Required**: Yes
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "ordonnance": {
      "id": 1,
      "statut": "VALIDEE",
      "admin_comment": null,
      "created_at": "..."
    }
  }
  ```

### 4.3 Get Ordonnance File
Stream the prescription file (owner or admin only). Sent with `Cache-Control: private, no-store`.
- **Method**: `GET`
- **URL**: `/api/ordonnances/:id/file`
- **Auth Required**: Yes
- **Response** (200 OK): the file itself (PDF or image)

---

## 5. Administration (`/api/admin`)

*Note: All endpoints under `/api/admin` require a valid JWT token tied to an account with the `ADMIN` role.*

### 5.1 Get Stats
Get dashboard statistics.
- **Method**: `GET`
- **URL**: `/api/admin/stats`
- **Auth Required**: Yes (Admin)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "stats": {
      "totalUsers": 12,
      "totalAnnonces": 45,
      "pendingAnnonces": 5,
      "publishedAnnonces": 38,
      "pendingOrdonnances": 2
    }
  }
  ```

### 5.2 Get Pending Items
List all annonces and ordonnances waiting for moderation.
- **Method**: `GET`
- **URL**: `/api/admin/pending`
- **Auth Required**: Yes (Admin)
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "annonces": [ { "...": "...", "prescription_required": true, "categorie_nom": "Neurologie", "ordonnance_statut": "EN_ATTENTE" } ],
    "ordonnances": [ { ... } ]
  }
  ```

### 5.3 Moderate Annonce
Approve, reject, or suspend an annonce.
- **Method**: `PATCH`
- **URL**: `/api/admin/moderate/:id`
- **Auth Required**: Yes (Admin)
- **Request Body** (`application/json`):
  ```json
  {
    "statut": "PUBLIEE" // Values: 'PUBLIEE', 'REJETEE', 'SUSPENDUE'
  }
  ```
- Publishing an annonce also validates its pending prescription; rejecting it rejects the prescription.
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Annonce publiée avec succès.",
    "annonce": { ... }
  }
  ```

### 5.4 Moderate Ordonnance
Approve or reject a prescription document.
- **Method**: `PATCH`
- **URL**: `/api/admin/ordonnance/:id`
- **Auth Required**: Yes (Admin)
- **Request Body** (`application/json`):
  ```json
  {
    "statut": "VALIDEE", // Values: 'VALIDEE', 'REJETEE'
    "comment": "La signature du médecin est valide." // Optional
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Ordonnance validée avec succès.",
    "ordonnance": { ... }
  }
  ```

### 5.5 Users
- `GET /api/admin/users` — users with their annonces
- `PATCH /api/admin/users/:id/suspend` — body `{ "suspend": true }` suspends, `false` reactivates
- `DELETE /api/admin/users/:id` — delete an account (admins cannot suspend or delete themselves)

### 5.6 Mark a Medicine as Prescription-only
- **Method**: `PATCH`
- **URL**: `/api/admin/medicaments/:id`
- **Auth Required**: Yes (Admin)
- **Request Body** (`application/json`):
  ```json
  { "prescription_required": true }
  ```
- **Response** (200 OK):
  ```json
  { "success": true, "medicament": { "id": 12, "marque": "Ritaline 10 mg", "prescription_required": true } }
  ```
