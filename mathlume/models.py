# Entidade do Banco de Dados

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Usuario(Base):
    __tablename__ = "USUARIO"

    id_usuario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    tipo_usuario = Column(String(20), default="ALUNO", nullable=False)
    status = Column(String(20), default="ATIVO", nullable=False)
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())
    ultimo_login = Column(DateTime, nullable=True)

    # Relacionamento com a Credencial
    credencial = relationship("Credencial", back_populates="usuario", uselist=False)

class Credencial(Base):
    __tablename__ = "CREDENCIAL"

    id_credencial = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("USUARIO.id_usuario", ondelete="CASCADE"), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())
    senha_alterada_em = Column(DateTime, nullable=True)

    usuario = relationship("Usuario", back_populates="credencial")