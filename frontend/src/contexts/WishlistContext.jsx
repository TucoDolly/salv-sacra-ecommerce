import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { listarFavoritos, sincronizarFavoritosApi, toggleFavoritoApi } from '../services/contaService';
import api from '../services/api';

const WishlistContext = createContext({});

const STORAGE_KEY = '@SalvSacra:favoritos';

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [favoritoIds, setFavoritoIds] = useState(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(salvo) ? salvo.map(Number) : [];
    } catch {
      return [];
    }
  });
  const [favoritosProdutos, setFavoritosProdutos] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const salvarLocal = (ids) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  };

  const carregarFavoritos = useCallback(async () => {
    setLoadingWishlist(true);
    try {
      if (isAuthenticated) {
        // Se havia favoritos locais de visitante, sincroniza com a conta do usuário
        const locais = (() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(Number).filter(Boolean);
          } catch {
            return [];
          }
        })();

        let res;
        if (locais.length > 0) {
          res = await sincronizarFavoritosApi(locais);
        } else {
          res = await listarFavoritos();
        }

        const lista = res.data || [];
        setFavoritosProdutos(lista);
        const ids = lista.map((p) => Number(p.id));
        setFavoritoIds(ids);
        salvarLocal(ids);
      } else {
        // Visitante não autenticado: busca os produtos correspondentes aos IDs do localStorage
        const locais = (() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(Number).filter(Boolean);
          } catch {
            return [];
          }
        })();
        setFavoritoIds(locais);

        if (locais.length > 0) {
          const { data } = await api.get('/produtos');
          const filtrados = (data || []).filter((p) => locais.includes(Number(p.id)));
          setFavoritosProdutos(filtrados);
        } else {
          setFavoritosProdutos([]);
        }
      }
    } catch {
      // fallback silencioso
    } finally {
      setLoadingWishlist(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    carregarFavoritos();
  }, [carregarFavoritos]);

  const isFavorite = useCallback(
    (produtoId) => favoritoIds.includes(Number(produtoId)),
    [favoritoIds]
  );

  const toggleFavorite = useCallback(
    async (produtoOuId) => {
      const prodObj = typeof produtoOuId === 'object' && produtoOuId !== null ? produtoOuId : null;
      const pid = Number(prodObj ? prodObj.id : produtoOuId);
      if (!pid) return false;

      const jaFavorito = favoritoIds.includes(pid);
      const novosIds = jaFavorito ? favoritoIds.filter((id) => id !== pid) : [...favoritoIds, pid];

      // Atualização otimista imediata na UI
      setFavoritoIds(novosIds);
      salvarLocal(novosIds);

      if (jaFavorito) {
        setFavoritosProdutos((prev) => prev.filter((p) => Number(p.id) !== pid));
      } else if (prodObj) {
        setFavoritosProdutos((prev) => [prodObj, ...prev.filter((p) => Number(p.id) !== pid)]);
      }

      if (isAuthenticated) {
        try {
          await toggleFavoritoApi(pid);
          if (!jaFavorito && !prodObj) {
            carregarFavoritos();
          }
        } catch {
          // Reverte se houver falha na API
          carregarFavoritos();
        }
      } else if (!jaFavorito && !prodObj) {
        carregarFavoritos();
      }

      return !jaFavorito;
    },
    [favoritoIds, isAuthenticated, carregarFavoritos]
  );

  return (
    <WishlistContext.Provider
      value={{
        favoritoIds,
        favoritosProdutos,
        totalFavoritos: favoritoIds.length,
        loadingWishlist,
        isFavorite,
        toggleFavorite,
        carregarFavoritos,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}

