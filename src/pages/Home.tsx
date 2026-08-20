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
    <div className="container">
      <Hero />
      <Career />
      <TechStack />
      <GitHubActivity />
      <Writing />
      <Talks />
    </div>
  )
}
