import Hero from '../components/Hero'
import Career from '../components/Career'
import TechStack from '../components/TechStack'
import GitHubActivity from '../components/GitHubActivity'
import Writing from '../components/Writing'
import Talks from '../components/Talks'
import { siteTitle } from '../data/profile'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Home() {
  usePageTitle(siteTitle)

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
