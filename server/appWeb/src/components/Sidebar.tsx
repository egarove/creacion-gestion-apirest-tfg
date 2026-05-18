import { useState } from 'react';
import { firebaseAuth } from '../services/LogInService';
import type { Panels } from '../types';
import { UserModal } from './modals/UserModal';
import { auth } from '../FirebaseConfig';
import { useNavigate } from 'react-router-dom';
import AlertModal from './modals/AlertModal';
import { useContextStore } from '../contextZustand';
import { firebaseServiceUser } from '../services/FireStoreService';

interface SidebarProps {
  onRefresh: () => void;
  onNewApi: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ onRefresh, onNewApi, isOpen, onClose }: SidebarProps) {
  const context = useContextStore();
  const [userModal, setUserModal] = useState(false);
  const navigate = useNavigate();
  const [alertModal, setAlertModal] = useState(false);

  const handleSectionChange = (section: Panels) => {
    context.setSelectedView(section);
  };
  const handleLogout = async () => {
    await firebaseAuth.logOut();
    context.addToast({ msg: 'Sesión cerrada correctamente', type: 'success', id: crypto.randomUUID() })
    context.clearUser();
    context.clearApis();
    firebaseServiceUser.setCollection("");
    context.setUserApisPath("");
    context.setSelectedView("dashboard");
    setUserModal(false);
    navigate("/");
  };

  const handleChangePassword = async (current: string, newPass: string, confirm: string) => {
    try {
      const result = await firebaseAuth.changePasswdWithLastPasswd(auth.currentUser, newPass, current, confirm);
      if (result) {
        context.addToast({ msg: 'Contraseña actualizada correctamente', type: 'success', id: crypto.randomUUID() });
        setUserModal(false);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  return (
    <>
      {/* Backdrop móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[45] md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed top-0 left-0 w-[270px] h-screen bg-surface border-r border-borderNormal flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center gap-3 border-b border-borderNormal">
        <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain shrink-0" />
        <div>
          <div className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">APIGen Master</div>
          <div className="text-xs text-textMuted mt-0.5">{context.user?.role === 'admin' ? 'Admin' : 'User'} Console v1.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <div className="text-[10px] font-bold tracking-widest text-textMuted uppercase px-3 py-2 mt-2">Principal</div>
        <button
          onClick={() => handleSectionChange('dashboard')}
          className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-sm font-medium text-left ${context.selectedView === 'dashboard'
            ? 'bg-primaryGlow text-white shadow-lg shadow-primary/30'
            : 'text-textSoft hover:bg-white/5 hover:text-textMain'
            }`}
        >
          <i className={`fas fa-th-large w-5 text-center ${context.selectedView === 'dashboard' ? 'text-white' : 'text-textMuted'
            }`}></i> Dashboard
          <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{context.apis.length}</span>
        </button>
        <a href="/docs" target="_blank" className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
          <i className="fas fa-book-open w-5 text-center"></i> Swagger UI
        </a>
        {context.user?.role === 'admin' && (
          <button
            onClick={() => handleSectionChange('adminPanel')}
            className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl mb-1 transition-all text-sm font-medium text-left ${context.selectedView === 'adminPanel'
              ? 'bg-primaryGlow text-white shadow-lg shadow-primary/30'
              : 'text-textSoft hover:bg-white/5 hover:text-textMain'
              }`}
          >
            <i className={`fas fa-users w-5 text-center ${context.selectedView === 'adminPanel' ? 'text-white' : 'text-textMuted'
              }`}></i> Panel de Administrador
          </button>
        )}
        <div className="text-[10px] font-bold tracking-widest text-textMuted uppercase px-3 py-2 mt-4">Herramientas</div>
        <button onClick={onRefresh} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
          <i className="fas fa-sync-alt w-5 text-center"></i> Refrescar todo
        </button>
        <button onClick={onNewApi} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
          <i className="fas fa-plus-circle w-5 text-center"></i> Nueva API
        </button>
      </nav>

      {/* Stats footer */}
      <div className="p-5 border-t border-borderNormal">
        <div className='flex flex-row w-full gap-4 py-2'>
          <button onClick={() => setAlertModal(true)} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-sign-out-alt w-5 text-center text-red-500"></i> Salir
          </button>
          <button onClick={() => setUserModal(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-user w-5 text-center"></i>
          </button>
        </div>
      </div>
    </aside>
    {alertModal && <AlertModal message="¿Estás seguro de que quieres cerrar sesión?" onConfirm={() => { handleLogout(); setAlertModal(false); }} onCancel={() => setAlertModal(false)} />}
    {userModal && <UserModal user={auth.currentUser} onClose={() => setUserModal(false)} onConfirm={handleChangePassword} />}
    </>
  );
}
