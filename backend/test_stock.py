import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import sys

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost/stockmind")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT id, name, current_stock FROM products LIMIT 1;"))
        row = result.fetchone()
        if not row:
            print("No products")
            return
            
        print(f"Product {row.name} (id {row.id}) has stock {row.current_stock}")
        
if __name__ == "__main__":
    asyncio.run(main())
