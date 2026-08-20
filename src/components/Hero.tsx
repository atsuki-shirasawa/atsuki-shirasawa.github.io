import { Link } from 'react-router-dom'
import CareerTrack from './CareerTrack'
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
          <a
            className={styles.avatarLink}
            href={profile.links.github}
            target="_blank"
            rel="noreferrer"
            title={`github.com/${github.login}`}
          >
            <img
              className={styles.avatar}
              src={github.avatarUrl}
              alt={`${profile.name}'s GitHub avatar`}
              width={200}
              height={200}
            />
          </a>
        )}
      </div>

      <CareerTrack />

      <div className={styles.actions}>
        <Link className={`${styles.button} ${styles.buttonPrimary}`} to="/slides">
          Slides <span aria-hidden="true">→</span>
        </Link>
        <a
          className={`${styles.button} ${styles.buttonOutline} ${styles.buttonZenn}`}
          href={profile.links.zenn}
          target="_blank"
          rel="noreferrer"
        >
          <ZennIcon size={15} />
          Zenn
        </a>
        <a
          className={`${styles.button} ${styles.buttonOutline} ${styles.buttonQiita}`}
          href={profile.links.qiita}
          target="_blank"
          rel="noreferrer"
        >
          <QiitaIcon size={15} />
          Qiita
        </a>
      </div>
    </section>
  )
}
