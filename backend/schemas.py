# Validação de Dados de Entrada e Saída

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

# --- USUÁRIO --- (Já existente)
class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(..., min_length=8)

class UsuarioResponse(BaseModel):
    id_usuario: int
    nome: str
    email: EmailStr
    tipo_usuario: str
    status: str
    criado_em: datetime
    model_config = ConfigDict(from_attributes=True)

# --- PERFIL ---
class PerfilCreate(BaseModel):
    id_usuario: int
    apelido: Optional[str] = None
    biografia: Optional[str] = None

class PerfilResponse(BaseModel):
    id_perfil: int
    id_usuario: int
    apelido: Optional[str]
    biografia: Optional[str]
    nivel: int
    pontos: int
    experiencia: int
    model_config = ConfigDict(from_attributes=True)

# --- DISCIPLINA ---
class DisciplinaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    icone: Optional[str] = None

class DisciplinaResponse(BaseModel):
    id_disciplina: int
    nome: str
    descricao: Optional[str]
    icone: Optional[str]
    status: str
    model_config = ConfigDict(from_attributes=True)

# --- PROGRESSO ---
class ProgressoCreate(BaseModel):
    id_usuario: int
    id_disciplina: int
    pontos_adicionais: int

class ProgressoResponse(BaseModel):
    id_progresso: int
    id_usuario: int
    id_disciplina: int
    nivel_atual: int
    pontos: int
    percentual: Decimal
    atividades_concluidas: int
    ultima_atividade: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)

# --- RANKING ---
class RankingResponse(BaseModel):
    id_ranking: int
    id_usuario: int
    pontos: int
    nivel: int
    posicao: Optional[int]
    atualizado_em: datetime
    model_config = ConfigDict(from_attributes=True)

# --- CONQUISTA ---
class ConquistaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    icone: Optional[str] = None
    pontos: int
    criterio: Optional[str] = None

class ConquistaResponse(BaseModel):
    id_conquista: int
    nome: str
    descricao: Optional[str]
    icone: Optional[str]
    pontos: int
    criterio: Optional[str]
    model_config = ConfigDict(from_attributes=True)

    # Permite que o Pydantic leia dados diretamente dos modelos SQLAlchemy
    model_config = ConfigDict(from_attributes=True)