import { stacks } from '../data/profile'
import styles from './TechStack.module.css'

export default function TechStack() {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">TECH STACK</h2>
      </div>
      <dl className={styles.legend}>
        {stacks.map((group) => (
          <div className={styles.row} key={group.category}>
            <dt className={styles.category}>{group.category}</dt>
            <dd className={`mono ${styles.items}`}>
              {group.items.map((item) => (
                <span className={styles.item} key={item}>
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
