# Validação de Dados de Entrada e Saída

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# O que a API espera receber do Frontend (POST)
class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(..., min_length=8, description="A senha deve ter no mínimo 8 caracteres")

# O que a API devolve para o Frontend (Sem a senha e usando id_usuario)
class UsuarioResponse(BaseModel):
    id_usuario: int
    nome: str
    email: EmailStr
    tipo_usuario: str
    status: str
    criado_em: datetime

    class Config:
        from_attributes = True