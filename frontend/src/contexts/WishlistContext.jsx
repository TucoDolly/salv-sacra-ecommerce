import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { listarFavoritos, toggleFavoritoApi } from '../services/contaService';

const WishlistContext = createContext({});

const STORAGE_KEY = '@SalvSacra:favoritos';

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [favoritoIds, setFavoritoIds] = useState([]);
  const [favoritosProdutos, setFavoritosProdutos] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const carregarFavoritos = useCallback(async () => {
    // Limpa qualquer cache local legado de visitantes
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    if (!isAuthenticated) {
      setFavoritoIds([]);
      setFavoritosProdutos([]);
      return;
    }

    setLoadingWishlist(true);
    try {
      const res = await listarFavoritos();
      const lista = res.data || [];
      setFavoritosProdutos(lista);
      const ids = lista.map((p) => Number(p.id));
      setFavoritoIds(ids);
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
    (produtoId) => isAuthenticated && favoritoIds.includes(Number(produtoId)),
    [isAuthenticated, favoritoIds]
  );

  const toggleFavorite = useCallback(
    async (produtoOuId) => {
      if (!isAuthenticated) {
        return null;
      }

      const prodObj = typeof produtoOuId === 'object' && produtoOuId !== null ? produtoOuId : null;
      const pid = Number(prodObj ? prodObj.id : produtoOuId);
      if (!pid) return false;

      const jaFavorito = favoritoIds.includes(pid);
      const novosIds = jaFavorito ? favoritoIds.filter((id) => id !== pid) : [...favoritoIds, pid];

      // Atualização otimista imediata na UI
      setFavoritoIds(novosIds);

      if (jaFavorito) {
        setFavoritosProdutos((prev) => prev.filter((p) => Number(p.id) !== pid));
      } else if (prodObj) {
        setFavoritosProdutos((prev) => [prodObj, ...prev.filter((p) => Number(p.id) !== pid)]);
      }

      try {
        await toggleFavoritoApi(pid);
        if (!jaFavorito && !prodObj) {
          carregarFavoritos();
        }
      } catch {
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
        totalFavoritos: isAuthenticated ? favoritoIds.length : 0,
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
