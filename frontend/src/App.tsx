import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import SimulationsManager from './pages/SumulationsList/SimulationsList';
import CreateSimulation from './pages/CreateSimulation/CreateSimulation';

function App() {
  const location = useLocation();
  
  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-container">
          <a href="/" className="nav-brand">
            🏭 Симулятор Производства
          </a>
          <div className="nav-links">
            <a 
              href="/list" 
              className={`nav-link ${location.pathname === '/list' ? 'active' : ''}`}
            >
              📋 Список симуляций
            </a>
            <a 
              href="/create_simulation" 
              className={`nav-link ${location.pathname === '/create_simulation' ? 'active' : ''}`}
            >
              🛠️ Создать симуляцию
            </a>
          </div>
        </div>
      </nav>

      <main className={`app-main ${location.pathname === '/create_simulation' ? 'full-width' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/list" replace />} />
          <Route path="/list" element={<SimulationsManager />} />
          <Route path="/create_simulation" element={<CreateSimulation />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>© 2024 Симулятор производственных процессов. Все права защищены.</p>
      </footer>
    </div>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;