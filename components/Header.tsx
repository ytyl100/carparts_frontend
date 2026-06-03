
import React from 'react';

interface HeaderProps {
  currentUser: string | null;
  onLogout: () => void;
  onLoginClick: () => void;
  onManageClick?: () => void;
  onSearchClick?: () => void;
  onHomeClick?: () => void;
  isAdmin?: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onLoginClick, onManageClick, onSearchClick, onHomeClick, isAdmin = false }) => {
  return (
    <header className="bg-[#0c2d48] text-white px-6 py-3 flex items-center justify-between shadow-lg z-50">
      <div className="flex items-center space-x-8">
        <div className="text-2xl font-black tracking-tighter italic flex items-center">
          <span className="bg-blue-600 px-2 rounded mr-1 not-italic">云舟</span>
          <span>库存系统</span>
        </div>
        <nav className="flex space-x-6 text-sm">
          <button onClick={onHomeClick} className="opacity-100 font-bold border-b-2 border-blue-500 pb-1 tracking-widest uppercase">首页 / Home</button>
        </nav>
      </div>
      
      <div className="flex items-center space-x-6">
        {currentUser && (
          <button
            onClick={onSearchClick}
            className="px-4 py-1.5 bg-white text-[#0c2d48] font-black uppercase tracking-[0.08em] rounded-full shadow hover:shadow-md"
          >
            搜索
          </button>
        )}
        <div className="hidden md:flex items-center space-x-2 bg-blue-900/40 px-3 py-1 rounded-full border border-blue-700/50 text-[10px] font-bold uppercase tracking-widest">
          <i className="fa-solid fa-bolt text-yellow-400 animate-pulse"></i>
          <span className="text-blue-200">System Online</span>
          <span className="text-white">41KB/s</span>
        </div>

        {currentUser ? (
          <div className="flex items-center space-x-4">
            {isAdmin && onManageClick && (
              <button 
                onClick={onManageClick}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black uppercase tracking-[0.1em] rounded-full shadow-lg shadow-orange-900/40 transition-all active:scale-95"
              >
                <i className="fa-solid fa-gear mr-1"></i>
                分类管理
              </button>
            )}
            <div className="flex items-center space-x-3 bg-white/5 pl-1 pr-4 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-default">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-black uppercase text-xs shadow-inner">
                {currentUser.charAt(0)}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black tracking-tight">{currentUser}</span>
                <span className="text-[9px] text-blue-300/60 font-bold uppercase tracking-tighter">Premium Access</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-400 transition-colors"
            >
              退出 / Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={onLoginClick}
            className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-blue-900/40 transition-all active:scale-95"
          >
            登录 / Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
