import type { ComponentPropsWithoutRef } from 'react'

type Props = ComponentPropsWithoutRef<'a'> & { href: string }

/**
 * 別タブで開く外部リンク。14 箇所あって rel の書き忘れが起きうるので、外へ出る
 * リンクはすべてここを通す。強制するのは target と rel だけで、あとは素の <a>。
 */
export default function ExternalLink({ href, children, ...rest }: Props) {
  return (
    <a {...rest} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}
