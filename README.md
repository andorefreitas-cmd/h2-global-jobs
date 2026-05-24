# H2 Global Jobs — Site funcional

Sistema web para vender acesso às buscas H-2A/H-2B.

## O que já está pronto

- Cadastro com 24 horas grátis
- Login de usuário
- Login administrador
- Painel do usuário
- Painel admin para renovar/bloquear usuários
- Planos:
  - 24h grátis
  - 7 dias — R$ 39,00
  - 30 dias — R$ 100,00
  - VIP 90 dias — R$ 250,00
- Pagamento somente via Pix
- A chave Pix aparece somente depois do cadastro/login
- Botão para enviar comprovante pelo WhatsApp (31) 98842-5410
- Backend em FastAPI
- Frontend em React/Vite
- Busca H-2A/H-2B usando feeds públicos do DOL/SeasonalJobs
- Exportação CSV/TXT no navegador
- Marcar e-mails como já usados por usuário

## Como rodar localmente

### 1. Backend

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend: http://localhost:8000

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Login admin inicial

Usuário: `admin`  
Senha: `Aa251589Ff`

Altere em `backend/.env.example` antes de colocar online.

## Configurar Pix

No servidor, configure as variáveis:

```bash
PIX_KEY=sua_chave_pix
PIX_NAME=Seu nome
WHATSAPP=5531988425410
```

## Observação importante

O sistema não garante contratação, visto, aprovação ou resposta do empregador. Ele apenas organiza buscas e contatos a partir de fontes oficiais/disponíveis.
