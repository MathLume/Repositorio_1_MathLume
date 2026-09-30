import os
import sys
import subprocess

# 1. VERIFICAÇÃO DE PACOTES ANTES DE TUDO
def verificar_e_instalar_pacotes():
    print("📦 Verificando pacotes do sistema...")
    
    # Descobre a pasta exata onde este arquivo (run.py) está
    diretorio_atual = os.path.dirname(os.path.abspath(__file__))
    # Junta o caminho da pasta com o nome do arquivo
    req_file = os.path.join(diretorio_atual, "requirements.txt")
    
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
        print(f"⚠️ Arquivo requirements.txt não encontrado no caminho: {req_file}. Verificação pulada.")

# Executa a instalação antes de carregar o resto do código
verificar_e_instalar_pacotes()

# ---------------------------------------------------------
# 2. IMPORTAÇÕES E LÓGICA DO SERVIDOR (Agora que tudo está instalado)
# ---------------------------------------------------------
import uvicorn
import psutil
from alembic.config import Config
from alembic import command
from alembic.util.exc import CommandError
from sqlalchemy import create_engine, text
from backend.database import criar_banco_se_nao_existir, DATABASE_URL

def liberar_porta(porta):
    """Verifica e encerra qualquer processo que esteja travando a porta do servidor."""
    print(f"🧹 Verificando processos travados na porta {porta}...")
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections(kind='inet'):
                if conn.laddr.port == porta:
                    print(f"⚠️ Processo fantasma encontrado (PID: {proc.pid}). Derrubando...")
                    proc.kill()
                    proc.wait() # Aguarda o processo morrer completamente
                    print("✅ Porta liberada com sucesso!")
                    return
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            # Ignora processos do sistema que não temos permissão para ler
            continue
    print("✅ Nenhuma porta presa.")

def automatizar_banco_de_dados():
    criar_banco_se_nao_existir()
    
    alembic_cfg = Config("alembic.ini")
    
    # 1. PRIMEIRO: Tenta sincronizar. Se achar a versão fantasma, corrige sozinho!
    print("  Aplicando migrações pendentes no MySQL...")
    try:
        command.upgrade(alembic_cfg, "head")
    except CommandError as erro:
        # Se o erro for o da revisão fantasma (Can't locate revision...)
        if "Can't locate revision" in str(erro):
            print("⚠️ Histórico do banco corrompido detectado! Limpando tabela alembic_version automaticamente...")
            
            # Converte a URL assíncrona (aiomysql) para síncrona (pymysql) para rodar a limpeza rapidamente
            url_sincrona = str(DATABASE_URL).replace("aiomysql", "pymysql")
            engine_limpeza = create_engine(url_sincrona)
            
            # Conecta, apaga a tabela problemática e salva a alteração
            with engine_limpeza.connect() as conn:
                conn.execute(text("DROP TABLE IF EXISTS alembic_version;"))
                conn.commit() 
                
            print("✅ Histórico limpo com sucesso! Tentando migrar novamente...")
            
            # Tenta rodar a atualização de novo agora que o caminho está livre
            command.upgrade(alembic_cfg, "head")
        else:
            # Se for algum outro erro desconhecido, ele para e avisa você
            raise erro
    
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
    
    # Limpa a porta caso haja algum processo preso de execuções anteriores
    liberar_porta(8000)
    
    print("\n🚀 Iniciando o servidor web...")
    print("🌐 Acesse no navegador: http://127.0.0.1:8000")
    
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
