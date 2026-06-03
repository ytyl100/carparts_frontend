import React, { useState } from "react";
import { MockApiClient } from "../services/repositoryClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string, isAdmin: boolean) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert("请输入账号和密码");
      return;
    }

    setIsLoading(true);

    MockApiClient.adminLogin({ username, password })
      .then((res) => {
        setIsLoading(false);
        const isAdmin = res.roles.some((role) => role.roleName === "admin");
        onLoginSuccess(res.name, isAdmin);
        onClose();
      })
      .catch((err) => {
        setIsLoading(false);
        alert("登录失败，请检查账号密码");
      });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0c2d48]/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-200">
            <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            {isRegister ? "创建新账户" : "验证您的身份"}
          </h2>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mt-1">
            {isRegister
              ? "Join Cloud-Boat Ecosystem"
              : "Cloud-Boat Secure Access"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              用户角色 / User Role
            </label>
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setIsAdminRole(false)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isAdminRole ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              >
                普通用户 / Standard
              </button>
              <button
                type="button"
                onClick={() => setIsAdminRole(true)}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isAdminRole ? "bg-orange-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              >
                管理员 / Administrator
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              账号 / Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入您的账号"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
              />
              <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              密码 / Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入登录密码"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
              />
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl text-white text-xs font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 ${
              isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : isAdminRole
                  ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            }`}
          >
            {isLoading ? (
              <i className="fa-solid fa-circle-notch animate-spin"></i>
            ) : (
              <span>{isRegister ? "立即注册" : "安全登录"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
