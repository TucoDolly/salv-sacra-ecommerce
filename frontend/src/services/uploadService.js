import api from './api';

/**
 * Envia uma foto/imagem para o backend e retorna a URL acessível.
 * @param {File} file
 * @returns {Promise<string>} URL da imagem salva
 */
export async function uploadArquivoImagem(file) {
  const formData = new FormData();
  formData.append('arquivo', file);

  const { data } = await api.post('/admin/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.url;
}

