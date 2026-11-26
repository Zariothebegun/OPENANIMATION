# Ponte Gemini — API local (compatível com OpenAI)

Servidor local que expõe o **Gemini web** (via cookies da conta GemCLI) como uma API
HTTP igual à da OpenAI. Serve para qualquer ferramenta ou agente que saiba falar
"OpenAI": basta apontar o `base_url` para `http://127.0.0.1:8787/v1`.

- **Base URL:** `http://127.0.0.1:8787/v1`
- **Modelo:** `gemini-web` (é o único que existe; qualquer outro nome cai neste)
- **Autenticação:** nenhuma (`api_key` pode ser `"x"` ou vazio)
- **Custo:** zero (usa a conta Gemini do browser, não a API paga)
- **CORS:** `*` — pode ser chamado de páginas web locais
- **Streaming:** sim (SSE, formato OpenAI)
- **Painel de estado:** `http://127.0.0.1:8787/` (HTML: estado, modelo, uptime, chamadas, última, último erro)

## Endpoints

| Método | Caminho | O que faz |
|---|---|---|
| GET | `/` | Painel HTML de estado |
| GET | `/v1/models` | Lista de modelos: `{"data":[{"id":"gemini-web","object":"model"}]}` |
| POST | `/v1/chat/completions` | Conversa. `messages` no formato OpenAI. `stream: true` devolve SSE |
| OPTIONS | `/v1/chat/completions` | CORS (feito automaticamente pelo cliente HTTP) |

### Pedido

```json
{
  "model": "gemini-web",
  "stream": false,
  "messages": [
    { "role": "system", "content": "Responde em português de Portugal." },
    { "role": "user", "content": "Explica o efeito de Coriolis em 3 frases." }
  ]
}
```

`system` + histórico são colados num único prompt (o Gemini web não tem roles).

### Resposta (não-streaming)

```json
{
  "id": "gemini-web",
  "object": "chat.completion",
  "model": "gemini-web",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "..." },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 1 }
}
```

### Resposta (streaming)

```
data: {"choices":[{"index":0,"delta":{"content":"Um"}}]}

data: {"choices":[{"index":0,"delta":{"content":", dois, três"}}]}

data: [DONE]
```

Em caso de erro: `{"error":{"message":"..."}}` dentro de um `data:`, e a ligação fecha.

## Exemplos

### curl — pergunta simples

```bash
curl -sS -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemini-web","messages":[{"role":"user","content":"Responde apenas com a palavra PONTE"}]}'
```

### curl — streaming

```bash
curl -N -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemini-web","stream":true,"messages":[{"role":"user","content":"Conta 1 a 5."}]}'
```

### JavaScript / TypeScript

```ts
const r = await fetch("http://127.0.0.1:8787/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gemini-web",
    messages: [{ role: "user", content: "O que é entropia?" }],
  }),
});
const j = await r.json();
console.log(j.choices[0].message.content);
```

Streaming em JS:

```ts
const r = await fetch("http://127.0.0.1:8787/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gemini-web", stream: true, messages: [{ role: "user", content: "Conta 1 a 5." }] }),
});
const reader = r.body!.getReader();
const dec = new TextDecoder();
let buf = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const parts = buf.split("\n\n");
  buf = parts.pop() ?? "";
  for (const p of parts) {
    const line = p.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    const d = JSON.parse(data)?.choices?.[0]?.delta?.content;
    if (d) process.stdout.write(d);
  }
}
```

### Python — com a biblioteca `openai`

```python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8787/v1", api_key="x")
r = client.chat.completions.create(
    model="gemini-web",
    messages=[{"role": "user", "content": "O que é entropia?"}],
)
print(r.choices[0].message.content)
```

### Python — sem dependências

```python
import json, urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:8787/v1/chat/completions",
    data=json.dumps({"model": "gemini-web", "messages": [{"role": "user", "content": "olá"}]}).encode(),
    headers={"Content-Type": "application/json"},
)
print(json.load(urllib.request.urlopen(req, timeout=180))["choices"][0]["message"]["content"])
```

## Regras práticas (importante para quem consome)

1. **Latência:** a primeira palavra costuma chegar aos **15–25 s** e uma resposta
   completa aos **20–40 s**. Põe timeout de **90–180 s** no cliente (a ponte corta
   sozinha aos 70 s por pedido, para não ficar pendurada).
2. **Paralelismo:** aceita 2–3 pedidos em simultâneo (são respondidos em paralelo,
   o total é o do mais lento), mas **não** dispares 10 de uma vez: é uma única
   sessão do browser e o Google começa a atrasar.
3. **JSON:** se pedires JSON, pede-o de forma explícita ("responde apenas com um
   objecto JSON"). A ponte extrai o primeiro objecto `{...}` válido do texto e
   devolve-o limpo; se o modelo responder em prosa, devolve 502 com o motivo.
4. **Contexto:** `system` + até às últimas mensagens vão num só prompt. Não há
   memória entre pedidos — manda o histórico que precisares em cada chamada.
5. **Cookies:** a sessão vem de `%APPDATA%\gemcli\cookies.json`. Quando expirar, o
   pedido devolve erro de autenticação: abre o **GemCLI**, volta a iniciar sessão
   no Gemini e reinicia a ponte.

## Ligar / desligar / reiniciar

```bat
cd C:\Users\a4663\Documents\Codex\GemCLI

REM arrancar (fica escondida, escreve em bridge.log / bridge.err.log)
powershell -NoProfile -Command "Start-Process -FilePath '.\.venv\Scripts\python.exe' -ArgumentList 'viently_bridge.py' -WorkingDirectory 'C:\Users\a4663\Documents\Codex\GemCLI' -WindowStyle Hidden -RedirectStandardOutput 'C:\Users\a4663\Documents\Codex\GemCLI\bridge.log' -RedirectStandardError 'C:\Users\a4663\Documents\Codex\GemCLI\bridge.err.log'"

REM desligar
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -like '*viently_bridge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"

REM verificar
curl http://127.0.0.1:8787/v1/models
```

Ficheiros: `viently_bridge.py` (servidor), `bridge.log` (pedidos), `bridge.err.log`
(erros), `%APPDATA%\gemcli\cookies.json` (sessão).

## Acesso fora deste computador

Por omissão escuta só em `127.0.0.1` (ninguém da rede entra). Para usar de outro
dispositivo/agente na mesma rede:

1. em `viently_bridge.py`, trocar `("127.0.0.1", 8787)` por `("0.0.0.0", 8787)`;
2. abrir a porta 8787 na firewall do Windows;
3. usar `http://<IP-do-PC>:8787/v1` como base URL.

Atenção: sem autenticação, quem entrar na rede usa a tua conta Gemini. Só o fazer
em rede de confiança.
