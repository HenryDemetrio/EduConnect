import { useTheme } from '../context/ThemeContext'

const SUN_ICON =
  'https://cdn3.iconfinder.com/data/icons/meteocons/512/sun-symbol-512.png'
const MOON_ICON =
  'https://cdn3.iconfinder.com/data/icons/feather-5/24/moon-512.png'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const icon = isDark ? SUN_ICON : MOON_ICON
  const label = isDark ? 'Claro' : 'Escuro'

  const iconStyle = {
    height: 16,
    width: 16,
    objectFit: 'contain',
    filter: isDark ? 'invert(1) brightness(1.4)' : 'none', // sol bem clarinho no dark
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        background: isDark ? '#111827' : '#e5e7eb',
        color: isDark ? '#f9fafb' : '#111827',
        cursor: 'pointer',
      }}
    >
      <img src={icon} alt="" style={iconStyle} />
      <span>{label}</span>
    </button>
  )
}
