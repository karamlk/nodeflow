import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import NodeFlowPage from './pages/NodeFlowPage';
import ChatPage from './pages/ChatPage';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nodeflow" element={<NodeFlowPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
