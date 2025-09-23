import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { OAuthPage } from './components/OAuthPage';
import { OAuthCallback } from './components/OAuthCallback';
import { DocumentationPage } from './components/DocumentationPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <div className="app min-h-screen bg-white">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/oauth" element={<OAuthPage />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/documentation" element={<DocumentationPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App
