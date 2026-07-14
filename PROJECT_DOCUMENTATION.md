# E-Commerce Project Architecture & Documentation

This document provides a comprehensive technical analysis of the **E-Commerce Web Application**. It outlines the technology stack, project architecture, navigation flow, database schema (ER Diagram), page responsibilities, and a concrete guide on how to separate User and Admin authentication workflows.

---

## Table of Contents
1. [Technology Stack & Architectural Rationale](#1-technology-stack--architectural-rationale)
2. [Project Architecture & MVC Flow](#2-project-architecture--mvc-flow)
3. [Page Navigation & User Flows](#3-page-navigation--user-flows)
4. [Database Structure & ER Diagram](#4-database-structure--er-diagram)
5. [Page Directory & Responsibilities](#5-page-directory--responsibilities)
6. [Guide: Splitting User and Admin Login Pages](#6-guide-splitting-user-and-admin-login-pages)

---

## 1. Technology Stack & Architectural Rationale

| Technology / Package | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| **Node.js & Express.js** | `^5.2.1` | **Core Backend Framework**: Provides a fast, non-blocking I/O runtime. Express handles HTTP request routing, middleware execution, static file serving, and RESTful APIs with minimal overhead. |
| **EJS (Embedded JS)** | `^4.0.1` | **Server-Side Rendering (SSR)**: Enables dynamic HTML generation on the server using JavaScript syntax. EJS ensures rapid initial page loads and superior SEO performance compared to client-heavy SPAs, while allowing clean UI modularization via `partials`. |
| **Firebase Admin SDK** | `^13.7.0` | **NoSQL Database & Cloud Storage**: Connects to **Firebase Realtime Database (RTDB)**. Chosen for real-time data sync capabilities, flexible JSON document structures (`Users`, `Products`, `Orders`), and seamless cloud deployment without managing physical database instances. |
| **Cookie-Session** | `^2.1.1` | **Stateless Session Management**: Stores encrypted user session data (`id`, `email`, `role`) directly inside client HTTP cookies. Unlike server-memory sessions, `cookie-session` scales effortlessly across serverless environments like Vercel. |
| **Razorpay** | `^2.9.6` | **Payment Gateway Integration**: Facilitates secure online checkout supporting UPI, Credit/Debit Cards, and Netbanking alongside standard Cash on Delivery (COD). |
| **Multer** | `^2.1.0` | **Multipart File Handling**: Middleware that intercepts and processes form image uploads (`productImage`, `bannerImage`) from admin forms before saving them to disk (`/public/uploads`) or cloud buckets. |
| **Dotenv** | `^17.3.1` | **Environment Configuration**: Manages sensitive credentials (`FIREBASE_PRIVATE_KEY`, `SESSION_SECRET`, `RAZORPAY_KEY_ID`) across development and production environments cleanly. |

---

## 2. Project Architecture & MVC Flow

The application strictly adheres to the **Model-View-Controller (MVC)** design pattern, separating data operations, business logic, and presentation.

```mermaid
graph TD
    Client[Client Browser] -->|HTTP Request| Server[server.js / Express Application]
    
    subgraph Middleware Layer
        Server --> AuthMW[Auth Middleware: isAuthenticated / isAdmin / isGuest]
        Server --> UploadMW[Upload Middleware: Multer File Handlers]
    end
    
    subgraph Route Layer
        AuthMW --> AuthRoutes[/routes/authRoutes.js]
        AuthMW --> UserRoutes[/routes/userRoutes.js]
        AuthMW --> AdminRoutes[/routes/adminRoutes.js]
    end
    
    subgraph Controller Layer
        AuthRoutes --> AuthCtrl[controllers/authController.js]
        UserRoutes --> UserCtrl[controllers/userController.js]
        AdminRoutes --> AdminCtrl[controllers/adminController.js]
    end
    
    subgraph Model Layer (Firebase Admin)
        AuthCtrl & UserCtrl & AdminCtrl --> UserModel[models/userModel.js]
        UserCtrl & AdminCtrl --> ProductModel[models/productModel.js]
        UserCtrl & AdminCtrl --> OrderModel[models/orderModel.js]
        UserCtrl --> CartModel[models/cartModel.js]
        UserCtrl --> FavModel[models/favoriteModel.js]
        UserCtrl & AdminCtrl --> BannerModel[models/bannerModel.js]
    end
    
    subgraph View Layer (EJS Templates)
        AuthCtrl --> UserViews[/views/user/*.ejs]
        UserCtrl --> UserViews
        AdminCtrl --> AdminViews[/views/admin/*.ejs]
    end
    
    UserModel & ProductModel & OrderModel & CartModel & FavModel & BannerModel -->|Firebase SDK| FirebaseDB[(Firebase Realtime Database)]
    UserViews & AdminViews -->|HTML Response| Client
```

---

## 3. Page Navigation & User Flows

### A. Guest / Public Shopping Flow
1. **Landing Page (`/`)**: Guests arrive at the homepage (`home.ejs`), viewing active promotional banners (`Banners` collection) and featured products (`Products` collection).
2. **Catalog Exploration (`/products`)**: Users browse all products (`productListing.ejs`), filtering by search terms or categories.
3. **Product Details (`/product/:id`)**: Clicking a product opens `productDetails.ejs`, showing price, stock status, description, and "Add to Cart" / "Add to Favorites" buttons.
4. **Authentication (`/auth/login` or `/auth/register`)**: If a guest tries to access protected features (like Cart or Checkout), the `isAuthenticated` middleware redirects them to `/auth/login`.

### B. Authenticated Customer Flow
1. **Cart Management (`/cart`)**: Authenticated users view their shopping cart (`cart.ejs`). They can adjust quantities (`PUT /api/cart/update`) or remove items (`DELETE /api/cart/remove/:productId`).
2. **Checkout & Order Placement**:
   - **Cash on Delivery (COD)**: Submitting `/place-order` records the order immediately in the `Orders` collection with status `"Placed (COD)"` and clears the user's cart.
   - **Online Payment (Razorpay)**: Clicking Pay Online triggers `/api/cart/create-razorpay-order`, opens the Razorpay checkout modal, and upon success verifies the signature at `/api/cart/verify-payment`.
3. **Order History (`/my-orders`)**: Customers track past orders and current fulfillment status in `myOrders.ejs`.

### C. Admin Dashboard Flow
1. **Accessing Admin Panel (`/admin/dashboard`)**: Protected by `isAdmin` middleware. Admins see metrics (Total Products, Total Orders, Recent Orders).
2. **Product Management (`/admin/manage-products`)**:
   - **Add Product (`/admin/add-product`)**: Form with image upload via Multer.
   - **Edit Product (`/admin/update-product/:id`)**: Pre-populated form to modify pricing, stock, or descriptions.
   - **Delete Product (`POST /admin/delete-product/:id`)**: Removes product record from Firebase.
3. **Order Management (`/admin/view-orders`)**: Admins view all customer orders across the platform (`viewOrders.ejs`).
4. **Banner Management (`/admin/manage-banners`)**: Admins upload and remove promotional sliders displayed on the homepage.

---

## 4. Database Structure & ER Diagram

The system uses **Firebase Realtime Database**, structured around top-level collections. While NoSQL is document-based, the logical entity relationships are mapped below:

```mermaid
erDiagram
    Users ||--o{ Orders : places
    Users ||--o| Carts : owns
    Users ||--o| Favorites : owns
    Products ||--o{ Orders : contained_in
    Products ||--o{ Carts : referenced_in
    Products ||--o{ Favorites : referenced_in

    Users {
        string userId PK
        string name
        string email
        string password
        string role "user | admin"
        string mobileNumber
        string address
        string location
    }

    Products {
        string productId PK
        string name
        number price
        number oldPrice
        string category
        string description
        string imageUrl
        number stock
        number createdAt
    }

    Orders {
        string orderId PK
        string userId FK
        string productId FK
        number quantity
        string userName
        string mobileNumber
        string address
        string location
        number totalPrice
        string orderStatus "Placed (COD) | Paid Online"
        number timestamp
    }

    Carts {
        string userId PK_FK
        array items "Array of {productId, quantity, name, price, imageUrl, addedAt}"
        number updatedAt
    }

    Favorites {
        string userId PK_FK
        array items "Array of {productId, name, price, imageUrl, addedAt}"
        number updatedAt
    }

    Banners {
        string bannerId PK
        string title
        string imageUrl
        string link
        number createdAt
    }
```

### Collection Schemas & Design Notes
- **`Users` Collection**: Keyed by unique `userId` generated via `.doc().id`. Stores hashed SHA-256 passwords along with user metadata (`role: 'user'` vs `role: 'admin'`).
- **`Products` Collection**: Keyed by `productId`. Stores item metadata, pricing (`price` and `oldPrice` for discount calculation), image paths, and category.
- **`Orders` Collection**: Keyed by `orderId`. Captures a snapshot of the customer's delivery details and price at the exact moment of purchase along with timestamps.
- **`Carts` & `Favorites` Collections**: To optimize read performance and avoid complex JOIN queries, carts and wishlists are stored as single documents keyed by the `userId`. Each document contains an `items` array storing embedded product snapshots and quantities.
- **`Banners` Collection**: Stores hero carousel images and target URLs rendered dynamically on the storefront.

---

## 5. Page Directory & Responsibilities

| Page Path / Template | Route URL | Access Level | Description & Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **`views/user/home.ejs`** | `GET /` | Public | **Storefront Homepage**: Displays dynamic hero banners (`Banners`) and featured items (`Products`). Includes navigation to storefront categories. |
| **`views/user/productListing.ejs`** | `GET /products` | Public | **Product Catalog**: Renders all available products in a responsive grid. Handles category filtering and search queries. |
| **`views/user/productDetails.ejs`** | `GET /product/:id` | Public | **Single Product View**: Shows high-resolution product imagery, stock availability, full description, and AJAX buttons for Cart & Wishlist. |
| **`views/user/login.ejs`** | `GET /auth/login` | Guest (`isGuest`) | **Customer/Admin Login**: Captures `email` and `password`. Authenticates against `Users` collection. |
| **`views/user/register.ejs`** | `GET /auth/register` | Guest (`isGuest`) | **Customer Registration**: Captures personal info (`name`, `email`, `password`, `mobileNumber`, `address`) and creates a new user record. |
| **`views/user/cart.ejs`** | `GET /cart` | Authenticated | **Shopping Cart & Checkout**: Lists items inside `Carts[userId]`. Calculates item totals and shipping. Integrates COD submission and Razorpay payment triggers. |
| **`views/user/myOrders.ejs`** | `GET /my-orders` | Authenticated | **Customer Order History**: Fetches all orders belonging to `userId`, showing status, timestamp, and pricing. |
| **`views/user/404.ejs`** | Global Catch-All | Public | **Error Page**: Renders when a requested route or product ID does not exist. |
| **`views/admin/dashboard.ejs`** | `GET /admin/dashboard` | Admin (`isAdmin`) | **Admin Overview**: Shows executive summary metrics, quick navigation cards, and recent orders. |
| **`views/admin/addProduct.ejs`** | `GET /admin/add-product` | Admin (`isAdmin`) | **Product Creation Form**: Form with image file upload via Multer to add new inventory. |
| **`views/admin/manageProducts.ejs`** | `GET /admin/manage-products` | Admin (`isAdmin`) | **Inventory Table**: Tabular view of all catalog products with action buttons (`Edit` and `Delete`). |
| **`views/admin/updateProduct.ejs`** | `GET /admin/update-product/:id` | Admin (`isAdmin`) | **Product Modification Form**: Pre-populated form to update existing product attributes. |
| **`views/admin/viewOrders.ejs`** | `GET /admin/view-orders` | Admin (`isAdmin`) | **Order Management**: Global order book showing customer details, addresses, and transaction statuses. |
| **`views/admin/manageBanners.ejs`** | `GET /admin/manage-banners` | Admin (`isAdmin`) | **Banner Dashboard**: Lists active hero banners with delete controls. |
| **`views/admin/addBanner.ejs`** | `GET /admin/add-banner` | Admin (`isAdmin`) | **Banner Upload Form**: Uploads new promotional banner images and links. |
| **`views/partials/header.ejs`** | Included across User pages | Global | **Top Navigation Bar**: Renders logo, search bar, navigation links, and dynamic login/logout buttons based on `res.locals.user`. |
| **`views/partials/footer.ejs`** | Included across User pages | Global | **Footer**: Site map, copyright, and social links. |
| **`views/partials/admin-sidebar.ejs`** | Included across Admin pages | Admin | **Admin Sidebar Navigation**: Persistent side navigation across all `/admin/*` views. |

---

## 6. Guide: Splitting User and Admin Login Pages

### Current Architecture vs. Why Split
Currently, the application uses a **Unified Login Page (`/auth/login`)**. When credentials are submitted to `authController.postLogin`, the system checks `user.role === 'admin'`. If true, `req.session.isAdmin = true` is set, and the user is redirected to `/admin/dashboard`; otherwise, they are sent to `/`.

**Why Split User and Admin Login?**
1. **Security & Isolation**: Admin endpoints should not be exposed to general web traffic. Having a separate `/admin/login` URL allows administrators to implement strict access controls (such as IP whitelisting, rate-limiting, or two-factor authentication) specifically on the admin gateway without affecting regular shoppers.
2. **Custom Branding & UX**: An admin login page can feature internal branding, system status notifications, and different layout styles compared to the consumer storefront.
3. **Principle of Least Privilege**: Explicitly rejecting regular user credentials on the admin login page prevents credential stuffing attempts and logical confusion.

---

### Step-by-Step Implementation Guide

#### Step 1: Create the Dedicated Admin Login View
Create a new EJS template at `views/admin/adminLogin.ejs` with distinct administrative styling and appropriate security disclaimers:

```html
<!-- views/admin/adminLogin.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Portal Login - E-Commerce</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body class="admin-login-body">
    <div class="login-container admin-login-box">
        <h2>Admin Control Panel</h2>
        <p class="subtitle">Authorized Personnel Only</p>
        
        <% if (error) { %>
            <div class="alert alert-danger"><%= error %></div>
        <% } %>

        <form action="/admin/login" method="POST">
            <div class="form-group">
                <label for="email">Admin Email Address</label>
                <input type="email" id="email" name="email" required autocomplete="username">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-admin-primary">Access Dashboard</button>
        </form>
    </div>
</body>
</html>
```

#### Step 2: Add Controller Methods for Admin vs. User Login
Update `controllers/authController.js` (or create a dedicated `adminAuthController.js`) to strictly enforce role checks during login:

```javascript
// controllers/authController.js modifications

// 1. Customer Login Handlers (Only allow role === 'user')
const getLogin = (req, res) => {
    res.render('user/login', { error: null });
};

const postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await loginUser(email, password);
        
        // Ensure admins do not log in via customer portal (or handle gracefully)
        if (user.role === 'admin') {
            throw new Error('Admin accounts must log in via the Admin Portal (/admin/login).');
        }

        req.session.user = { id: user.userId, email: user.email, name: user.name };
        req.session.isAdmin = false;
        res.redirect('/');
    } catch (error) {
        res.render('user/login', { error: error.message });
    }
};

// 2. Dedicated Admin Login Handlers (Only allow role === 'admin')
const getAdminLogin = (req, res) => {
    if (req.session && req.session.user && req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/adminLogin', { error: null });
};

const postAdminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await loginUser(email, password);
        
        // Strictly verify that the authenticated account has admin privileges
        if (user.role !== 'admin') {
            throw new Error('Access Denied. You do not have administrative privileges.');
        }

        req.session.user = { id: user.userId, email: user.email, name: user.name };
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.render('admin/adminLogin', { error: error.message });
    }
};

module.exports = {
    getLogin,
    postLogin,
    getAdminLogin,
    postAdminLogin,
    // ... rest of exported functions
};
```

#### Step 3: Configure Separate Routes
Update the route configuration files to wire up the new endpoints:

**In `routes/authRoutes.js` (Customer Portal):**
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/authMiddleware');

router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.postLogin);
// ... register & logout routes
module.exports = router;
```

**In `routes/adminRoutes.js` (Admin Portal):**
```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public Admin Login endpoints (Before applying isAdmin middleware)
router.get('/login', authController.getAdminLogin);
router.post('/login', authController.postAdminLogin);

// Apply admin access control to all protected routes below this line
router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);
// ... existing protected admin routes
module.exports = router;
```

#### Step 4: Update Authentication Middleware Redirects
Update `middleware/authMiddleware.js` so that when an unauthenticated user attempts to access an `/admin/*` route, they are redirected specifically to `/admin/login` instead of `/auth/login`:

```javascript
// middleware/authMiddleware.js
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.isAdmin) {
        return next();
    }
    // Redirect unauthorized access directly to the new Admin Login page
    return res.redirect('/admin/login');
};

const isGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/');
    }
    return next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isGuest
};
```

---
*Generated by Antigravity AI — Comprehensive E-Commerce Architecture Analysis.*
