import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';
import logo from '../assets/logo.png';

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGenerateContent = () => {
    navigate('/generate');
  };

  const handleAnalyzeCompetitors = () => {
    navigate('/competitors');
  };

  const handlePolicyCheck = () => {
    console.log('Navigate to policy compliance check page');
  };

  return (
    <div className="main-page">
      <div className="logo-container">
        <img src={logo} alt="Staycast logo" className="logo-image" />
      </div>
      
      <div className="welcome-text">
        <h1>Welcome to <span className="highlight">Slaycast</span></h1>
        <p className="tagline">Create once. Stay everywhere.</p>
      </div>
      
      <div className="action-buttons">
        <button className="analyze-button" onClick={handleAnalyzeCompetitors}>
          analyze competitors
        </button>
        <button className="generate-button" onClick={handleGenerateContent}>
          generate content
        </button>
        <button className="policy-button" onClick={handlePolicyCheck}>
          policy compliance check
        </button>
      </div>
    </div>
  );
};

export default MainPage;