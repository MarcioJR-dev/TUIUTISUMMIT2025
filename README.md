# Gerador de Fichas Técnicas

Uma aplicação web para automatizar a geração de fichas técnicas a partir de documentos PDF, utilizando processamento de linguagem natural e inteligência artificial.

## Descrição

Esta aplicação foi desenvolvida para automatizar o processo de elaboração de fichas técnicas para projetos de engenharia, arquitetura e construção civil. A ferramenta utiliza a API do Gemini Pro para extrair e organizar informações relevantes de documentos técnicos em PDF, gerando fichas padronizadas que podem ser facilmente exportadas e compartilhadas.

## Funcionalidades

- Upload e processamento de arquivos PDF
- Extração automática de informações técnicas relevantes
- Suporte para processamento com modelo de ficha personalizado
- Visualização interativa das fichas técnicas geradas
- Exportação das fichas em formato JSON
- Gerenciamento de arquivos processados

## Tecnologias Utilizadas

### Backend
- Node.js
- Express
- Multer (para upload de arquivos)
- pdf-parse (para extração de texto de PDFs)
- Google Generative AI (API do Gemini Pro)

### Frontend
- React
- Axios (para requisições HTTP)
- React Icons
- CSS personalizado

## Como rodar o projeto

### Pré-requisitos
- Node.js (v14 ou superior)
- NPM ou Yarn
- Chave de API do Gemini Pro

### 1. Backend (Node.js)

1. Entre na pasta `backend`:
   ```
   cd backend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure o arquivo .env com sua chave de API do Gemini Pro:
   ```
   GEMINI_API_KEY=sua_chave_api_aqui
   PORT=5000
   ```
4. Rode o servidor:
   ```
   npm start
   ```
   ou para desenvolvimento:
   ```
   npm run dev
   ```
   O backend ficará disponível em http://localhost:5000

### 2. Frontend (React)

1. Entre na pasta `frontend`:
   ```
   cd ../frontend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Rode o frontend:
   ```
   npm start
   ```
   O frontend ficará disponível em http://localhost:8080

## Uso

1. Acesse a aplicação em `http://localhost:8080`
2. Selecione a aba "Upload Simples" para processar um único documento ou "Upload com Modelo" para processar um documento com base em um modelo de ficha
3. Faça upload do(s) arquivo(s) PDF
4. Aguarde o processamento
5. Visualize a ficha técnica gerada
6. Exporte a ficha em formato JSON se necessário

## Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
