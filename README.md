# BulkNest Backend

Backend server for **BulkNest**, a B2B wholesale marketplace designed to simplify and streamline bulk purchasing. It handles authentication, product and order management, and secure API operations.



## 🚀 Tech Stack

- **Express.js** – Web framework for Node.js
- **MongoDB** – NoSQL database
- **Firebase Admin SDK** – Firebase backend services
- **JWT** – Token-based authentication with `jsonwebtoken`
- **dotenv** – Environment variable management
- **CORS** – Cross-origin request handling
- **cookie-parser** – Cookie parsing middleware



## 🔐 Key Features

- Secure RESTful APIs for product and order management
- JWT authentication integrated with Firebase
- Protected routes and email-based authorization
- Dynamic quantity control on order placement
- Environment-based configuration using `.env`
- Scalable MongoDB integration with clean data structure



## 🔥 API Endpoints

### 🛒 Products

| Method | Endpoint                     | Description                                                |
|--------|------------------------------|------------------------------------------------------------|
| GET    | `/products/:email`           | Get all products (filter with `available=true` query)      |
| GET    | `/categories/:category`      | Get products by category                                   |
| GET    | `/product/:id`               | Get a single product by ID                                 |
| GET    | `/myProducts/:email`         | Get products added by a specific user                      |
| POST   | `/products/:email`           | Add a new product                                          |
| PATCH  | `/product/:id`               | Update a product                                           |

### 📦 Orders

| Method | Endpoint             | Description                                                 |
|--------|----------------------|-------------------------------------------------------------|
| GET    | `/orders/:email`     | Get all orders placed by a user (includes product details) |
| POST   | `/orders/:email`     | Place an order (validates quantity & availability)         |
| DELETE | `/orders/:id`        | Cancel or delete an order                                  |



## 📦 NPM Packages Used

`express`, `mongodb`, `firebase-admin`, `jsonwebtoken`, `cors`, `cookie-parser`, `dotenv`



## 🌐 Live Frontend & Client Repository

 🔗 [BulkNEST Live](https://bulknest.web.app/)  
 📂 [Client Repository (GitHub)](https://github.com/wdNaimur/bulknest-client)



<p align="center"><sub><strong>Designed & Developed by Md. Naimur Rahman</strong></sub></p>
