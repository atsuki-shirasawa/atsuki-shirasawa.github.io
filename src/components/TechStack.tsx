import { stacks } from '../data/profile'

export default function TechStack() {
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">TECH STACK</h2>
      </div>
      <dl>
        {stacks.map((group) => (
          <div className="section-row py-3 max-narrow:gap-1" key={group.category}>
            <dt className="text-label font-semibold text-fg">{group.category}</dt>
            {/* 1 語ずつを折り返しの単位にする。地の文として並べると、
                中黒の前後に改行の機会がなく行が縮まなくなる */}
            <dd className="mono flex flex-wrap items-baseline gap-y-1 text-note leading-prose text-muted">
              {group.items.map((item) => (
                <span
                  className="after:px-1.5 after:text-line after:content-['·'] last:after:content-none"
                  key={item}
                >
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
