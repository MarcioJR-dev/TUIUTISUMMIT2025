import React, { useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFicha(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const uploadRes = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const fichaRes = await fetch(`http://localhost:5000/ficha/${uploadData.filename}`);
      const fichaData = await fichaRes.json();
      setFicha(fichaData);
    } catch (err) {
      alert('Erro ao enviar arquivo ou obter ficha.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Ficha Técnica Automática</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".pdf" onChange={handleFileChange} />
        <button type="submit" disabled={!file || loading} style={{ marginLeft: 10 }}>
          {loading ? 'Processando...' : 'Enviar'}
        </button>
      </form>
      {ficha && (
        <div style={{ marginTop: 30, padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
          <h3>Ficha Técnica</h3>
          <p><b>Projeto:</b> {ficha.projeto}</p>
          <p><b>Arquivo:</b> {ficha.arquivo}</p>
          <p><b>Descrição:</b> {ficha.descricao}</p>
          <hr />
          <p><b>Cliente:</b> {ficha.dados.cliente}</p>
          <p><b>Responsável:</b> {ficha.dados.responsavel}</p>
          <p><b>Telefone:</b> {ficha.dados.telefone}</p>
          <p><b>Email:</b> {ficha.dados.email}</p>
          <p><b>Data:</b> {ficha.dados.data}</p>
          {ficha.textoExtraido && (
            <>
              <hr />
              <p><b>Texto extraído do PDF:</b></p>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', background: '#f9f9f9', padding: 10 }}>{ficha.textoExtraido}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
