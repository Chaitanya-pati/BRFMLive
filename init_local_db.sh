
#!/bin/bash

echo "Initializing local PostgreSQL database..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
sleep 5

# Run Alembic migrations
echo "Running database migrations..."
cd backend
uv run alembic upgrade head

echo "Database initialized successfully!"
echo "You can now run the application."
