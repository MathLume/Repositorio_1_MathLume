-- ==========================================================
-- MathLume — estrutura do banco (PostgreSQL / Neon)
-- O servidor roda este arquivo sozinho ao ligar (tudo é
-- "IF NOT EXISTS", então rodar de novo não apaga nada).
-- Se quiser, cole no "SQL Editor" do Neon para criar na mão.
-- ==========================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id          VARCHAR(16)  PRIMARY KEY,
  usuario     VARCHAR(24)  NOT NULL,
  email       VARCHAR(120) NOT NULL,
  senha_hash  TEXT         NOT NULL,                -- scrypt + sal (nunca a senha em texto)
  papel       VARCHAR(10)  NOT NULL DEFAULT 'usuario' CHECK (papel IN ('usuario', 'admin')),
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Nome e e-mail não se repetem, sem diferenciar maiúsculas ("Yasser" = "yasser").
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_usuario_unico ON usuarios (lower(usuario));
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unico   ON usuarios (lower(email));

CREATE TABLE IF NOT EXISTS pontuacoes (
  id           VARCHAR(16) PRIMARY KEY,
  usuario_id   VARCHAR(16) NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  pontos       INTEGER     NOT NULL CHECK (pontos >= 0),
  nivel        INTEGER     NOT NULL DEFAULT 1 CHECK (nivel >= 0),
  combo_max    INTEGER     NOT NULL DEFAULT 0 CHECK (combo_max >= 0),
  acertos      INTEGER     NOT NULL DEFAULT 0 CHECK (acertos >= 0),
  modo         VARCHAR(10) NOT NULL CHECK (modo IN ('finito', 'infinito')),
  dificuldade  VARCHAR(10) NOT NULL CHECK (dificuldade IN ('facil', 'medio', 'dificil')),
  venceu       BOOLEAN     NOT NULL DEFAULT false,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pontuacoes_usuario_idx ON pontuacoes (usuario_id);
CREATE INDEX IF NOT EXISTS pontuacoes_filtro_idx  ON pontuacoes (dificuldade, modo);

-- Logins abertos (guardamos só o SHA-256 do token, não o token).
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  CHAR(64)    PRIMARY KEY,
  usuario_id  VARCHAR(16) NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  expira_em   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_expira_idx ON sessoes (expira_em);
