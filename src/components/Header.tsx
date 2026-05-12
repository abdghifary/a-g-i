import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 shrink-0" box-="double">
      <div className="flex items-center gap-4">
        <Link to="/" className="no-underline">
          <span is-="badge" variant-="foreground0" cap-="round">
            <span className="tui-cursor mr-1" />
            TUI CHAT
          </span>
        </Link>
        <span className="text-sm opacity-80 hidden sm:inline-block">/home/user/chat.sh</span>
      </div>

      <div className="flex items-center gap-4">
        <Link to="/about" className="text-sm no-underline hover:opacity-80">
          [ About ]
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
