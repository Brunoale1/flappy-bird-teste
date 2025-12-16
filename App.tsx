import React from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <GameCanvas />
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Pressione <span className="text-gray-200 border border-gray-600 px-1 rounded bg-gray-800">Espaço</span> ou toque na tela para voar.</p>
          <p className="mt-2 text-xs opacity-50">Desenvolvido com React Canvas API</p>
        </div>
      </div>
    </div>
  );
};

export default App;