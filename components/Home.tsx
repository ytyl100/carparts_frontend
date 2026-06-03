
import React, { useState, useEffect } from 'react';

interface HomeProps {
  onStart: () => void;
}

const BANNER_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1600',
    title: '海量现货库',
    subtitle: '覆盖全球主流车型，正品保证，实时同步'
  },
  {
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1600',
    title: '精准OE匹配',
    subtitle: '专业的爆炸图索引，告别错发漏发'
  },
  {
    url: 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=1600',
    title: '极速物流配送',
    subtitle: '云舟仓储系统赋能，下单即发，售后无忧'
  }
];

const Home: React.FC<HomeProps> = ({ onStart }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col bg-white min-h-full">
      {/* Hero Banner Section */}
      <div className="relative h-[480px] overflow-hidden group">
        {BANNER_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{ transitionProperty: 'opacity, transform' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
            <img src={img.url} className="w-full h-full object-cover" alt={img.title} />
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-20">
              <h2 className="text-white text-6xl font-black mb-4 tracking-tighter animate-in slide-in-from-left duration-700">
                {img.title}
              </h2>
              <p className="text-gray-200 text-xl font-medium max-w-xl mb-8 animate-in slide-in-from-left delay-150 duration-700">
                {img.subtitle}
              </p>
              <button
                onClick={onStart}
                className="w-fit px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-full shadow-2xl shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center space-x-3"
              >
                <span>进入配件查询中心</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-20 z-30 flex space-x-2">
          {BANNER_IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 transition-all rounded-full ${
                idx === currentSlide ? 'w-12 bg-blue-500' : 'w-4 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Intro Stats Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 w-full grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-boxes-stacked text-3xl text-blue-600"></i>
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">1,000,000+ 在库零件</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            实时库存动态更新，整合全国分中心货位信息，确保每一件商品都有迹可循。
          </p>
        </div>
        
        <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-microchip text-3xl text-indigo-600"></i>
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">智能大数据匹配</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            基于最新的EPC数据接口，实现精准到车架号(VIN)的零部件匹配，减少错订率。
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-handshake-angle text-3xl text-emerald-600"></i>
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">全链路供应链协同</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            打通供应商、仓库、物流到门店的每一个环节，实现透明化的采购流程体验。
          </p>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-blue-500 font-black uppercase tracking-widest text-xs mb-4 block">WHY CHOOSE US</span>
          <h2 className="text-4xl font-black mb-8">云舟库存系统 - 让每一次维修都精准高效</h2>
          <p className="text-gray-400 leading-relaxed max-w-3xl mx-auto mb-12">
            我们致力于为汽车后市场提供最专业的数字化库存解决方案。通过云舟系统，您可以轻松查找数百万种电动汽车及传统车型的零配件，
            查看详细的爆炸图说明、实时价格对比以及替换件建议。
          </p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={onStart}
              className="px-10 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-xl"
            >
              即刻开始查询
            </button>
            <button className="px-10 py-3 bg-gray-800 text-gray-300 font-bold rounded-full border border-gray-700 hover:border-gray-500 transition-all">
              了解更多功能
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
