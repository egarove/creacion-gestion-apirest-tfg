import { useState } from 'react';
import { auth, firebaseAuth } from '../services/LogInService';
import type { Api } from '../types';
import { UserModal } from './UserModal';

interface SidebarProps {
  apis: Api[];
  runCount: number;
  stopCount: number;
  epsCount: number;
  onRefresh: () => void;
  onNewApi: () => void;
}

export default function Sidebar({ apis, runCount, stopCount, epsCount, onRefresh, onNewApi }: SidebarProps) {
  const [userModal, setUserModal] = useState(false);
  return (
    <aside className="fixed top-0 left-0 w-[270px] h-screen bg-surface border-r border-borderNormal flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center gap-3 border-b border-borderNormal">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center text-white shrink-0">
          <i className="fas fa-bolt text-lg"></i>
        </div>
        <div>
          <div className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">APIGen Master</div>
          <div className="text-xs text-textMuted mt-0.5">Console v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 no-scrollbar">
        <div className="text-[10px] font-bold tracking-widest text-textMuted uppercase px-3 py-2 mt-2">Principal</div>
        <button className="flex items-center w-full gap-3 px-4 py-3 rounded-xl bg-primaryGlow text-white mb-1 transition-colors text-sm font-medium text-left">
          <i className="fas fa-th-large w-5 text-center text-primary"></i> Dashboard
          <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{apis.length}</span>
        </button>
        <a href="/docs" target="_blank" className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
          <i className="fas fa-book-open w-5 text-center"></i> Swagger UI
        </a>
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
        <div className="flex justify-between py-1.5 text-xs text-textSoft">
          <span><i className="fas fa-circle text-[10px] text-success mr-2"></i>En ejecución</span>
          <span className="font-bold text-success">{runCount}</span>
        </div>
        <div className="flex justify-between py-1.5 text-xs text-textSoft">
          <span><i className="fas fa-circle text-[10px] text-danger mr-2"></i>Detenidas</span>
          <span className="font-bold text-danger">{stopCount}</span>
        </div>
        <div className="flex justify-between py-1.5 text-xs text-textSoft">
          <span><i className="fas fa-code-branch text-[10px] text-primary mr-2"></i>Endpoints</span>
          <span className="font-bold text-textMain">{epsCount}</span>
        </div>
        <div className='flex flex-row w-full gap-4 py-2 mt-2'>
          {userModal && <UserModal user={auth.currentUser} onClose={() => setUserModal(false)} onConfirm={() => setUserModal(false)} />}
          <button onClick={firebaseAuth.logOut} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-sign-out-alt w-5 text-center text-red-500"></i> Salir
          </button>
          <button onClick={() => setUserModal(true)} className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-textSoft hover:bg-white/5 hover:text-textMain mb-1 transition-colors text-sm font-medium text-left">
            <i className="fas fa-user w-5 text-center"></i> Usuario 
          </button>
        </div>
      </div>
    </aside>
  );
}
