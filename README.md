# Banco de Músicas do Lyra

Site público de letras e cifras, com área administrativa protegida, transposição
automática de tons, links permanentes por tom, instalação como aplicativo (PWA) e
uma API pronta para o programa Lyra consumir.

- **Next.js 15** (App Router) — hospedagem na Vercel
- **Supabase** — banco de dados e autenticação
- **Sem chave de API para leitura** — o banco é público para consulta

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Escolha um nome, uma senha para o banco e a região **South America (São Paulo)**.
3. Espere o projeto subir (uns 2 minutos).

### Criar as tabelas

1. No menu lateral: **SQL Editor** → **New query**.
2. Cole o conteúdo inteiro de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Deve aparecer *Success. No rows returned*.

### Criar o usuário administrador

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Preencha e-mail e senha e marque **Auto Confirm User**.
3. Volte ao **SQL Editor** e rode, trocando pelo seu e-mail:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'seu@email.com'
on conflict (user_id) do nothing;
```

### Pegar as credenciais

**Project Settings** → **API**. Anote:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> A chave `anon` pode ficar exposta no navegador: quem manda são as políticas de
> RLS do banco, que liberam **leitura** das músicas publicadas para todo mundo e
> **escrita** apenas para quem está na tabela `admins`. Nunca coloque a chave
> `service_role` neste projeto.

---

## 2. Rodar na sua máquina

```bash
npm install
cp .env.example .env.local     # preencha com os dados do passo 1
npm run dev
```

Abra <http://localhost:3000>. A área administrativa fica em `/admin`.

---

## 3. Publicar na Vercel

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New… → Project** → importe o repositório.
3. Em **Environment Variables**, cadastre as três variáveis do `.env.example`
   (deixe `NEXT_PUBLIC_SITE_URL` com o domínio final, ex.: `https://lyra.vercel.app`).
4. **Deploy**.

Depois de publicar, ajuste no Supabase: **Authentication → URL Configuration →
Site URL** com o mesmo endereço.

---

## 4. Como o site se organiza

### Público (sem login)

| Endereço | O que mostra |
|---|---|
| `/` | Busca por título, artista ou trecho da letra |
| `/musica/galileu` | Letra |
| `/musica/galileu/cifra` | Redireciona para o tom original |
| `/musica/galileu/cifra/a` | **Cifra em A** — link permanente, dá para favoritar |
| `/musica/galileu/cifra/bb` | Cifra em Bb |
| `/musica/galileu/cifra/fsm` | Cifra em F#m |
| `/integracao` | Documentação da API para quem for ligar o Lyra |

**Como o tom vira endereço:** letra minúscula, `#` vira `s`, bemol vira `b`,
menor recebe `m` no fim. `A` → `a`, `Bb` → `bb`, `C#` → `db`, `F#m` → `fsm`.

Cada altura tem **uma única grafia oficial** (`Db`, nunca `C#`; `F#`, nunca `Gb`),
para que o mesmo tom nunca gere dois links diferentes — os favoritos do usuário
continuam valendo para sempre.

### Administrativo (com login)

| Endereço | O que faz |
|---|---|
| `/login` | Entrada do administrador |
| `/admin` | Lista de músicas |
| `/admin/nova` | Cadastro |
| `/admin/musica/{id}` | Edição, com abas **Letra** e **Cifra** |

---

## 5. Como funcionam os tons

Você cadastra a cifra **uma vez só**, no tom em que escreveu (campo *Tom original*).
Na aba **Cifra**, marque quais tons devem ficar publicados — cada um marcado ganha
sua própria URL permanente e é gerado por transposição automática.

Se algum tom sair estranho, escolha-o em *Ajuste manual de um tom*: aparece a
transposição automática já pronta para você editar. A partir do momento em que
você mexe, aquele tom passa a usar a sua versão (marcado com ✎), e os demais
continuam automáticos. O botão **Voltar ao automático** desfaz.

### Formato da cifra

Texto puro, acordes em linhas próprias acima da letra — o mesmo formato dos sites
de cifra. O alinhamento das colunas é preservado na transposição.

```
[Intro] G  D  Em  C

G            D/F#      Em
Tu és o Deus de toda a terra
```

O motor reconhece tétrades, baixo invertido (`D/F#`), suspensões, marcadores de
seção e repetições. Linhas de letra nunca são alteradas.

---

## 6. API para o Lyra

Somente leitura, sem autenticação, CORS liberado. Configure no Lyra apenas:

```
https://SEU-SITE/api/v1
```

Esse endereço descreve todos os outros, então o programa se orienta sozinho.

| Método | Endpoint | Para quê |
|---|---|---|
| GET | `/api/v1` | Descoberta: versão, formato, contagem, lista de endpoints |
| GET | `/api/v1/songs?q=&limit=&offset=` | Busca em título, artista e letra |
| GET | `/api/v1/songs/{slug}` | Música completa |
| GET | `/api/v1/songs/{slug}?include=all_keys` | Idem, com a cifra já transposta em todos os tons |
| GET | `/api/v1/songs/{slug}/chords/{tom}` | Cifra num tom específico |
| GET | `/api/v1/sync?since={iso}` | Só o que mudou desde a data informada |

### Exemplo — buscar

```
GET /api/v1/songs?q=deus de toda a terra
```

```json
{
  "query": "deus de toda a terra",
  "count": 1,
  "results": [
    {
      "slug": "galileu",
      "title": "Galileu",
      "artist": "Fernandinho",
      "base_key": "G",
      "keys": ["G", "A", "Bb", "C", "D", "E"],
      "has_chords": true,
      "snippet": "Tu és o Deus de toda a terra",
      "url": "https://SEU-SITE/musica/galileu/cifra/g",
      "api_url": "https://SEU-SITE/api/v1/songs/galileu"
    }
  ]
}
```

### Exemplo — importar para a biblioteca local

```
GET /api/v1/songs/galileu?include=all_keys
```

Devolve `title`, `artist`, `lyrics`, `base_key`, `capo`, `tempo_bpm` e o array
`keys`, em que cada item já traz a cifra pronta daquele tom e a URL pública
correspondente. Uma requisição basta para gravar a música inteira.

A busca ignora acentos e aceita prefixo: `gali` encontra *Galileu*, `coracao`
encontra *coração*.

### Sincronização incremental

Guarde o `next_since` devolvido e mande-o na próxima chamada:

```
GET /api/v1/sync?since=2026-01-01T00:00:00Z
```

---

## 7. Instalar como aplicativo

- **Android (Chrome):** menu ⋮ → *Instalar aplicativo*.
- **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.

As páginas já visitadas continuam abrindo sem internet. A área administrativa e a
API nunca ficam em cache, para não mostrar dado velho.

---

## 8. Testes

```bash
npm run test:chords    # motor de transposição, tons e classificação de linhas
npm run build          # verificação de tipos + build de produção
```

---

## Estrutura

```
supabase/schema.sql            SQL completo: tabelas, busca, RLS
src/lib/chords.ts              Motor de cifras: parser, transposição, tons
src/lib/songs.ts               Leitura pública e resolução de cifra por tom
src/lib/api.ts                 Formato das respostas da API
src/app/musica/[slug]/         Páginas públicas (letra e cifra por tom)
src/app/admin/                 Área administrativa
src/app/api/v1/                API do Lyra
src/components/Reader.tsx      Leitor: fonte, quebra, rolagem automática
src/middleware.ts              Sessão e bloqueio de /admin
```
