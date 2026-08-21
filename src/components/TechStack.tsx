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
            {/* 左列は CAREER の年と同じ扱い。分類はラベルなので、重みは中身に置く */}
            <dt className="text-label text-muted">{group.category}</dt>
            {/* 1 語ずつを折り返しの単位にする。地の文として並べると、
                中黒の前後に改行の機会がなく行が縮まなくなる */}
            <dd className="font-mono flex flex-wrap items-baseline gap-y-1 text-body leading-prose text-fg">
              {group.items.map((item) => (
                /*
                 * 中黒は残す。mono の空白は 14px で 8.4px あるので、余白だけでは
                 * 2 語の項目（Google Cloud、Vertex AI、GitHub Actions）の境目が
                 * 語の間と見分けられない。色は --line から上げて区切りとして読ませる
                 */
                <span
                  className="after:px-2 after:text-faint after:content-['·'] last:after:content-none"
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
