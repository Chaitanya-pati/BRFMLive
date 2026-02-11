
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import math

def cleanup_invalid_floats():
    db = SessionLocal()
    try:
        # Fix GodownMaster
        godowns = db.query(models.GodownMaster).all()
        for godown in godowns:
            if godown.current_storage is not None:
                if math.isnan(godown.current_storage) or math.isinf(godown.current_storage):
                    print(f"Fixing godown {godown.id}: current_storage = 0.0")
                    godown.current_storage = 0.0
        
        # Fix Bins
        bins = db.query(models.Bin).all()
        for bin_obj in bins:
            if bin_obj.capacity is not None:
                if math.isnan(bin_obj.capacity) or math.isinf(bin_obj.capacity):
                    print(f"Fixing bin {bin_obj.id}: capacity = 0.0")
                    bin_obj.capacity = 0.0
            if bin_obj.current_quantity is not None:
                if math.isnan(bin_obj.current_quantity) or math.isinf(bin_obj.current_quantity):
                    print(f"Fixing bin {bin_obj.id}: current_quantity = 0.0")
                    bin_obj.current_quantity = 0.0
        
        # Fix TransferSessions
        sessions = db.query(models.TransferSession).all()
        for session in sessions:
            if session.transferred_quantity is not None:
                if math.isnan(session.transferred_quantity) or math.isinf(session.transferred_quantity):
                    print(f"Fixing transfer session {session.id}: transferred_quantity = None")
                    session.transferred_quantity = None
        
        db.commit()
        print("✅ Database cleanup completed successfully")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_invalid_floats()
