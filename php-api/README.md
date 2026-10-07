# Maranao Treasures - PHP REST API

This folder **is** the backend. It ships inside the project and must stay here:

```
Paynal-main/
├── php-api/     <- this API (main and only backend)
├── src/         <- React frontend
├── public/
├── package.json
├── vite.config.ts
└── database/    <- SQL seeds
```

No separate `C:\xampp\htdocs\api` folder is needed or used.

## Setup Instructions (XAMPP)

### 1. Database
- Open phpMyAdmin: `http://localhost/phpmyadmin`
- Import `database/maranao_treasures_db.sql` into `maranao_treasures_db`

### 2. Start XAMPP
- Start **Apache** and **MySQL** modules

### 3. Run the frontend
```
npm install
npm run dev
```

### 4. Test API
Via the Vite dev proxy (what the React app uses):
```
http://localhost:8080/php-api/products/index.php
```
Directly through Apache (project folder must keep its name):
```
http://localhost/Paynal-main/php-api/products/index.php
```

The React app always uses the relative base `/php-api`; `vite.config.ts`
rewrites it to `/<project-folder>/php-api` on the Apache side.

## API Endpoints

All paths below are appended to the API base (`/php-api` in development).

### Auth
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| POST | `/auth/register.php` | Register new user | No |
| POST | `/auth/login.php` | Login | No |
| GET | `/auth/me.php` | Get current user | Yes |

### Products
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/products/index.php` | List products (`?category=brassware&search=brass`) | No |
| GET | `/products/show.php?id={id}` | Product detail | No |
| GET | `/products/categories.php` | List categories | No |

### Cart
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/cart/index.php` | View cart | Yes |
| POST | `/cart/index.php` | Add to cart | Yes |
| PUT | `/cart/index.php` | Update quantity | Yes |
| DELETE | `/cart/index.php` | Remove item / clear cart | Yes |

### Orders
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/orders/index.php` | List my orders | Yes |
| GET | `/orders/show.php?id={id}` | Order detail | Yes |
| POST | `/orders/index.php` | Place order | Yes |

### Reviews
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/reviews/index.php?product_id=1` | Get reviews | No |
| POST | `/reviews/index.php` | Add review | Yes |

### Artisans
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/artisans/index.php` | List artisans | No |

Other folders: `seller/`, `buyer/`, `admin/`, `messages/`, `payments/`.

---

## Authentication
Include JWT token in header:
```
Authorization: Bearer <your_token>
```

The signing secret is read from the `JWT_SECRET` environment variable, or from
`C:\xampp\maranao_jwt_secret.txt` (32+ random characters) - never committed.

## React Integration
```typescript
// src/lib/api.ts
const API_BASE = "/php-api"; // proxied by Vite to this folder

const res = await fetch(`${API_BASE}/auth/login.php`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem("auth_token", token);
```
