"""
Check EOPA numbers in database
"""
import sys
sys.path.insert(0, 'C:\\Ratish\\Pawan\\backend')

from app.database.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

result = db.execute(text('SELECT id, eopa_number, pi_id FROM eopa'))
rows = result.fetchall()

print('\nDatabase EOPA records:')
print('-' * 50)
for row in rows:
    print(f'  ID: {row.id}, Number: "{row.eopa_number}", PI_ID: {row.pi_id}')

db.close()
