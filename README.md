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

### 2. Backend Setup (Docker Method - Recommended)

For modern Linux distributions (like Ubuntu 26.04) or any environment where Python 3.10 isn't the default, running the backend in Docker is highly recommended to avoid dependency compilation errors.

Navigate to the `backend` directory and create your environment file:
```bash
cd backend
cp .env.example .env
```

**Important:** Open the newly created `.env` file and configure:
- `DATABASE_URL`: Ensure this matches the Docker Compose setup (`postgresql+asyncpg://stockmind:stockmindpassword@localhost:5432/stockmind_db`).
- `GEMINI_API_KEY`: Provide a valid Google Gemini API key here for AI features.
- `SECRET_KEY`: Used for JWT authentication.
- `CORS_ORIGINS`: If running remotely (e.g. on EC2), add your public IP (e.g., `CORS_ORIGINS=http://<YOUR_IP>:5173,http://localhost:5173`).

**Run the backend container:**
```bash
docker run -d \
  --name stockmind-backend \
  --network host \
  -v $(pwd):/app \
  -w /app \
  python:3.10-slim \
  bash -c "pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
```
*(This command mounts your local code into the container, installs requirements, runs database migrations, and boots the API on port 8000).*

### 3. Frontend Setup
Navigate to the `frontend` directory and install dependencies. Note: If you encounter permission issues later, avoid using `sudo` here.
```bash
cd frontend
npm install
```

### 4. Running the Application

To run the application locally or on a remote server, start your containers and frontend.

**Step 1: Ensure Backend & DB are running**
```bash
docker start stockmind-db-1
docker start stockmind-backend
```

**Step 2: Start the Frontend**
```bash
cd frontend
# If running remotely, export your API URL before starting:
# export VITE_API_URL="http://<YOUR_EC2_IP>:8000/api/v1"
npm run dev -- --host 0.0.0.0
```
*(Tip: To run the frontend in the background on a server, use `nohup npm run dev -- --host 0.0.0.0 > dev.log 2>&1 &`)*

### 5. Running Tests
To run the backend test suite, make sure you are in the `backend` directory with your virtual environment activated, then run:
```bash
pytest
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
