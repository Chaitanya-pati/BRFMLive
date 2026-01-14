from database import engine, SessionLocal
from models import Base, Bin
import models

def fix():
    print("Registering models and creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if we have any 12h bins
        bins = db.query(Bin).filter(Bin.bin_type == '12 hours bin').all()
        if not bins:
            print("Seeding default 12h bins...")
            b1 = Bin(bin_number='BIN-12H-01', capacity=1000, current_quantity=0, bin_type='12 hours bin', status='Active')
            b2 = Bin(bin_number='BIN-12H-02', capacity=1000, current_quantity=0, bin_type='12 hours bin', status='Active')
            db.add(b1)
            db.add(b2)
            db.commit()
            print("Seeded.")
        else:
            print(f"Found {len(bins)} existing 12h bins.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix()
