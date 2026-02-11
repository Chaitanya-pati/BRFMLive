from database import engine
from models import Base
import models # Ensure all models are loaded

print("Registering all models...")
# The models are imported so they should be in Base.metadata
print(f"Models in metadata: {Base.metadata.tables.keys()}")

print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
