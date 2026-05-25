import React from 'react';
import HeroSection from '../components/home/HeroSection';
import StatsBar from '../components/home/StatsBar';
import RecentAnnonces from '../components/home/RecentAnnonces';
import HowItWorks from '../components/home/HowItWorks';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <HeroSection />
      <StatsBar />
      <RecentAnnonces />
      <HowItWorks />
    </div>
  );
}
