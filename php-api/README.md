# Maranao Treasures - PHP REST API

## Setup Instructions (XAMPP)

### 1. Copy Files
Copy the entire `php-api` folder to:
```
C:\xampp\htdocs\api\
```

### 2. Import Database
- Open phpMyAdmin: `http://localhost/phpmyadmin`
- Import the file: `database/maranao_treasures_db.sql`

### 3. Start XAMPP
- Start **Apache** and **MySQL** modules

### 4. Test API
Open browser: `http://localhost/api/products`

---

## API Endpoints

### Auth
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Products
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/api/products` | List all products | No |
| GET | `/api/products/{id}` | Get product detail | No |
| GET | `/api/categories` | List categories | No |

Query params for products: `?category=brassware&search=brass`

### Cart
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/api/cart` | View cart | Yes |
| POST | `/api/cart` | Add to cart | Yes |
| PUT | `/api/cart` | Update quantity | Yes |
| DELETE | `/api/cart?product_id=1` | Remove item | Yes |
| DELETE | `/api/cart` | Clear cart | Yes |

### Orders
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/api/orders` | List my orders | Yes |
| GET | `/api/orders/{id}` | Order detail | Yes |
| POST | `/api/orders` | Place order | Yes |

### Reviews
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/api/reviews?product_id=1` | Get reviews | No |
| POST | `/api/reviews` | Add review | Yes |

### Artisans
| Method | URL | Description | Auth? |
|--------|-----|-------------|-------|
| GET | `/api/artisans` | List artisans | No |

---

## Authentication
Include JWT token in header:
```
Authorization: Bearer <your_token>
```

## React Integration
In your React app, set the API base URL:
```typescript
const API_BASE = "http://localhost/api";

// Example: Fetch products
const res = await fetch(`${API_BASE}/products`);
const data = await res.json();

// Example: Login
const res = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem("token", token);
```
