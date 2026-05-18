import { Cards } from 'nextra/components'
import { Icon } from '../components/Icon'

const cards = [
  {
    icon: 'bun',
    title: 'Bun',
    href: 'https://bun.sh/docs',
  },
  {
    icon: 'nextra',
    title: 'Nextra',
    href: 'https://nextra.site/docs/docs-theme',
  },
  {
    icon: 'wxt',
    title: 'WXT',
    href: 'https://wxt.dev/guide/introduction.html',
  },
  {
    icon: 'elysiajs',
    title: 'ElysiaJS',
    href: 'https://elysiajs.com/table-of-content.html',
  },
  {
    icon: 'javascript',
    title: 'JavaScript',
    href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  },
  {
    icon: 'typescript',
    title: 'TypeScript',
    href: 'https://www.typescriptlang.org/docs/',
  },
]

export function CardsComp() {
  return (
    <Cards>
      {cards.map((card) => (
        <Cards.Card
          key={card.title}
          icon={<Icon name={card.icon} />}
          title={card.title}
          href={card.href}
        />
      ))}
    </Cards>
  )
}
