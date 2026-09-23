#Endpoints de Cadastro e Listagem

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


import bcrypt
import models
import schemas
from database import get_db




app = FastAPI(title="API MathLume")

# Configuração de Criptografia de Senha


@app.post("/users", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: schemas.UsuarioCreate, db: AsyncSession = Depends(get_db)):
    
    # 1. Valida se o e-mail já existe na tabela USUARIO
    result = await db.execute(select(models.Usuario).filter(models.Usuario.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="E-mail já está em uso.")
    
    # 2. Prepara o Usuário
    novo_usuario = models.Usuario(
        nome=user.nome,
        email=user.email
        # tipo_usuario e status já pegam o DEFAULT do banco de dados ('ALUNO', 'ATIVO')
    )
    
    db.add(novo_usuario)
    # db.flush() envia para o MySQL para gerar o id_usuario, mas não salva permanentemente ainda.
    await db.flush() 
    
    # 3. Prepara a Credencial (usando o id_usuario recém gerado)

    def get_password_hash(password: str) -> str:
        # Transforma a senha em bytes, gera o salt e cria o hash
        pwd_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(pwd_bytes, salt)
        
        # Retorna como string normal para salvar no banco de dados
        return hashed_password.decode('utf-8')


    nova_credencial = models.Credencial(
        id_usuario=novo_usuario.id_usuario,
        senha_hash=get_password_hash(user.senha)
    )
    
    db.add(nova_credencial)
    
    # 4. Comita (salva) as duas tabelas de uma vez com segurança
    await db.commit()
    await db.refresh(novo_usuario)
    
    return novo_usuario


@app.get("/users", response_model=list[schemas.UsuarioResponse])
async def list_users(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    # Retorna usuários com paginação (ex: /users?skip=0&limit=10)
    result = await db.execute(select(models.Usuario).offset(skip).limit(limit))
    return result.scalars().all()