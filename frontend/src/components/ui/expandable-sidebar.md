# Expandable Sidebar Component

A responsive, animated sidebar component with expand/collapse functionality, designed for React applications using Tailwind CSS.

## Features

- **Responsive Design**: Adjusts between collapsed (narrow) and expanded (wide) states
- **Smooth Animations**: Uses CSS transitions for a polished user experience
- **Tab Management**: Includes built-in tab selection with visual indicators
- **Dark Theme**: Styled with a dark theme using Tailwind CSS classes
- **Content Shifting**: Main content shifts with the sidebar expansion/collapse
- **Accessibility**: Includes proper aria labels for better screen reader support

## Usage

```tsx
import ExpandableSidebar from "@/components/ui/expandable-sidebar"

export default function YourPage() {
  const [activeTab, setActiveTab] = useState("analytics")

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // Handle tab change logic here
  }

  return (
    <ExpandableSidebar 
      onTabChange={handleTabChange} 
      activeTabId={activeTab}
    >
      {/* Your main content goes here */}
      <div className="min-h-screen bg-gray-100">
        <h1>Main Content Area</h1>
        <p>This content will shift when the sidebar expands or collapses.</p>
      </div>
    </ExpandableSidebar>
  )
}
```

## Props

| Name          | Type                     | Default       | Description                                     |
|---------------|--------------------------|---------------|-------------------------------------------------|
| `className`   | `string`                 | -             | Additional classes to apply to the sidebar      |
| `onTabChange` | `(tabId: string) => void`| -             | Callback function when a tab is selected        |
| `activeTabId` | `string`                 | `"analytics"` | The ID of the currently active tab              |
| `children`    | `React.ReactNode`        | -             | Content to display in the main area             |

## Tabs

The sidebar includes the following tabs by default:

1. **Analytics** - ID: `analytics`
2. **Documents** - ID: `documents`
3. **Chat** - ID: `chat`
4. **Profile** - ID: `profile`

## Demo

To see a working example, check out the demo page:

```tsx
// Go to this route in your application
import SidebarDemo from "@/pages/sidebar-demo"
```

## Customization

You can customize the tabs, colors, and behavior by modifying the component directly:

- Change tab icons and names in the `tabs` array
- Adjust the sidebar width by modifying the `w-16` and `w-52` classes
- Change the color scheme by updating the Tailwind color classes (e.g., `bg-gray-800` to `bg-blue-900`) 