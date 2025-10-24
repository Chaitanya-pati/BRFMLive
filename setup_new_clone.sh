
#!/bin/bash

echo "=================================================="
echo "🚀 Gate Entry & Lab Testing - Automated Setup"
echo "=================================================="

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to start..."
sleep 5

# Check if PostgreSQL is running
if ! pg_isready -q; then
  echo "❌ PostgreSQL is not running. Please wait and try again."
  exit 1
fi

echo "✅ PostgreSQL is ready"

# Create uploads directory
echo ""
echo "📁 Creating uploads directory..."
mkdir -p backend/uploads
echo "✅ Uploads directory created"

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
cd backend
uv run alembic upgrade head

if [ $? -ne 0 ]; then
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi

echo "✅ Database migrations completed"

# Ask about sample data
echo ""
echo "=================================================="
read -p "Do you want to seed sample data? (y/n): " -n 1 -r
echo ""
echo "=================================================="

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "🌱 Seeding sample data..."
  uv run python seed_data.py
  echo "✅ Sample data seeded"
fi

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Click the 'Run' button to start the application"
echo "2. Frontend will be available at your Repl URL"
echo "3. Backend API docs at: https://[your-repl]:8000/docs"
echo ""
echo "Happy coding! 🎉"
