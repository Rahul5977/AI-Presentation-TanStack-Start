import { ScriptOnce } from '@tanstack/react-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const THEME_STORAGE_KEY = 'theme'
const COLOR_THEME_STORAGE_KEY = 'color-theme'
const MEDIA = '(prefers-color-scheme: dark)'

export type Mode = 'dark' | 'light' | 'system'

export type ColorTheme =
  | 'midnight'
  | 'ocean'
  | 'aurora'
  | 'solar'
  | 'forest'
  | 'rose'
  | 'copper'
  | 'neon'
  | 'crimson'
  | 'cosmic'
  | 'matrix'
  | 'obsidian'
  | 'ember'
  | 'candy'
  | 'arctic'
  | 'golden'
  | 'lavender'
  | 'mint'
  | 'platinum'
  | 'sunset'

export type ThemeDefinition = {
  id: ColorTheme
  name: string
  description: string
  primaryHex: string
  bgHex: string
  isDark: boolean
}

export const THEMES: ThemeDefinition[] = [
  { id: 'midnight', name: 'Midnight', description: 'Electric indigo in deep violet night.', primaryHex: '#7B5CFF', bgHex: '#171027', isDark: true },
  { id: 'ocean', name: 'Ocean', description: 'Teal energy over deep navy.', primaryHex: '#35D7D3', bgHex: '#13203A', isDark: true },
  { id: 'aurora', name: 'Aurora', description: 'Violet and magenta polar glow.', primaryHex: '#C35CFF', bgHex: '#1B1228', isDark: true },
  { id: 'solar', name: 'Solar', description: 'Warm gold on dark earth tones.', primaryHex: '#F7B534', bgHex: '#1E1910', isDark: true },
  { id: 'forest', name: 'Forest', description: 'Emerald focus in deep woodland.', primaryHex: '#3DDC84', bgHex: '#13231B', isDark: true },
  { id: 'rose', name: 'Rose', description: 'Rose highlights over plum depth.', primaryHex: '#FF5AA0', bgHex: '#211322', isDark: true },
  { id: 'copper', name: 'Copper', description: 'Bronze warmth with grounded contrast.', primaryHex: '#D98637', bgHex: '#231A12', isDark: true },
  { id: 'neon', name: 'Neon', description: 'Electric cyan-green in near black.', primaryHex: '#34F5C5', bgHex: '#0B0F12', isDark: true },
  { id: 'crimson', name: 'Crimson', description: 'Deep red punch in dark mode.', primaryHex: '#E04848', bgHex: '#160D0E', isDark: true },
  { id: 'cosmic', name: 'Cosmic', description: 'Blue-violet on deep space black.', primaryHex: '#6F6BFF', bgHex: '#0E1020', isDark: true },
  { id: 'matrix', name: 'Matrix', description: 'Vivid green with terminal mood.', primaryHex: '#5DFF70', bgHex: '#070B08', isDark: true },
  { id: 'obsidian', name: 'Obsidian', description: 'Silver-gray, clean and restrained.', primaryHex: '#B9BEC7', bgHex: '#14171D', isDark: true },
  { id: 'ember', name: 'Ember', description: 'Orange-red heat in dark warmth.', primaryHex: '#FF7A3A', bgHex: '#19110F', isDark: true },
  { id: 'candy', name: 'Candy', description: 'Hot pink neon playground.', primaryHex: '#FF4DB8', bgHex: '#1A1124', isDark: true },
  { id: 'arctic', name: 'Arctic', description: 'Ice blue and bright clarity.', primaryHex: '#3C8DFF', bgHex: '#F2F7FF', isDark: false },
  { id: 'golden', name: 'Golden', description: 'Rich gold on warm light canvas.', primaryHex: '#C9941A', bgHex: '#FFF8EA', isDark: false },
  { id: 'lavender', name: 'Lavender', description: 'Soft purple for calm focus.', primaryHex: '#8B6AF9', bgHex: '#F7F1FF', isDark: false },
  { id: 'mint', name: 'Mint', description: 'Fresh green for clean interfaces.', primaryHex: '#3CCB8B', bgHex: '#F3FFF9', isDark: false },
  { id: 'platinum', name: 'Platinum', description: 'Neutral gray professional mode.', primaryHex: '#8A8F99', bgHex: '#FCFCFD', isDark: false },
  { id: 'sunset', name: 'Sunset', description: 'Warm orange with magenta glow.', primaryHex: '#FF7B3D', bgHex: '#1A1118', isDark: true },
]

type ThemeProviderProps = {
  children: React.ReactNode
  defaultMode?: Mode
  defaultColorTheme?: ColorTheme
}

type ThemeProviderState = {
  mode: Mode
  setMode: (mode: Mode) => void
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const initialState: ThemeProviderState = {
  mode: 'dark',
  setMode: () => null,
  colorTheme: 'midnight',
  setColorTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getResolvedMode(mode: Mode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia(MEDIA).matches ? 'dark' : 'light'
  }
  return mode
}

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  defaultColorTheme = 'midnight',
}: ThemeProviderProps) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return defaultMode
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' || stored === 'system'
      ? stored
      : defaultMode
  })
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return defaultColorTheme
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorTheme | null
    return THEMES.some((theme) => theme.id === stored) ? stored! : defaultColorTheme
  })

  const applyMode = useCallback((nextMode: Mode) => {
    const root = window.document.documentElement
    const resolved = getResolvedMode(nextMode)
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
  }, [])

  useEffect(() => {
    const media = window.matchMedia(MEDIA)
    const onChange = () => {
      if (mode === 'system') applyMode(mode)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [applyMode, mode])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyMode(mode)
  }, [applyMode, mode])

  useEffect(() => {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme)
    window.document.documentElement.setAttribute('data-color-theme', colorTheme)
  }, [colorTheme])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      colorTheme,
      setColorTheme,
    }),
    [mode, colorTheme],
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      <ScriptOnce>
        {`(() => {
          const modeKey = '${THEME_STORAGE_KEY}';
          const colorKey = '${COLOR_THEME_STORAGE_KEY}';
          const mode = localStorage.getItem(modeKey) || 'dark';
          const colorTheme = localStorage.getItem(colorKey) || 'midnight';
          const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('${MEDIA}').matches);
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(isDark ? 'dark' : 'light');
          document.documentElement.setAttribute('data-color-theme', colorTheme);
        })();`}
      </ScriptOnce>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeProviderContext)

/**
 * @deprecated Use useTheme() instead.
 */
export const useColorMode = useTheme
