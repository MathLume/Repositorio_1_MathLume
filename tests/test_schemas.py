import pytest
import inspect
from pydantic import BaseModel
from polyfactory.factories.pydantic_factory import ModelFactory

# Importa o seu arquivo de schemas
from backend import schemas

def obter_todos_os_schemas():
    lista_schemas = []
    # Vasculha o arquivo schemas.py atrás de classes Pydantic
    for nome, objeto in inspect.getmembers(schemas, inspect.isclass):
        if issubclass(objeto, BaseModel) and objeto != BaseModel and objeto.__module__ == 'schemas':
            lista_schemas.append(objeto)
    return lista_schemas

@pytest.mark.parametrize("classe_schema", obter_todos_os_schemas())
def test_geracao_automatica_de_schemas(classe_schema):
    """Cria dados aleatórios válidos para cada Schema automaticamente e valida se não há erros"""
    
    # Cria uma Factory dinâmica para a classe atual do loop
    class FactoryDinamica(ModelFactory):
        __model__ = classe_schema

    # O método build() gera os dados respeitando regras como EmailStr, min_length, etc.
    instancia = FactoryDinamica.build()
    
    # Se o build() não estourar um erro de validação do Pydantic, o teste passou.
    # Garantimos apenas que o tipo gerado corresponde à classe esperada.
    assert isinstance(instancia, classe_schema)