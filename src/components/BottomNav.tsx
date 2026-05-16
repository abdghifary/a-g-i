import { Link, useRouter } from '@tanstack/react-router'

export default function BottomNav() {
  const router = useRouter()
  const currentPath = router.state.location.pathname

  const links = [
    { label: '~', path: '/' },
    { label: 'bio', path: '/bio' },
    { label: 'exp', path: '/experience' },
    { label: 'projects', path: '/projects' },
    { label: 'contact', path: '/contact' },
  ]

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 flex h-14 w-full items-center shrink-0 border-t"
      style={{ 
        backgroundColor: 'var(--tui-header-bg, var(--webtui-background0))',
        borderColor: 'var(--tui-border)',
      }}
      aria-label="Bottom Navigation"
    >
      <div className="flex w-full items-center h-full max-w-5xl mx-auto overflow-x-auto">
        {links.map((link) => {
          const isActive = currentPath === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex h-full items-center px-4 md:px-6 no-underline border-l first:border-l-0 hover:bg-white/5 transition-colors ${
                isActive ? 'bg-white/10' : ''
              }`}
              style={{ borderColor: 'var(--tui-border)' }}
            >
              <span 
                is-="badge" 
                variant-={isActive ? "primary" : "foreground2"}
                box-="round"
                className="whitespace-nowrap"
              >
                {isActive && <span className="mr-2 opacity-70">◆</span>}
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
