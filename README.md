# 🚀 MathLume - Aventura Matemática

O **MathLume** é uma aplicação web interativa que combina minigames matemáticos e progressão de aprendizado. O backend é construído com FastAPI, SQLAlchemy (assíncrono) e Alembic para migrações, enquanto o frontend é servido estaticamente via HTML5, Tailwind CSS e JavaScript nativo.

---

## 📋 Pré-requisitos & Programas Externos

Antes de iniciar, instale os seguintes programas na sua máquina:

1. **Python (versão 3.10 ou superior)**
   - [Download oficial do Python](https://www.python.org/downloads/)
   - *Atenção (Windows):* Durante a instalação, marque a caixa **"Add Python to PATH"**.
2. **Git**
   - [Download oficial do Git](https://git-scm.com/)
3. **Servidor MySQL Server (versão 8.0+)**
   - Opção 1: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
   - Opção 2: Servidores locais como **XAMPP** ou **WampServer** (iniciando o serviço MySQL).
   - Opção 3: Via Docker (comando de exemplo abaixo):
     ```bash
     docker run --name mathlume-mysql -e MYSQL_ROOT_PASSWORD=mathlume -p 3306:3306 -d mysql:8.0
     ```

---

## ⚙️ Configuração do Banco de Dados

Por padrão, a conexão está definida em `backend/database.py` e `alembic/env.py` com as credenciais:

| Parâmetro | Valor Padrão |
| :--- | :--- |
| **Host** | `localhost` |
| **Porta** | `3306` |
| **Usuário** | `root` |
| **Senha** | `mathlume` |
| **Banco de Dados** | `MATHLUME_INT` |

> **Nota:** Não é preciso criar a base de dados manualmente no MySQL. A rotina do script inicial (`run.py`) executa o comando `CREATE DATABASE IF NOT EXISTS` automaticamente. Caso sua senha de root local seja diferente, atualize os campos `DB_PASS` e `DB_USER` em `backend/database.py`.

---

## 📥 Passo a Passo para Instalação

### 1. Clonar ou Abrir a Pasta do Projeto

Abra o terminal (Prompt de Comando, PowerShell ou Terminal do Linux/macOS) na pasta raiz do projeto:

```bash
cd mathlume
```

### 2. Criar e Ativar o Ambiente Virtual (`venv`)

#### No Windows:
- **PowerShell:**
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
  *(Se encontrar restrição de execução de scripts, execute antes: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

- **Prompt de Comando (CMD):**
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate.bat
  ```

#### No Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## ▶️ Como Rodar o Projeto

Com o ambiente virtual ativado e o serviço do MySQL em execução, inicie com:

```bash
python run.py
```

### O que o `run.py` executa em sequência:
1. **Verificação de Dependências:** Instala/atualiza automaticamente as bibliotecas do `requirements.txt`.
2. **Criação da Base de Dados:** Conecta ao MySQL e cria a base `MATHLUME_INT` se não existir.
3. **Migrações Automáticas:** Aplica as revisões do Alembic (`alembic upgrade head`) e sincroniza com o `models.py`.
4. **Servidor ASGI:** Inicia a aplicação FastAPI via Uvicorn com hot-reload ativo.

---

## 🌐 Links de Acesso

Após iniciar o servidor:

- **Jogo / Aplicação Web:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Documentação da API (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Documentação Alternativa (Redoc):** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Executando os Testes Automatizados

O projeto utiliza **pytest** e **polyfactory** para testes de schemas e integridade dos modelos SQLAlchemy:

```bash
pytest
```
