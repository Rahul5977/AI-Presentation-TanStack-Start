import { authClient } from '#/lib/auth-client'
import ThemePicker from '@/components/ThemePicker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Link, useRouter } from '@tanstack/react-router'
import {
  BarChart3,
  ChevronDown,
  LogOut,
  Menu,
  Presentation,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const centerLinks = [
  { to: '/about-us', label: 'About Us' },
  { to: '/contact-us', label: 'Contact' },
  { to: '/privacy-policy', label: 'Privacy' },
  { to: '/terms-and-conditions', label: 'Terms' },
] as const

const mobileLinks = [
  ...centerLinks,
  { to: '/refund-and-cancellation-policy', label: 'Refund Policy' },
] as const

export default function Navbar() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = useMemo(() => {
    const name = session?.user?.name?.trim()
    if (!name) return 'Account'
    return name.split(/\s+/)[0]
  }, [session?.user?.name])

  const handleSignOut = async () => {
    await authClient.signOut()
    router.navigate({ to: '/login' })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto w-full max-w-6xl px-4 py-3">
        <div
          className={cn(
            'glass rounded-2xl px-4 py-2.5 transition-all duration-200',
            scrolled && 'shadow-2xl shadow-black/20',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
              <div className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Presentation className="size-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold leading-none text-foreground">
                  PPT<span className="text-primary">.ai</span>
                </span>
                <span className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary md:inline-flex">
                  <Sparkles className="size-3" />
                  Beta
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {centerLinks.map((item) => (
                <Button
                  key={item.to}
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs text-muted-foreground"
                >
                  <Link to={item.to}>{item.label}</Link>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="rounded-xl lg:hidden">
                    <Menu className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-56 rounded-2xl border-border/70">
                  <DropdownMenuLabel>Navigate</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {mobileLinks.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {session?.user ? (
                <Button asChild variant="ghost" size="sm" className="hidden rounded-xl md:inline-flex">
                  <Link to="/analytics" className="inline-flex items-center gap-1.5">
                    <BarChart3 className="size-4" />
                    Analytics
                  </Link>
                </Button>
              ) : null}

              <ThemePicker />

              {isPending ? (
                <div className="size-9 animate-pulse rounded-full bg-muted" />
              ) : session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl border border-border/60 bg-background/50 px-2"
                    >
                      <Avatar className="size-7 border border-primary/25">
                        <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                        <AvatarFallback className="bg-primary/12 text-primary">
                          {session.user.name ? session.user.name.charAt(0).toUpperCase() : <User className="size-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-20 truncate text-xs font-semibold text-foreground">
                        {firstName}
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass w-56 rounded-2xl border-border/70">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">{session.user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="rounded-xl">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}