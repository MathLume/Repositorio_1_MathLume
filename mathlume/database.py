# Conexão com o Banco

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Conexão direta com o banco MATHLUME_INT
DATABASE_URL = "mysql+aiomysql://root:mathlume@localhost:3306/MATHLUME_INT"

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session