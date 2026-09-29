from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    foto_perfil = Column(String(255), nullable=True)
    tipo_usuario = Column(String(20), default="ALUNO", nullable=False)
    status = Column(String(20), default="ATIVO", nullable=False)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())
    ultimo_login = Column(DateTime, nullable=True)

    # Relacionamentos 1 para 1
    credencial = relationship("Credencial", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    conta_google = relationship("ContaGoogle", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    perfil = relationship("Perfil", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    ranking = relationship("Ranking", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    
    # Relacionamentos 1 para N
    sessoes = relationship("Sessao", back_populates="usuario", cascade="all, delete-orphan")
    recuperacoes_senha = relationship("RecuperacaoSenha", back_populates="usuario", cascade="all, delete-orphan")
    progressos = relationship("Progresso", back_populates="usuario", cascade="all, delete-orphan")
    
    # Relacionamento N para N (associação explícita)
    conquistas_usuario = relationship("UsuarioConquista", back_populates="usuario", cascade="all, delete-orphan")


class Credencial(Base):
    __tablename__ = "credencial"

    id_credencial = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())
    senha_alterada_em = Column(DateTime, nullable=True)

    usuario = relationship("Usuario", back_populates="credencial")


class ContaGoogle(Base):
    __tablename__ = "conta_google"

    id_conta_google = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), unique=True, nullable=False)
    google_sub = Column(String(255), unique=True, nullable=False)
    email_google = Column(String(150), nullable=True)
    email_verificado = Column(Boolean, default=False, nullable=False)
    nome_google = Column(String(150), nullable=True)
    foto_google = Column(String(255), nullable=True)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)
    ultimo_login = Column(DateTime, nullable=True)

    usuario = relationship("Usuario", back_populates="conta_google")


class Sessao(Base):
    __tablename__ = "sessao"

    id_sessao = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), nullable=False)
    token_sessao = Column(String(255), unique=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)
    expira_em = Column(DateTime, nullable=False)
    encerrado_em = Column(DateTime, nullable=True)
    status = Column(String(20), default="ATIVA", nullable=False)

    usuario = relationship("Usuario", back_populates="sessoes")


class RecuperacaoSenha(Base):
    __tablename__ = "recuperacao_senha"

    id_recuperacao = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    criado_em = Column(DateTime, server_default=func.now(), nullable=False)
    expira_em = Column(DateTime, nullable=False)
    utilizado_em = Column(DateTime, nullable=True)
    status = Column(String(20), default="PENDENTE", nullable=False)

    usuario = relationship("Usuario", back_populates="recuperacoes_senha")


class Perfil(Base):
    __tablename__ = "perfil"

    id_perfil = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), unique=True, nullable=False)
    apelido = Column(String(50), nullable=True)
    biografia = Column(String(255), nullable=True)
    nivel = Column(Integer, default=1, nullable=False)
    pontos = Column(Integer, default=0, nullable=False)
    experiencia = Column(Integer, default=0, nullable=False)

    usuario = relationship("Usuario", back_populates="perfil")


class Disciplina(Base):
    __tablename__ = "disciplina"

    id_disciplina = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), unique=True, nullable=False)
    descricao = Column(Text, nullable=True)
    icone = Column(String(255), nullable=True)
    status = Column(String(20), default="ATIVA", nullable=False)

    progressos = relationship("Progresso", back_populates="disciplina", cascade="all, delete-orphan")


class Progresso(Base):
    __tablename__ = "progresso"

    id_progresso = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), nullable=False)
    id_disciplina = Column(Integer, ForeignKey("disciplina.id_disciplina", ondelete="CASCADE"), nullable=False)
    nivel_atual = Column(Integer, default=1, nullable=False)
    pontos = Column(Integer, default=0, nullable=False)
    percentual = Column(Numeric(5, 2), default=0.00, nullable=False)
    atividades_concluidas = Column(Integer, default=0, nullable=False)
    ultima_atividade = Column(DateTime, nullable=True)

    __table_args__ = (UniqueConstraint("id_usuario", "id_disciplina", name="uq_progresso_usuario_disciplina"),)

    usuario = relationship("Usuario", back_populates="progressos")
    disciplina = relationship("Disciplina", back_populates="progressos")


class Ranking(Base):
    __tablename__ = "ranking"

    id_ranking = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), unique=True, nullable=False)
    pontos = Column(Integer, default=0, nullable=False)
    nivel = Column(Integer, default=1, nullable=False)
    posicao = Column(Integer, nullable=True)
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="ranking")


class Conquista(Base):
    __tablename__ = "conquista"

    id_conquista = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(String(255), nullable=True)
    icone = Column(String(255), nullable=True)
    pontos = Column(Integer, default=0, nullable=False)
    criterio = Column(String(255), nullable=True)

    usuarios_conquista = relationship("UsuarioConquista", back_populates="conquista", cascade="all, delete-orphan")


class UsuarioConquista(Base):
    __tablename__ = "usuario_conquista"

    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario", ondelete="CASCADE"), primary_key=True, nullable=False)
    id_conquista = Column(Integer, ForeignKey("conquista.id_conquista", ondelete="CASCADE"), primary_key=True, nullable=False)
    conquistada_em = Column(DateTime, server_default=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="conquistas_usuario")
    conquista = relationship("Conquista", back_populates="usuarios_conquista")