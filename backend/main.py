#Endpoints de Cadastro e Listagem
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import bcrypt
import os

# Atualização dos endereços do backend
from backend import models
from backend import schemas
from backend.database import get_db




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


# --- ROTAS DE PERFIL ---
@app.post("/perfis", response_model=schemas.PerfilResponse, status_code=status.HTTP_201_CREATED)
async def create_perfil(perfil: schemas.PerfilCreate, db: AsyncSession = Depends(get_db)):
    novo_perfil = models.Perfil(**perfil.model_dump())
    db.add(novo_perfil)
    try:
        await db.commit()
        await db.refresh(novo_perfil)
        return novo_perfil
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Perfil já existe para este usuário ou usuário inexistente.")

@app.get("/perfis/{id_usuario}", response_model=schemas.PerfilResponse)
async def get_perfil(id_usuario: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Perfil).filter(models.Perfil.id_usuario == id_usuario))
    perfil = result.scalars().first()
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil não encontrado.")
    return perfil

# --- ROTAS DE DISCIPLINA ---
@app.post("/disciplinas", response_model=schemas.DisciplinaResponse, status_code=status.HTTP_201_CREATED)
async def create_disciplina(disciplina: schemas.DisciplinaCreate, db: AsyncSession = Depends(get_db)):
    nova_disciplina = models.Disciplina(**disciplina.model_dump())
    db.add(nova_disciplina)
    await db.commit()
    await db.refresh(nova_disciplina)
    return nova_disciplina

@app.get("/disciplinas", response_model=list[schemas.DisciplinaResponse])
async def list_disciplinas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Disciplina))
    return result.scalars().all()

# --- ROTAS DE PROGRESSO (Lógica do Jogo) ---
@app.post("/progressos", response_model=schemas.ProgressoResponse)
async def registrar_progresso(progresso: schemas.ProgressoCreate, db: AsyncSession = Depends(get_db)):
    # Verifica se já existe progresso para o usuário nesta disciplina
    result = await db.execute(
        select(models.Progresso).filter_by(id_usuario=progresso.id_usuario, id_disciplina=progresso.id_disciplina)
    )
    progresso_atual = result.scalars().first()

    if progresso_atual:
        # Atualiza a pontuação existente (Ex: Final da partida do minigame)
        progresso_atual.pontos += progresso.pontos_adicionais
        progresso_atual.atividades_concluidas += 1
        progresso_atual.ultima_atividade = func.now()
        await db.commit()
        await db.refresh(progresso_atual)
        return progresso_atual
    else:
        # Cria o primeiro registro de progresso
        novo_progresso = models.Progresso(
            id_usuario=progresso.id_usuario,
            id_disciplina=progresso.id_disciplina,
            pontos=progresso.pontos_adicionais,
            atividades_concluidas=1
        )
        db.add(novo_progresso)
        await db.commit()
        await db.refresh(novo_progresso)
        return novo_progresso

@app.get("/progressos/{id_usuario}", response_model=list[schemas.ProgressoResponse])
async def get_progresso_usuario(id_usuario: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Progresso).filter(models.Progresso.id_usuario == id_usuario))
    return result.scalars().all()

# --- ROTAS DE CONQUISTAS ---
@app.post("/conquistas", response_model=schemas.ConquistaResponse, status_code=status.HTTP_201_CREATED)
async def create_conquista(conquista: schemas.ConquistaCreate, db: AsyncSession = Depends(get_db)):
    nova_conquista = models.Conquista(**conquista.model_dump())
    db.add(nova_conquista)
    await db.commit()
    await db.refresh(nova_conquista)
    return nova_conquista

@app.get("/conquistas", response_model=list[schemas.ConquistaResponse])
async def list_conquistas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Conquista))
    return result.scalars().all()



# Caminho absoluto para a pasta frontend (volta uma pasta e entra em 'frontend')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Monta o site HTML na rota principal ("/")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")