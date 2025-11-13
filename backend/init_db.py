import os
from database import Base, engine
from models import *

# Create all tables
Base.metadata.create_all(bind=engine)
print("All tables created successfully!")
