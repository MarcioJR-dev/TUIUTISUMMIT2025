import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUpload, FiFile, FiDownload, FiList, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [modeloFile, setModeloFile] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [error, setError] = useState('');
  
  // Estados para upload múltiplo
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [processamentoId, setProcessamentoId] = useState(null);
  const [processamentoStatus, setProcessamentoStatus] = useState(null);
  const [processamentoResultado, setProcessamentoResultado] = useState(null);
  const [loadingMultiple, setLoadingMultiple] = useState(false);

  const API_URL = 'http://localhost:5000';

  useEffect(() => {
    // Carregar lista de arquivos ao iniciar
    fetchArquivos();
  }, []);

  // Polling para acompanhar processamento
  useEffect(() => {
    let interval;
    if (processamentoId && processamentoStatus?.status && 
        (processamentoStatus.status === 'iniciando' || processamentoStatus.status === 'processando')) {
      interval = setInterval(() => {
        fetchProcessamentoStatus();
      }, 2000); // Verifica a cada 2 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processamentoId, processamentoStatus?.status]);

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

  const handleMultipleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Verificar se todos são PDFs
    const invalidFiles = selectedFiles.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setError('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    if (selectedFiles.length > 10) {
      setError('Máximo de 10 arquivos por upload.');
      return;
    }

    setMultipleFiles(selectedFiles);
    setError('');
    setProcessamentoResultado(null);
  };

  const fetchProcessamentoStatus = async () => {
    if (!processamentoId) return;
    
    try {
      console.log('Buscando status do processamento:', processamentoId);
      const response = await axios.get(`${API_URL}/processamento/${processamentoId}/status`);
      console.log('Status recebido:', response.data);
      setProcessamentoStatus(response.data);
      
      // Se concluído, buscar resultado completo
      if (response.data.status === 'concluido') {
        console.log('Processamento concluído, buscando resultado...');
        fetchProcessamentoResultado();
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  };

  const fetchProcessamentoResultado = async () => {
    if (!processamentoId) return;
    
    try {
      const response = await axios.get(`${API_URL}/processamento/${processamentoId}/resultado`);
      setProcessamentoResultado(response.data);
      setLoadingMultiple(false);
    } catch (err) {
      console.error('Erro ao buscar resultado:', err);
      setLoadingMultiple(false);
    }
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

  const handleUploadMultiple = async (e) => {
    e.preventDefault();
    if (multipleFiles.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo PDF.');
      return;
    }

    setLoadingMultiple(true);
    setError('');
    
    const formData = new FormData();
    multipleFiles.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      console.log('Enviando upload múltiplo...');
      // Upload dos arquivos
      const response = await axios.post(`${API_URL}/upload-multiple`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Resposta do upload:', response.data);
      setProcessamentoId(response.data.processamentoId);
      setProcessamentoStatus({
        status: 'iniciando',
        totalArquivos: response.data.totalArquivos,
        processados: 0,
        pendentes: response.data.totalArquivos,
        erros: 0
      });
      
      console.log('Estado atualizado, iniciando polling...');
      
      // Atualizar lista de arquivos
      fetchArquivos();
    } catch (err) {
      console.error('Erro:', err);
      setError(err.response?.data?.error || 'Erro ao processar os arquivos.');
      setLoadingMultiple(false);
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
        className={`tab ${activeTab === 'multiple' ? 'active' : ''}`}
        onClick={() => setActiveTab('multiple')}
      >
        Upload Múltiplo
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

  const renderUploadMultiple = () => (
    <div className={`tab-content ${activeTab === 'multiple' ? 'active' : ''}`}>
      <form onSubmit={handleUploadMultiple}>
        <div className="form-group">
          <label>Selecione múltiplos documentos PDF para análise:</label>
          <div className="file-input-container">
            <FiUpload className="file-input-icon" />
            <div className="file-input-text">
              {multipleFiles.length > 0 
                ? `${multipleFiles.length} arquivo(s) selecionado(s)` 
                : 'Arraste os arquivos ou clique para selecionar (máx. 10)'
              }
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              multiple
              onChange={handleMultipleFileChange} 
            />
          </div>
          {multipleFiles.length > 0 && (
            <div className="files-list">
              {multipleFiles.map((file, index) => (
                <div key={index} className="file-name">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block" 
          disabled={multipleFiles.length === 0 || loadingMultiple}
        >
          {loadingMultiple ? 'Iniciando Processamento...' : 'Processar Múltiplos PDFs'}
        </button>
      </form>

      {/* Status do Processamento */}
      {processamentoStatus && (
        <div className="processamento-status">
          <h3>Status do Processamento</h3>
          <div className="status-info">
            <div className="status-item">
              <strong>Status:</strong> 
              <span className={`status-badge ${processamentoStatus.status}`}>
                {processamentoStatus.status === 'iniciando' && <FiClock />}
                {processamentoStatus.status === 'processando' && <FiClock />}
                {processamentoStatus.status === 'concluido' && <FiCheckCircle />}
                {processamentoStatus.status === 'erro' && <FiXCircle />}
                {processamentoStatus.status}
              </span>
            </div>
            <div className="status-item">
              <strong>Progresso:</strong> {processamentoStatus.processados}/{processamentoStatus.totalArquivos} arquivos
            </div>
            <div className="status-item">
              <strong>Sucessos:</strong> {processamentoStatus.processados - processamentoStatus.erros}
            </div>
            <div className="status-item">
              <strong>Erros:</strong> {processamentoStatus.erros}
            </div>
            {processamentoStatus.status === 'processando' && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(processamentoStatus.processados / processamentoStatus.totalArquivos) * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultado do Processamento */}
      {processamentoResultado && (
        <div className="resultado-multiplo">
          <h3>Resultado do Processamento</h3>
          <div className="resultado-resumo">
            <p><strong>Total de arquivos:</strong> {processamentoResultado.totalArquivos}</p>
            <p><strong>Processados com sucesso:</strong> {processamentoResultado.processados - processamentoResultado.erros}</p>
            <p><strong>Erros:</strong> {processamentoResultado.erros}</p>
          </div>
          
          {processamentoResultado.resultados && (
            <div className="resultados-detalhados">
              <h4>Resultados Detalhados</h4>
              {processamentoResultado.resultados.map((resultado, index) => (
                <div key={index} className={`resultado-item ${resultado.status}`}>
                  <div className="resultado-header">
                    <strong>{resultado.originalname}</strong>
                    <span className={`status-badge ${resultado.status}`}>
                      {resultado.status === 'sucesso' && <FiCheckCircle />}
                      {resultado.status === 'erro' && <FiXCircle />}
                      {resultado.status}
                    </span>
                  </div>
                  {resultado.status === 'erro' && (
                    <div className="erro-detalhes">
                      <strong>Erro:</strong> {resultado.erro}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {processamentoResultado.dadosConsolidados && processamentoResultado.dadosConsolidados.fichaConsolidada && (
            <div className="result-container">
              <div className="result-title">
                <h3>Ficha Técnica Consolidada</h3>
                <p>Total de projetos processados: {processamentoResultado.dadosConsolidados.totalProjetos}</p>
              </div>
              
              <div className="ficha-tecnica">
                <div className="ficha-header">
                  <h4>Informações dos Projetos Consolidados</h4>
                  <p>Data de Processamento: {new Date(processamentoResultado.dataFim).toLocaleString()}</p>
                </div>
                
                <div className="ficha-body">
                  <div className="ficha-section">
                    <h4 className="ficha-section-title">Dados Consolidados</h4>
                    
                    {/* Informações Gerais */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais && (
                      <div className="ficha-subsection">
                        <h5>INFORMAÇÕES GERAIS</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">PAÍS:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.pais}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO DE PROJETO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.tipoProjeto}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">CONTRATANTE:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.contratante}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">POTÊNCIA INSTALADA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.potenciaInstalada}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VALOR DO CONTRATO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.valorContrato}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">INÍCIO DE OPERAÇÃO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.inicioOperacao}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">PERÍODO DE EXECUÇÃO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.periodoExecucao}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">DURAÇÃO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.duracao}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">OBJETO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.informacoesGerais.objeto}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Localização */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.localizacao && (
                      <div className="ficha-subsection">
                        <h5>LOCALIZAÇÃO</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">LATITUDE:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.localizacao.latitude}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">LONGITUDE:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.localizacao.longitude}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">RIO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.localizacao.rio}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">BACIA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.localizacao.bacia}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Desvio */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.desvio && (
                      <div className="ficha-subsection">
                        <h5>DESVIO</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.desvio.tipo}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VAZÃO DE DESVIO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.desvio.vazaoDesvio}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reservatório */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.reservatorio && (
                      <div className="ficha-subsection">
                        <h5>RESERVATÓRIO</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">N.A MÁXIMO NORMAL DE MONTANTE:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.reservatorio.naMaximoNormalMontante}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">ÁREA NO NÍVEL MÁXIMO NORMAL:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.reservatorio.areaNivelMaximoNormal}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VOLUME NO NÍVEL MÁXIMO NORMAL:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.reservatorio.volumeNivelMaximoNormal}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barragem Principal */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.barragemPrincipal && (
                      <div className="ficha-subsection">
                        <h5>BARRAGEM PRINCIPAL</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragemPrincipal.tipo}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">ALTURA MÁXIMA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragemPrincipal.alturaMaxima}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">COMPRIMENTO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragemPrincipal.comprimento}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VOLUME:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragemPrincipal.volume}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barragens Complementares */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.barragensComplementares && (
                      <div className="ficha-subsection">
                        <h5>BARRAGENS COMPLEMENTARES</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragensComplementares.tipo}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">COMPRIMENTO TOTAL:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragensComplementares.comprimentoTotal}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">ALTURA MÁXIMA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragensComplementares.alturaMaxima}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VOLUME TOTAL:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.barragensComplementares.volumeTotal}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vertedouro */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro && (
                      <div className="ficha-subsection">
                        <h5>VERTEDOURO</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro.tipo}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">NÚMERO DE VÃOS:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro.numeroVaos}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">COMPRIMENTO TOTAL:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro.comprimentoTotal}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">CAPACIDADE:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro.capacidade}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">TR:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.vertedouro.tr}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Casa de Força Principal */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal && (
                      <div className="ficha-subsection">
                        <h5>CASA DE FORÇA PRINCIPAL</h5>
                        <div className="ficha-grid">
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.tipo}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">NÚMERO DE UNIDADES GERADORAS:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.numeroUnidadesGeradoras}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">TIPO DE TURBINA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.tipoTurbina}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">POTÊNCIA UNITÁRIA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.potenciaUnitaria}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">RENDIMENTO:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.rendimento}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">QUEDA BRUTA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.quedaBruta}</div>
                          </div>
                          <div className="ficha-item">
                            <div className="ficha-item-label">VAZÃO MÁXIMA TURBINADA:</div>
                            <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.casaForcaPrincipal.vazaoMaximaTurbinada}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Materiais Utilizados */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.materiaisUtilizados && (
                      <div className="ficha-subsection">
                        <h5>MATERIAIS UTILIZADOS</h5>
                        <div className="ficha-grid">
                          {typeof processamentoResultado.dadosConsolidados.fichaConsolidada.materiaisUtilizados === 'object' ? (
                            Object.entries(processamentoResultado.dadosConsolidados.fichaConsolidada.materiaisUtilizados).map(([material, quantidade]) => (
                              <div key={material} className="ficha-item">
                                <div className="ficha-item-label">{material}:</div>
                                <div className="ficha-item-value">{quantidade}</div>
                              </div>
                            ))
                          ) : (
                            <div className="ficha-item">
                              <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.materiaisUtilizados}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Responsáveis Técnicos */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.responsaveisTecnicos && (
                      <div className="ficha-subsection">
                        <h5>RESPONSÁVEIS TÉCNICOS</h5>
                        <div className="ficha-item">
                          <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.responsaveisTecnicos}</div>
                        </div>
                      </div>
                    )}

                    {/* Observações Relevantes */}
                    {processamentoResultado.dadosConsolidados.fichaConsolidada.observacoesRelevantes && (
                      <div className="ficha-subsection">
                        <h5>OBSERVAÇÕES RELEVANTES</h5>
                        <div className="ficha-item">
                          <div className="ficha-item-value">{processamentoResultado.dadosConsolidados.fichaConsolidada.observacoesRelevantes}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {processamentoResultado.dadosConsolidados && processamentoResultado.dadosConsolidados.erro && (
            <div className="result-container">
              <div className="erro-consolidacao">
                <h4>Erro na Consolidação</h4>
                <p><strong>Erro:</strong> {processamentoResultado.dadosConsolidados.erro}</p>
              </div>
            </div>
          )}
        </div>
      )}
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
                
                {/* Informações Gerais */}
                {ficha.dadosAnalisados.informacoesGerais && (
                  <div className="ficha-subsection">
                    <h5>INFORMAÇÕES GERAIS</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">PAÍS:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.pais}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO DE PROJETO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.tipoProjeto}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">CONTRATANTE:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.contratante}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">POTÊNCIA INSTALADA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.potenciaInstalada}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VALOR DO CONTRATO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.valorContrato}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">INÍCIO DE OPERAÇÃO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.inicioOperacao}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">PERÍODO DE EXECUÇÃO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.periodoExecucao}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">DURAÇÃO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.duracao}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">OBJETO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.informacoesGerais.objeto}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Localização */}
                {ficha.dadosAnalisados.localizacao && (
                  <div className="ficha-subsection">
                    <h5>LOCALIZAÇÃO</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">LATITUDE:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.localizacao.latitude}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">LONGITUDE:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.localizacao.longitude}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">RIO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.localizacao.rio}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">BACIA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.localizacao.bacia}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desvio */}
                {ficha.dadosAnalisados.desvio && (
                  <div className="ficha-subsection">
                    <h5>DESVIO</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.desvio.tipo}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VAZÃO DE DESVIO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.desvio.vazaoDesvio}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reservatório */}
                {ficha.dadosAnalisados.reservatorio && (
                  <div className="ficha-subsection">
                    <h5>RESERVATÓRIO</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">N.A MÁXIMO NORMAL DE MONTANTE:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.reservatorio.naMaximoNormalMontante}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">ÁREA NO NÍVEL MÁXIMO NORMAL:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.reservatorio.areaNivelMaximoNormal}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VOLUME NO NÍVEL MÁXIMO NORMAL:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.reservatorio.volumeNivelMaximoNormal}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barragem Principal */}
                {ficha.dadosAnalisados.barragemPrincipal && (
                  <div className="ficha-subsection">
                    <h5>BARRAGEM PRINCIPAL</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragemPrincipal.tipo}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">ALTURA MÁXIMA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragemPrincipal.alturaMaxima}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">COMPRIMENTO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragemPrincipal.comprimento}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VOLUME:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragemPrincipal.volume}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barragens Complementares */}
                {ficha.dadosAnalisados.barragensComplementares && (
                  <div className="ficha-subsection">
                    <h5>BARRAGENS COMPLEMENTARES</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragensComplementares.tipo}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">COMPRIMENTO TOTAL:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragensComplementares.comprimentoTotal}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">ALTURA MÁXIMA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragensComplementares.alturaMaxima}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VOLUME TOTAL:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.barragensComplementares.volumeTotal}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vertedouro */}
                {ficha.dadosAnalisados.vertedouro && (
                  <div className="ficha-subsection">
                    <h5>VERTEDOURO</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.vertedouro.tipo}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">NÚMERO DE VÃOS:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.vertedouro.numeroVaos}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">COMPRIMENTO TOTAL:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.vertedouro.comprimentoTotal}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">CAPACIDADE:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.vertedouro.capacidade}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">TR:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.vertedouro.tr}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Casa de Força Principal */}
                {ficha.dadosAnalisados.casaForcaPrincipal && (
                  <div className="ficha-subsection">
                    <h5>CASA DE FORÇA PRINCIPAL</h5>
                    <div className="ficha-grid">
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.tipo}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">NÚMERO DE UNIDADES GERADORAS:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.numeroUnidadesGeradoras}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">TIPO DE TURBINA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.tipoTurbina}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">POTÊNCIA UNITÁRIA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.potenciaUnitaria}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">RENDIMENTO:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.rendimento}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">QUEDA BRUTA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.quedaBruta}</div>
                      </div>
                      <div className="ficha-item">
                        <div className="ficha-item-label">VAZÃO MÁXIMA TURBINADA:</div>
                        <div className="ficha-item-value">{ficha.dadosAnalisados.casaForcaPrincipal.vazaoMaximaTurbinada}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Materiais Utilizados */}
                {ficha.dadosAnalisados.materiaisUtilizados && (
                  <div className="ficha-subsection">
                    <h5>MATERIAIS UTILIZADOS</h5>
                    <div className="ficha-grid">
                      {typeof ficha.dadosAnalisados.materiaisUtilizados === 'object' ? (
                        Object.entries(ficha.dadosAnalisados.materiaisUtilizados).map(([material, quantidade]) => (
                          <div key={material} className="ficha-item">
                            <div className="ficha-item-label">{material}:</div>
                            <div className="ficha-item-value">{quantidade}</div>
                          </div>
                        ))
                      ) : (
                        <div className="ficha-item">
                          <div className="ficha-item-value">{ficha.dadosAnalisados.materiaisUtilizados}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Responsáveis Técnicos */}
                {ficha.dadosAnalisados.responsaveisTecnicos && (
                  <div className="ficha-subsection">
                    <h5>RESPONSÁVEIS TÉCNICOS</h5>
                    <div className="ficha-item">
                      <div className="ficha-item-value">{ficha.dadosAnalisados.responsaveisTecnicos}</div>
                    </div>
                  </div>
                )}

                {/* Observações Relevantes */}
                {ficha.dadosAnalisados.observacoesRelevantes && (
                  <div className="ficha-subsection">
                    <h5>OBSERVAÇÕES RELEVANTES</h5>
                    <div className="ficha-item">
                      <div className="ficha-item-value">{ficha.dadosAnalisados.observacoesRelevantes}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {ficha.textoExtraido && (
              <div className="ficha-section">
                <h4 className="ficha-section-title">Amostra do Texto Extraído</h4>
                <div className="text-preview">{ficha.textoExtraido}</div>
              </div>
            )}
            {ficha.textoFormatado && (
              <div className="ficha-section">
                <h4 className="ficha-section-title">Dados Extraídos</h4>
                <div className="text-preview">
                  <ReactMarkdown>{ficha.textoFormatado}</ReactMarkdown>
                </div>
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
        {renderUploadMultiple()}
        {renderArquivos()}
      </div>
      
      {renderFichaTecnica()}
    </div>
  );
}

export default App;
