
import React, { useState, useMemo } from 'react';
import { CartItem } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, items, onRemove }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.part.standardName.includes(searchTerm) || 
      item.part.oeNumber.includes(searchTerm) ||
      item.selectedPrice.brand.includes(searchTerm)
    );
  }, [items, searchTerm]);

  const totalPrice = useMemo(() => {
    return items.reduce((acc, item) => acc + item.selectedPrice.saleExclTax, 0);
  }, [items]);

  const exportInternal = () => {
    alert('正在生成 [内部采购细则单] (包含进价、利润分析)...');
    console.log('Internal Report:', items);
  };

  const exportCustomer = () => {
    alert('正在生成 [客户报价单] (仅包含售价及基本说明)...');
    console.log('Customer Report:', items.map(i => ({ 
      part: i.part.standardName, 
      oe: i.part.oeNumber, 
      price: i.selectedPrice.saleExclTax 
    })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-cart-flatbed text-blue-600 text-lg"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">采购清单管理</h2>
              <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Selected Parts Procurement List</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="筛选清单内容..." 
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fa-solid fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"></i>
            </div>
            <button onClick={onClose} className="w-10 h-10 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
              <i className="fa-solid fa-xmark text-gray-400 text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          {filteredItems.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/50 text-gray-500 text-[11px] font-black uppercase tracking-widest border-b border-gray-200">
                  <th className="px-4 py-3 w-16 text-center">#</th>
                  <th className="px-4 py-3">零件信息 (OE/名称)</th>
                  <th className="px-4 py-3">品牌厂商</th>
                  <th className="px-4 py-3 text-right">内部进价</th>
                  <th className="px-4 py-3 text-right text-blue-600">外部报价 (未税)</th>
                  <th className="px-4 py-3 text-right text-blue-700">外部报价 (含税)</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4 text-center text-gray-400 font-mono">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-blue-700 font-mono tracking-tight">{item.part.oeNumber}</span>
                        <span className="text-xs font-bold text-gray-800">{item.part.standardName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700">{item.selectedPrice.brand}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{item.selectedPrice.manufacturer}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-gray-400">¥{item.selectedPrice.costExclTax.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-blue-600">¥{item.selectedPrice.saleExclTax.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-blue-800 bg-blue-50/30">¥{item.selectedPrice.saleInclTax.toFixed(2)}</td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => onRemove(item.id)}
                        className="w-8 h-8 rounded bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
              <i className="fa-solid fa-clipboard-list text-6xl text-gray-300"></i>
              <div className="text-center">
                <p className="text-lg font-black text-gray-800">采购清单空空如也</p>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Your shopping cart is currently empty</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-6 py-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Selection</span>
              <span className="text-xl font-black text-gray-800">{items.length} <span className="text-xs font-medium text-gray-400 ml-1 uppercase">Items</span></span>
            </div>
            <div className="w-[1px] h-8 bg-gray-300"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Total (Excl. Tax)</span>
              <span className="text-2xl font-black text-blue-700">¥{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button 
              onClick={exportInternal}
              disabled={items.length === 0}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${
                items.length > 0 ? 'bg-[#1a202c] text-white hover:bg-black shadow-gray-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-file-invoice-dollar"></i>
              <span>导出内部采购单</span>
            </button>
            <button 
              onClick={exportCustomer}
              disabled={items.length === 0}
              className={`flex items-center space-x-2 px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 ${
                items.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-file-export"></i>
              <span>生成客户报价单</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartModal;
