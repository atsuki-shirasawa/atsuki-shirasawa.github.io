import { useEffect } from 'react'
import Hero from '../components/Hero'
import Career from '../components/Career'
import TechStack from '../components/TechStack'
import GitHubActivity from '../components/GitHubActivity'
import Writing from '../components/Writing'
import Talks from '../components/Talks'

export default function Home() {
  useEffect(() => {
    document.title = 'Atsuki Shirasawa — Machine Learning Engineer'
  }, [])

  return (
    <div className="wrap">
      <Hero />
      <Career />
      {/* 成果物を先に見せる。CAREER は Hero の道から地続きなので位置は動かさない */}
      <Talks />
      <TechStack />
      <GitHubActivity />
      <Writing />
    </div>
  )
}
