// src/App.tsx
import React from 'react';
import OCR from './components/ocr';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <OCR />
    </div>
  );
};

export default App;
