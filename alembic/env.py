import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# 1. Adiciona a raiz do projeto ao "path" para o Alembic achar a pasta 'backend'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 2. Importa as credenciais do seu banco e a Base
from backend.database import DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME, Base
# IMPORTANTE: Você deve importar os models para o Alembic enxergar as classes
import backend.models 

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 3. Informa ao Alembic quais são as tabelas (Base.metadata)
target_metadata = Base.metadata

# 4. Força o Alembic a usar o driver pymysql (síncrono) para realizar as migrações
sync_db_url = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
config.set_main_option("sqlalchemy.url", sync_db_url)

def run_migrations_offline() -> None:
    """Executa as migrações no modo 'offline'."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def process_revision_directives(context, revision, directives):
    """Verifica se há alterações reais nas tabelas antes de gerar um novo arquivo de migração."""
    if getattr(config.cmd_opts, 'autogenerate', False):
        script = directives[0]
        # Se não houver nenhuma alteração real nas tabelas, cancela a criação do arquivo
        if script.upgrade_ops.is_empty():
            directives[:] = []
            print("🔹 Nenhuma alteração no models.py detectada.")

def run_migrations_online() -> None:
    """Executa as migrações no modo 'online'."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives # <-- Regra vinculada corretamente
        )
        with context.begin_transaction():
            context.run_migrations()

# 5. Validação principal de execução (Agora as funções são apenas chamadas aqui)
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()