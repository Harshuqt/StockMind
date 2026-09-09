# StockMind 📦🤖

StockMind is a modern, AI-powered inventory and supply chain management platform designed for small-to-medium businesses. It bridges the gap between traditional warehouse ledgers and modern predictive analytics, ensuring you never run out of your best-selling products.

## 🏗️ Architecture

The application follows a standard modern web architecture without unnecessary complexity:

```mermaid
flowchart TD
    User([User / Browser])
    
    subgraph Frontend
        React[React SPA\nVite + Tailwind]
    end
    
    subgraph Backend
        FastAPI[FastAPI\nREST API]
    end
    
    subgraph Storage & Services
        Postgres[(PostgreSQL\nstockmind_db)]
        Gemini[Google Gemini API]
    end
    
    User -->|HTTP/JSON| React
    React -->|REST Calls| FastAPI
    FastAPI -->|asyncpg / SQLAlchemy| Postgres
    FastAPI -->|gRPC / REST| Gemini
```
*(Note: Redis is completely unused by the application and has been removed from the environment configuration to simplify deployments).*

## ✨ Features

- **Full-Stack SaaS Architecture:** Built with React, FastAPI, and PostgreSQL. Features multi-tenant organization boundaries securely separating data.
- **Dynamic Dashboard:** Live metrics, low-stock alerts, and recent transaction monitoring.
- **Inventory Ledger:** Immutable transaction logs (`InventoryTransaction`) tracking every stock movement (`STOCK_IN`, `STOCK_OUT`, `SET`).
- **Purchase & Sales Orders:** Manage inbound stock from suppliers and outbound shipments to customers. Includes an interactive "Auto-Receive" PO simulator.
- **Gemini AI Assistant:** Connects directly to Google's Gemini LLM to analyze your catalog, identify low-stock risks, and autonomously draft multi-product Purchase Orders.

### 🤖 How the Gemini AI Assistant Works

The AI functionality in StockMind evaluates your live inventory and historical data to prevent stockouts:
* **Catalog & Inventory Analysis:** Gemini reads your entire product catalog (current stock, reorder points, sales volume) to understand your business health.
* **Low-Stock Risk Identification:** It identifies items that are approaching or below their reorder thresholds.
* **Purchase-Order Drafting:** It intelligently groups needed items by supplier, calculates optimal reorder quantities, and generates draft Purchase Orders.
* **User Review:** The AI does *not* automatically submit orders. All AI-generated drafts are presented for human review and approval before they are officially created in the system.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (3.10+)
- PostgreSQL (running locally or via Docker)

### 1. Infrastructure Setup (Docker Method - Recommended)
The easiest way to get PostgreSQL running is by using Docker Compose.

Make sure Docker is installed and running, then from the root directory run:
```bash
docker-compose up -d
```
*This will automatically spin up PostgreSQL in the background with the correct credentials (user: `stockmind`, password: `stockmindpassword`) and database name (`stockmind_db`) expected by the backend.*

If you prefer not to use Docker, you must manually install PostgreSQL and set up the database and user. Open your PostgreSQL terminal (`psql`) and run:
```sql
CREATE DATABASE stockmind_db;
CREATE USER stockmind WITH ENCRYPTED PASSWORD 'stockmindpassword';
GRANT ALL PRIVILEGES ON DATABASE stockmind_db TO stockmind;
\c stockmind_db
GRANT ALL ON SCHEMA public TO stockmind;
```
*(If you choose a different username, password, or database name, be sure to update the `DATABASE_URL` in your `.env` file!)*

### 2. Environment Setup

Before starting the application, you need to configure your environment variables.

Navigate to the `backend` directory and create your environment file:
```bash
cd backend
cp .env.example .env
```

**Important:** Open the newly created `backend/.env` file and configure:
- `GEMINI_API_KEY`: Provide a valid Google Gemini API key here for AI features.
- `SECRET_KEY`: Used for JWT authentication.
- `CORS_ORIGINS`: If running remotely (e.g. on EC2), add your public IP (e.g., `CORS_ORIGINS=http://<YOUR_IP>:5173,http://localhost:5173`).

### 3. Running the Application (Docker Compose - Recommended)

The entire StockMind stack (PostgreSQL, Backend API, and Frontend Vite server) is fully containerized. To spin everything up automatically in the background:

```bash
# Return to the root directory
cd ..

# If running on a remote server like EC2, export your public IP for the frontend to use:
# export VITE_API_URL="http://<YOUR_EC2_IP>:8000/api/v1"

# Build and start all services
docker-compose up --build -d
```

That's it! The services will be available at:
- **Web App (Frontend):** [http://localhost:5173](http://localhost:5173) (or your EC2 IP)
- **FastAPI Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs) (or your EC2 IP)

To view the live logs of your application:
```bash
docker-compose logs -f
```

### 4. Running Tests
To run the backend test suite, you can execute `pytest` directly inside your running backend container:
```bash
docker-compose exec backend pytest
```

---

## 📝 Recent Technical Updates & Database Changes

Over the course of the latest development iterations, the following major changes were implemented:

1. **Inventory "Exact Set" Logic (`backend/app/api/v1/endpoints/inventory.py`)**
   - **Change:** Expanded the `InventoryAdjustmentRequest` schema to include `new_quantity`.
   - **Reasoning:** Previously, the `adjust_inventory` endpoint only supported additive math (`quantity_changed`). It was updated to handle `transaction_type = 'SET'`, allowing the backend to calculate the delta (`new_quantity - current_stock`) and inject the exact adjustment required. This ensures the immutable ledger remains mathematically sound without requiring a schema migration.

2. **Purchase Order Deletion Logic (`backend/app/api/v1/endpoints/purchase_orders.py`)**
   - **Change:** Removed the `po.status == "Received"` block constraint.
   - **Reasoning:** Allows users to forcibly delete test POs that had already completed their delivery cycle to keep their testing workspaces clean. 

3. **React State Batching Fixes (`frontend/src/components/modals/*`)**
   - **Change:** Fixed closure traps inside `CreatePOModal.tsx` and `CreateSalesOrderModal.tsx`.
   - **Reasoning:** Previously, updating multiple fields of an array item (like `product_id` and `unit_price`) simultaneously using multiple `setItems([...items])` calls caused state overwrites. Logic was combined into a single batched state update.

4. **Default Warehouse Prioritization**
   - **Change:** Added hooks to dynamically prioritize selecting "Main Warehouse" across all dropdowns (Adjust Stock, PO Receive, Sales Orders) automatically reducing user click fatigue.

## 📄 License
This project is for demonstration and portfolio purposes.
