
import React, { useState, useEffect, useCallback } from 'react';
import { AppView } from './types';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ImageLabView from './components/ImageLabView';
import VideoStudioView from './components/VideoStudioView';
import LiveOmniView from './components/LiveOmniView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.CHAT);

  const renderView = () => {
    switch (activeView) {
      case AppView.CHAT:
        return <ChatView />;
      case AppView.IMAGE_LAB:
        return <ImageLabView />;
      case AppView.VIDEO_STUDIO:
        return <VideoStudioView />;
      case AppView.LIVE_OMNI:
        return <LiveOmniView />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
