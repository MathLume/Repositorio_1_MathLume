"""
Verifica o GitHub Project da organizacao e envia e-mail aos assignees
das issues que estao em "In Progress" ou "Test" com o Target date vencido.
Sem dependencias externas: usa apenas a biblioteca padrao do Python.
"""
import json
import os
import smtplib
import sys
import urllib.request
from datetime import datetime, date
from email.message import EmailMessage
from zoneinfo import ZoneInfo

TOKEN = os.environ["GH_TOKEN"]
ORG = os.environ["ORG"]
PROJECT_NUMBER = int(os.environ["PROJECT_NUMBER"])
STATUS_FIELD = os.environ.get("STATUS_FIELD", "Status")
STATUS_ALVO = {s.strip().lower() for s in os.environ["STATUS_ALVO"].split(",")}
DATE_FIELD = os.environ.get("DATE_FIELD", "Target date")
EMAIL_MAP = json.loads(os.environ.get("EMAIL_MAP") or "{}")
EMAIL_CC = (os.environ.get("EMAIL_CC") or "").strip()
INTERVALO_DIAS = int(os.environ.get("INTERVALO_DIAS", "2"))  # 2 dias = 48h
# Modo teste: numero de uma issue para enviar hoje, ignorando o intervalo de 48h
ISSUE_TESTE = (os.environ.get("ISSUE_TESTE") or "").strip()

HOJE = datetime.now(ZoneInfo("America/Sao_Paulo")).date()

QUERY = """
query($org: String!, $number: Int!, $cursor: String, $status: String!, $data: String!) {
  organization(login: $org) {
    projectV2(number: $number) {
      title
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          status: fieldValueByName(name: $status) {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          prazo: fieldValueByName(name: $data) {
            ... on ProjectV2ItemFieldDateValue { date }
          }
          content {
            ... on Issue {
              number
              title
              url
              state
              repository { nameWithOwner }
              assignees(first: 20) { nodes { login name email } }
              issueFieldValues(first: 20) {
                nodes {
                  ... on IssueFieldDateValue {
                    value
                    field { ... on IssueFieldDate { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


def graphql(variables):
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY, "variables": variables}).encode(),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            # Necessario para ler os campos da issue (Start date, Target date...)
            "GraphQL-Features": "issue_fields",
        },
    )
    with urllib.request.urlopen(req) as resp:
        payload = json.load(resp)
    if payload.get("errors"):
        sys.exit(f"Erro na API do GitHub: {payload['errors']}")
    return payload["data"]["organization"]["projectV2"]


def buscar_itens():
    cursor, itens, titulo = None, [], ""
    while True:
        projeto = graphql({"org": ORG, "number": PROJECT_NUMBER, "cursor": cursor,
                           "status": STATUS_FIELD, "data": DATE_FIELD})
        titulo = projeto["title"]
        pagina = projeto["items"]
        itens.extend(pagina["nodes"])
        if not pagina["pageInfo"]["hasNextPage"]:
            return titulo, itens
        cursor = pagina["pageInfo"]["endCursor"]


def enviar_email(destino, nome, issue, prazo, status, dias, projeto):
    msg = EmailMessage()
    repo = issue["repository"]["nameWithOwner"]
    msg["Subject"] = f"[{projeto}] Atividade atrasada: #{issue['number']} {issue['title']}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = destino
    if EMAIL_CC:
        msg["Cc"] = EMAIL_CC
    plural = "dia" if dias == 1 else "dias"
    msg.set_content(
        f"Ola, {nome}!\n\n"
        f"A atividade abaixo, atribuida a voce, esta com o prazo vencido:\n\n"
        f"Issue: #{issue['number']} {issue['title']}\n"
        f"Repositorio: {repo}\n"
        f"Status atual: {status}\n"
        f"Target date: {prazo.strftime('%d/%m/%Y')} ({dias} {plural} de atraso)\n"
        f"Link: {issue['url']}\n\n"
        f"Por favor, atualize o andamento da atividade ou combine um novo prazo com o grupo.\n\n"
        f"Mensagem automatica enviada pelo GitHub Actions do projeto {projeto}."
    )
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])) as smtp:
        smtp.starttls()
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(msg)


def main():
    projeto, itens = buscar_itens()
    enviados, sem_email = 0, []

    for item in itens:
        issue = item.get("content") or {}
        status = (item.get("status") or {}).get("name")
        if not issue.get("number") or issue.get("state") != "OPEN":
            continue
        if ISSUE_TESTE and str(issue["number"]) != ISSUE_TESTE:
            continue
        # Prazo: campo do Project; se nao existir, usa o campo da propria issue
        prazo_txt = (item.get("prazo") or {}).get("date")
        if not prazo_txt:
            for valor in (issue.get("issueFieldValues") or {}).get("nodes") or []:
                if (valor.get("field") or {}).get("name", "").lower() == DATE_FIELD.lower():
                    prazo_txt = (valor.get("value") or "")[:10]
        if not status or status.lower() not in STATUS_ALVO or not prazo_txt:
            if ISSUE_TESTE:
                print(f"Teste: #{ISSUE_TESTE} ignorada (status={status}, prazo={prazo_txt})")
            continue
        prazo = date.fromisoformat(prazo_txt)
        if prazo >= HOJE:
            if ISSUE_TESTE:
                print(f"Teste: #{ISSUE_TESTE} ainda no prazo ({prazo_txt})")
            continue

        dias = (HOJE - prazo).days
        # Envia no 1o dia de atraso e depois a cada 48h (dias 1, 3, 5, 7...)
        if not ISSUE_TESTE and (dias - 1) % INTERVALO_DIAS != 0:
            print(f"Atrasada, sem envio hoje: #{issue['number']} ({dias} dias de atraso)")
            continue
        print(f"Atrasada: #{issue['number']} {issue['title']} ({status}, prazo {prazo_txt})")
        for pessoa in issue["assignees"]["nodes"]:
            login = pessoa["login"]
            email = EMAIL_MAP.get(login) or pessoa.get("email")
            if not email:
                sem_email.append(f"{login} (issue #{issue['number']})")
                continue
            enviar_email(email, pessoa.get("name") or login, issue, prazo, status, dias, projeto)
            enviados += 1
            print(f"  e-mail enviado para {login}")

    print(f"\nTotal de e-mails enviados: {enviados}")
    if sem_email:
        print("::warning::Sem e-mail cadastrado para: " + ", ".join(sem_email)
              + ". Adicione no secret EMAIL_MAP.")


if __name__ == "__main__":
    main()
