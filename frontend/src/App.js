import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUpload, FiFile, FiDownload, FiList } from 'react-icons/fi';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [modeloFile, setModeloFile] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    // Carregar lista de arquivos ao iniciar
    fetchArquivos();
  }, []);

  const fetchArquivos = async () => {
    try {
      const response = await axios.get(`${API_URL}/arquivos`);
      setArquivos(response.data);
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err);
      setError('Não foi possível carregar a lista de arquivos.');
    }
  };

  const handleFileChange = (e, tipo) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Verificar se é um PDF
    if (selectedFile.type !== 'application/pdf') {
      setError('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    if (tipo === 'documento') {
      setFile(selectedFile);
    } else if (tipo === 'modelo') {
      setModeloFile(selectedFile);
    }
    
    setError('');
    setFicha(null);
  };

  const handleUploadSimples = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Upload do arquivo
      const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Obter a ficha técnica
      const fichaRes = await axios.get(`${API_URL}/ficha/${uploadRes.data.filename}`);
      setFicha(fichaRes.data);
      
      // Atualizar lista de arquivos
      fetchArquivos();
    } catch (err) {
      console.error('Erro:', err);
      setError(err.response?.data?.error || 'Erro ao processar o arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComModelo = async (e) => {
    e.preventDefault();
    if (!file || !modeloFile) {
      setError('Por favor, selecione o documento e o modelo de ficha.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('documento', file);
    formData.append('modelo', modeloFile);
    
    try {
      // Processar com modelo
      const response = await axios.post(`${API_URL}/processar-com-modelo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFicha(response.data);
      
      // Atualizar lista de arquivos
      fetchArquivos();
    } catch (err) {
      console.error('Erro:', err);
      setError(err.response?.data?.error || 'Erro ao processar os arquivos.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarFicha = () => {
    if (!ficha) return;
    
    // Criar um objeto Blob com o JSON formatado
    const fichaJson = JSON.stringify(ficha, null, 2);
    const blob = new Blob([fichaJson], { type: 'application/json' });
    
    // Criar URL para download
    const url = URL.createObjectURL(blob);
    
    // Criar link e simular clique
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficha_tecnica_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const renderTabs = () => (
    <div className="tabs">
      <div 
        className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
        onClick={() => setActiveTab('upload')}
      >
        Upload Simples
      </div>
      <div 
        className={`tab ${activeTab === 'modelo' ? 'active' : ''}`}
        onClick={() => setActiveTab('modelo')}
      >
        Upload com Modelo
      </div>
      <div 
        className={`tab ${activeTab === 'arquivos' ? 'active' : ''}`}
        onClick={() => setActiveTab('arquivos')}
      >
        Arquivos Processados
      </div>
    </div>
  );

  const renderUploadSimples = () => (
    <div className={`tab-content ${activeTab === 'upload' ? 'active' : ''}`}>
      <form onSubmit={handleUploadSimples}>
        <div className="form-group">
          <label>Selecione o documento PDF para análise:</label>
          <div className="file-input-container">
            <FiUpload className="file-input-icon" />
            <div className="file-input-text">
              {file ? file.name : 'Arraste o arquivo ou clique para selecionar'}
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => handleFileChange(e, 'documento')} 
            />
          </div>
          {file && <div className="file-name">{file.name}</div>}
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block" 
          disabled={!file || loading}
        >
          {loading ? 'Processando...' : 'Gerar Ficha Técnica'}
        </button>
      </form>
    </div>
  );

  const renderUploadComModelo = () => (
    <div className={`tab-content ${activeTab === 'modelo' ? 'active' : ''}`}>
      <form onSubmit={handleUploadComModelo}>
        <div className="form-group">
          <label>Selecione o documento PDF para análise:</label>
          <div className="file-input-container">
            <FiFile className="file-input-icon" />
            <div className="file-input-text">
              {file ? file.name : 'Arraste o documento ou clique para selecionar'}
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => handleFileChange(e, 'documento')} 
            />
          </div>
          {file && <div className="file-name">{file.name}</div>}
        </div>
        
        <div className="form-group">
          <label>Selecione o modelo de ficha técnica (PDF):</label>
          <div className="file-input-container">
            <FiFile className="file-input-icon" />
            <div className="file-input-text">
              {modeloFile ? modeloFile.name : 'Arraste o modelo ou clique para selecionar'}
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => handleFileChange(e, 'modelo')} 
            />
          </div>
          {modeloFile && <div className="file-name">{modeloFile.name}</div>}
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block" 
          disabled={!file || !modeloFile || loading}
        >
          {loading ? 'Processando...' : 'Gerar Ficha Técnica com Modelo'}
        </button>
      </form>
    </div>
  );

  const renderArquivos = () => (
    <div className={`tab-content ${activeTab === 'arquivos' ? 'active' : ''}`}>
      <h3>Arquivos Processados</h3>
      {arquivos.length === 0 ? (
        <p>Nenhum arquivo processado ainda.</p>
      ) : (
        <ul className="arquivos-list">
          {arquivos.map((arquivo, index) => (
            <li key={index} className="arquivo-item">
              <div className="arquivo-info">
                <strong>{arquivo.nome}</strong>
                <span>Tamanho: {Math.round(arquivo.tamanho / 1024)} KB</span>
                <span>Data: {new Date(arquivo.dataUpload).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderFichaTecnica = () => {
    if (!ficha) return null;
    
    return (
      <div className="result-container">
        <div className="result-title">
          <h3>Ficha Técnica Gerada</h3>
          <button 
            className="btn btn-secondary" 
            onClick={handleExportarFicha}
            style={{ marginLeft: '10px', float: 'right' }}
          >
            <FiDownload style={{ marginRight: '5px' }} /> Exportar
          </button>
        </div>
        
        <div className="ficha-tecnica">
          <div className="ficha-header">
            <h4>Informações do Documento</h4>
            <p>Arquivo: {ficha.arquivo}</p>
            <p>Data de Processamento: {new Date(ficha.dataProcessamento).toLocaleString()}</p>
          </div>
          
          <div className="ficha-body">
            {ficha.dadosAnalisados && (
              <div className="ficha-section">
                <h4 className="ficha-section-title">Dados Extraídos</h4>
                {Object.entries(ficha.dadosAnalisados).map(([key, value]) => {
                  // Se for array de objetos, renderiza cada um
                  if (Array.isArray(value)) {
                    return (
                      <div key={key} className="ficha-subsection">
                        <h5>{key}</h5>
                        {value.map((item, idx) => (
                          typeof item === 'object' && item !== null ? (
                            <div key={idx} className="ficha-item">
                              {Object.entries(item).map(([subKey, subValue]) => (
                                <div key={subKey} style={{ marginLeft: 10 }}>
                                  <span className="ficha-item-label">{subKey}:</span> {String(subValue)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div key={idx} className="ficha-item">{String(item)}</div>
                          )
                        ))}
                      </div>
                    );
                  }
                  // Se for objeto simples, renderiza suas propriedades
                  if (typeof value === 'object' && value !== null) {
                    return (
                      <div key={key} className="ficha-subsection">
                        <h5>{key}</h5>
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <div key={subKey} className="ficha-item">
                            <div className="ficha-item-label">{subKey}:</div>
                            <div className="ficha-item-value">{String(subValue)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  // Valor primitivo
                  return (
                    <div key={key} className="ficha-item">
                      <div className="ficha-item-label">{key}:</div>
                      <div className="ficha-item-value">{String(value)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {ficha.textoExtraido && (
              <div className="ficha-section">
                <h4 className="ficha-section-title">Amostra do Texto Extraído</h4>
                <div className="text-preview">{ficha.textoExtraido}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Gerador de Fichas Técnicas</h1>
        <p>Automatize a extração de informações de documentos técnicos</p>
      </div>
      
      <div className="form-container">
        {renderTabs()}
        
        {error && (
          <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
            {error}
          </div>
        )}
        
        {renderUploadSimples()}
        {renderUploadComModelo()}
        {renderArquivos()}
      </div>
      
      {renderFichaTecnica()}
    </div>
  );
}

export default App;
