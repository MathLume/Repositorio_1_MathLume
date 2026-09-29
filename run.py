import os
import sys
import subprocess

# 1. VERIFICAÇÃO DE PACOTES ANTES DE TUDO
def verificar_e_instalar_pacotes():
    print("📦 Verificando pacotes do sistema...")
    req_file = "requirements.txt"
    
    if os.path.exists(req_file):
        try:
            # O sys.executable garante que o pip rode dentro do ambiente virtual correto
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "-r", req_file],
                stdout=subprocess.DEVNULL, # Oculta o texto enorme de instalação do pip
                stderr=subprocess.STDOUT
            )
            print("✅ Todas as bibliotecas estão prontas.")
        except subprocess.CalledProcessError:
            print("❌ Erro ao instalar dependências. Tente rodar 'pip install -r requirements.txt' manualmente.")
            sys.exit(1)
    else:
        print("⚠️ Arquivo requirements.txt não encontrado. Verificação pulada.")

# Executa a instalação antes de carregar o resto do código
verificar_e_instalar_pacotes()

# ---------------------------------------------------------
# 2. IMPORTAÇÕES E LÓGICA DO SERVIDOR (Agora que tudo está instalado)
# ---------------------------------------------------------
import uvicorn
from backend.database import criar_banco_se_nao_existir
from alembic.config import Config
from alembic import command

def automatizar_banco_de_dados():
    criar_banco_se_nao_existir()
    
    alembic_cfg = Config("alembic.ini")
    
    # 1. PRIMEIRO: Sincroniza o banco com as migrações já existentes
    print("  Aplicando migrações pendentes no MySQL...")
    command.upgrade(alembic_cfg, "head")
    
    # 2. SEGUNDO: Analisa o models.py e gera uma nova migração se houver mudanças
    print("  Analisando models.py em busca de novas tabelas ou colunas...")
    command.revision(alembic_cfg, autogenerate=True, message="Atualizacao_Automatica")
    
    # 3. TERCEIRO: Aplica a nova migração que acabou de ser gerada no passo anterior
    print("  Sincronizando estrutura atualizada com o MySQL...")
    command.upgrade(alembic_cfg, "head")
    
    print("  Banco de dados pronto!")

if __name__ == "__main__":
    print("\n🚀 Iniciando rotinas do MathLume...")
    
    automatizar_banco_de_dados()
    
    print("\n🚀 Iniciando o servidor web...")
    print("🌐 Acesse no navegador: http://127.0.0.1:8000")
    
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)