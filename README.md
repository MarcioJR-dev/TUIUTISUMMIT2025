<<<<<<< HEAD
# Ficha Técnica Automática - Demo

## Como rodar o projeto

### 1. Backend (Node.js)

1. Entre na pasta `backend`:
   ```
   cd backend
   ```
2. Instale as dependências:
   ```
   npm install
   ```
3. Rode o servidor:
   ```
   npm start
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
3. Instale também as dependências de desenvolvimento:
   ```
   npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader @babel/core @babel/preset-env @babel/preset-react html-webpack-plugin
   ```
4. Crie um arquivo `webpack.config.js` na pasta `frontend` com a configuração básica do Webpack (veja abaixo).
5. Rode o frontend:
   ```
   npm start
   ```
   O frontend ficará disponível em http://localhost:8080

---

## Exemplo de `webpack.config.js` para o React

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
    open: true,
  },
};
```

---

Pronto! Agora você pode demonstrar o upload de um PDF e a geração da ficha técnica mockada.
=======
# TUIUTISUMMIT2025
Projeto para Tuiuti Summit 2025
>>>>>>> 1287573dbd7c587d8dc5a87583705d98e61b8d3a
