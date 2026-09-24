# Casaq Ecommerce API

REST API for the Casaq ecommerce template. Built with **Express**, **MongoDB**, **JWT**, and **ImageKit**.

## Architecture (MVVC)

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| **Model** | `src/models/` | Mongoose schemas & DB logic |
| **View** | `src/views/` | Standardized API response format |
| **ViewModel** | `src/services/` | Business logic & data shaping |
| **Controller** | `src/controllers/` | HTTP request/response handling |

Additional: `routes/`, `middleware/`, `validators/`, `config/`, `utils/`

## Models

Aligned with frontend `FE/src/data/`:

- **User** — auth (`customer` \| `admin`)
- **Product** — catalog
- **Order** — checkout orders with line items
- **Payment** — linked to orders
- **Contact** — contact form messages

## Setup

```bash
cd BE
npm install
cp .env.example .env
# Edit .env with MongoDB URI, JWT secret, and ImageKit keys
npm run seed          # seed if collections are empty
npm run seed:force    # clear & re-seed products, orders, payments, contacts
npm run dev
```

API base URL: `http://localhost:5000/api/v1`

## Environment

See `.env.example` for all variables. Required:

- `MONGODB_URI`
- `JWT_SECRET`

ImageKit (for admin image uploads):

- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

## Seed credentials

After `npm run seed`:

- **Admin:** `casaqte@gmail.com` / `Admin@123` (override via `SEED_ADMIN_EMAIL` in `.env`)
- **8 products** from `FE/src/data/products.ts`
- **5 orders** from `FE/src/data/mockData.ts`
- **5 payments** linked to those orders
- **2 contact messages** from `FE/src/data/mockData.ts`
- **5 demo customers:** `alice@example.com` … `evan@example.com` / `Customer@123`

Use `npm run seed:force` to wipe and re-import orders, payments, contacts, and products.

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | — | Register |
| POST | `/auth/login` | — | Login (returns JWT) |
| GET | `/auth/me` | User | Current profile |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | — | List (filter, search, paginate) |
| GET | `/products/:id` | — | Single product |
| POST | `/products` | Admin | Create |
| PATCH | `/products/:id` | Admin | Update |
| DELETE | `/products/:id` | Admin | Delete |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | User | Place order |
| GET | `/orders/my` | User | My orders |
| GET | `/orders` | Admin | All orders |
| GET | `/orders/:id` | User/Admin | Order detail |
| PATCH | `/orders/:id/status` | Admin | Update status |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payments/my` | User | My payments |
| GET | `/payments` | Admin | All payments |
| PATCH | `/payments/:id/status` | Admin | Update status |

### Contact
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/contact` | — | Submit message |
| GET | `/contact` | Admin | List messages |
| PATCH | `/contact/:id/read` | Admin | Mark read |
| DELETE | `/contact/:id` | Admin | Delete |

### Upload (ImageKit)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/single` | Admin | Upload one image (`image` field) |
| POST | `/upload/multiple` | Admin | Upload up to 10 (`images` field) |

## Auth header

```
Authorization: Bearer <token>
```

## Response format

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```
# template_ecommerce_BE
