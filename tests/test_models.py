import pytest
import inspect
from sqlalchemy import inspect as sqla_inspect

# Importa a Base e o arquivo de modelos do seu projeto
from backend.database import Base
from backend import models

def obter_todos_os_modelos():
    lista_modelos = []
    # Vasculha o arquivo models.py atrás de classes
    for nome, objeto in inspect.getmembers(models, inspect.isclass):
        # Verifica se a classe herda de Base e se foi criada no arquivo models (ignora imports externos)
        if issubclass(objeto, Base) and objeto != Base and objeto.__module__ == 'models':
            lista_modelos.append(objeto)
    return lista_modelos

@pytest.mark.parametrize("classe_modelo", obter_todos_os_modelos())
def test_estrutura_dos_modelos_sqlalchemy(classe_modelo):
    """Garante que todas as classes de banco de dados tenham nome de tabela e chave primária"""
    
    # Valida se possui __tablename__
    assert hasattr(classe_modelo, "__tablename__"), \
        f"A classe {classe_modelo.__name__} não possui o atributo __tablename__."
    
    # Valida se possui chave primária
    mapper = sqla_inspect(classe_modelo)
    assert len(mapper.primary_key) > 0, \
        f"A tabela '{classe_modelo.__tablename__}' não tem uma chave primária."