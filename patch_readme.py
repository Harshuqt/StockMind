import re

with open("README.md", "r") as f:
    content = f.read()

docker_backend_text = """### 2. Backend Setup

**For production servers or modern Linux distributions (like Ubuntu 26.04) that ship with Python 3.14+ natively, it is highly recommended to run the backend in a Python 3.10 Docker container** to avoid multi-hour compilation times for dependencies like `grpcio`.

**Docker Method (Recommended for EC2 / Modern Linux):**
```bash
cd backend
# Create your .env file
cp .env.example .env

# Run the backend in a container mapped to the host network
docker run -d \\
  --name stockmind-backend \\
  --network host \\
  -v $(pwd):/app \\
  -w /app \\
  python:3.10-slim \\
  bash -c "pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
```

**Local/Native Method (For Python 3.10 - 3.12 environments):**
Navigate to the `backend` directory, create a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```"""

content = re.sub(r"### 2\. Backend Setup.*?```bash\ncd backend\npython -m venv venv\nsource venv/bin/activate.*?pip install -r requirements\.txt\n```", docker_backend_text, content, flags=re.DOTALL)

with open("README.md", "w") as f:
    f.write(content)
