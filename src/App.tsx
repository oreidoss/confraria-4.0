import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateEventPage from './pages/CreateEventPage';
import EventHistoryPage from './pages/EventHistoryPage';
import EventDetailsPage from './pages/EventDetailsPage';
import ParticipantsPage from './pages/ParticipantsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/criar-evento" element={<CreateEventPage />} />
          <Route path="/historico" element={<EventHistoryPage />} />
          <Route path="/evento/:id" element={<EventDetailsPage />} />
          <Route path="/participantes" element={<ParticipantsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;