# Transparent Theme Customization Guide

This guide explains how to customize transparent colors and glass effects throughout the application.

## Quick Start

### Using Transparent Buttons

```jsx
// Standard transparent button
<Button variant="primary" transparent>Click me</Button>

// Transparent button with custom color
<Button variant="primary" transparent customColor="#a855f7">Purple Button</Button>

// All variants support transparent mode
<Button variant="secondary" transparent>Secondary</Button>
<Button variant="danger" transparent>Danger</Button>
<Button variant="outline" transparent>Outline</Button>
```

## Color Customization

### Option 1: Using Theme Config File

Edit `src/config/theme.js` to customize colors:

```javascript
export const themeConfig = {
  sidebar: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%)',
    activeItemBg: 'rgba(14, 165, 233, 0.15)', // Change this value
  },
  buttons: {
    primary: {
      transparent: {
        background: 'rgba(14, 165, 233, 0.2)', // Change opacity or color
        border: 'rgba(14, 165, 233, 0.4)',
      },
    },
  },
}
```

### Option 2: Inline Custom Colors

Use the `customColor` prop for one-off customizations:

```jsx
<Button 
  variant="primary" 
  transparent 
  customColor="#a855f7"  // Purple
>
  Custom Button
</Button>

<Button 
  variant="primary" 
  transparent 
  customColor="#10b981"  // Green
>
  Success Button
</Button>
```

## Available Custom Colors

Pre-defined colors in `theme.js`:
- Purple: `#a855f7`
- Green: `#10b981`
- Orange: `#f97316`
- Pink: `#ec4899`
- Indigo: `#6366f1`

## Sidebar Customization

The sidebar uses transparent glass effects. To customize:

1. **Background Opacity**: Change the alpha values in `sidebar.background`
2. **Blur Amount**: Adjust `backdropBlur` value
3. **Active Item Color**: Modify `activeItemBg` and `activeItemBorder`

Example:
```javascript
sidebar: {
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)', // More opaque
  backdropBlur: 'blur(30px)', // More blur
  activeItemBg: 'rgba(139, 92, 246, 0.2)', // Purple active state
}
```

## TopBar Customization

Similar to sidebar, customize in `theme.js`:

```javascript
topbar: {
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
  backdropBlur: 'blur(25px)',
}
```

## Button Transparency Levels

Control transparency by adjusting opacity values:

- **Light**: `rgba(color, 0.1)` - Very subtle
- **Medium**: `rgba(color, 0.2)` - Default
- **Heavy**: `rgba(color, 0.3)` - More visible

## Examples

### Purple Theme
```jsx
<Button variant="primary" transparent customColor="#a855f7">
  Purple Action
</Button>
```

### Green Success Theme
```jsx
<Button variant="primary" transparent customColor="#10b981">
  Success Action
</Button>
```

### Custom Gradient
```jsx
<Button 
  variant="primary" 
  transparent 
  style={{
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  }}
>
  Gradient Button
</Button>
```

## Tips

1. **Consistency**: Use the same color palette across transparent elements
2. **Contrast**: Ensure text remains readable with transparent backgrounds
3. **Performance**: Higher blur values may impact performance on slower devices
4. **Accessibility**: Test transparent elements with different backgrounds

## Browser Support

Transparent effects use:
- `backdrop-filter` (modern browsers)
- `-webkit-backdrop-filter` (Safari)
- Fallback to solid colors in older browsers

