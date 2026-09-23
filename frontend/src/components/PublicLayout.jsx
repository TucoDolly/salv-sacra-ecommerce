import { Outlet } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

/**
 * PublicLayout — wrapper da Vitrine Pública.
 * Reutiliza o MainLayout existente (header com topbar, navbar, footer completo)
 * e renderiza o conteúdo da rota filha via <Outlet />.
 */
export default function PublicLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
