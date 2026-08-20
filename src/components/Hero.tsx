import { Link } from 'react-router-dom'
import CareerTrack from './CareerTrack'
import ExternalLink from './ExternalLink'
import { github } from '../data/content'
import { profile } from '../data/profile'
import { QiitaIcon, ZennIcon } from './icons/BrandIcons'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.intro}>
        <div className={styles.text}>
          <p className={`mono ${styles.eyebrow}`}>{profile.eyebrow}</p>
          <h1 className={styles.name}>{profile.name}</h1>
          <p className={styles.lead}>{profile.lead}</p>
          <p className={styles.support}>{profile.support}</p>
        </div>

        {github.avatarUrl && (
          <ExternalLink
            className={styles.avatarLink}
            href={profile.links.github}
            title={`github.com/${github.login}`}
          >
            <img
              className={styles.avatar}
              src={github.avatarUrl}
              alt={`${profile.name}'s GitHub avatar`}
              width={200}
              height={200}
            />
          </ExternalLink>
        )}
      </div>

      <CareerTrack />

      <div className={styles.actions}>
        <Link className={`${styles.button} ${styles.buttonPrimary}`} to="/slides">
          Slides <span aria-hidden="true">→</span>
        </Link>
        <ExternalLink
          className={`${styles.button} ${styles.buttonOutline} ${styles.buttonZenn}`}
          href={profile.links.zenn}
        >
          <ZennIcon size={15} />
          Zenn
        </ExternalLink>
        <ExternalLink
          className={`${styles.button} ${styles.buttonOutline} ${styles.buttonQiita}`}
          href={profile.links.qiita}
        >
          <QiitaIcon size={15} />
          Qiita
        </ExternalLink>
      </div>
    </section>
  )
}
