import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.db.session import engine
from app.models.user import User
from app.models.membership import OrganizationMember
from app.models.product import Product
from app.models.supplier import Supplier

async def seed_data():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # Get the user
        result = await db.execute(select(User).where(User.email == 'test2@test.com'))
        user = result.scalar_one_or_none()
        if not user:
            print("User not found")
            return
            
        # Get org
        mem_res = await db.execute(select(OrganizationMember).where(OrganizationMember.user_id == user.id))
        member = mem_res.scalar_one_or_none()
        org_id = member.organization_id
        
        # Create a supplier
        sup = Supplier(
            organization_id=org_id,
            company_name="Acme Corp",
            contact_name="Wile E. Coyote",
            email="supplies@acme.com",
            phone="555-0199"
        )
        db.add(sup)
        
        # Create a product with low stock
        prod = Product(
            organization_id=org_id,
            name="Anvil (Heavy Duty)",
            sku="ACME-ANV-001",
            description="A very heavy anvil",
            cost_price=150.00,
            selling_price=250.00,
            current_stock=2,
            reorder_point=10
        )
        db.add(prod)
        
        # Another product with low stock
        prod2 = Product(
            organization_id=org_id,
            name="Giant Rubber Band",
            sku="ACME-RB-999",
            description="Extremely stretchy",
            cost_price=5.00,
            selling_price=15.00,
            current_stock=0,
            reorder_point=50
        )
        db.add(prod2)
        
        await db.commit()
        print("Successfully seeded dummy data!")

if __name__ == "__main__":
    asyncio.run(seed_data())
