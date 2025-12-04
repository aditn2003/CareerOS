# Opportunity Tracking - Visual Reference Guide

## Component Layout Maps

### Interview Card - With Opportunity

```
┌─────────────────────────────────────────────┐
│  Interview Card                              │
├─────────────────────────────────────────────┤
│                                              │
│  John Smith          ✨ Opportunity completed│
│                                              │
│  Company: TechCorp                           │
│  Type: Video                                 │
│  Scheduled: Jan 15, 2024                     │
│  Topics: Career path, tech stack             │
│                                              │
│  🎯 Opportunity: VP mentioned hiring for    │
│     Senior Python Developer role             │
│                                              │
├─────────────────────────────────────────────┤
│  [✏️ Edit] [📚 Prepare] [✉️ Follow-up]       │
│  [View Details] [✅ Complete]                │
└─────────────────────────────────────────────┘

Legend:
- Header row: Name + Badges (opportunity badge + status badge)
- Info section: Details and opportunity description (highlighted)
- Actions: Buttons to manage interview
```

### Interview Card - Without Opportunity

```
┌─────────────────────────────────────────────┐
│  Interview Card                              │
├─────────────────────────────────────────────┤
│                                              │
│  Jane Doe                          scheduled │
│                                              │
│  Company: StartupXYZ                        │
│  Type: Phone                                 │
│  Scheduled: Jan 18, 2024                     │
│  Topics: Industry trends                     │
│                                              │
│  (No opportunity description shown)          │
│                                              │
├─────────────────────────────────────────────┤
│  [✏️ Edit] [📚 Prepare] [✉️ Follow-up]       │
│  [View Details] [✅ Complete]                │
└─────────────────────────────────────────────┘

Key Difference:
- No ✨ Opportunity badge
- No 🎯 Opportunity description
```

### Edit Interview Modal Structure

```
┌─────────────────────────────────────────────────────┐
│ ✏️ Edit Interview                            [X]     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Status: [completed ▼]                              │
│                                                      │
│  Interview Type: [video ▼]  Duration: [45] min      │
│                                                      │
│  Scheduled Date: [2024-01-15 14:00]                 │
│                                                      │
│  Location/Platform: [Zoom]                          │
│                                                      │
│  Key Topics: [Career path, tech stack]              │
│                                                      │
│  Post-Interview Notes:                              │
│  ┌─────────────────────────────────┐                │
│  │ Great conversation about        │                │
│  │ company culture and growth...   │                │
│  └─────────────────────────────────┘                │
│                                                      │
│  ☐ ✨ Opportunity Identified    ← NEW FIELD         │
│                                                      │
│  (textarea not shown when unchecked)                 │
│                                                      │
│  Relationship Value: [high ▼]                       │
│                                                      │
│  ┌──────────────────────┬──────────────────┐        │
│  │   [Update Interview] │   [Cancel]       │        │
│  └──────────────────────┴──────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Edit Interview Modal - With Opportunity Checked

```
┌─────────────────────────────────────────────────────┐
│ ✏️ Edit Interview                            [X]     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Status: [completed ▼]                              │
│                                                      │
│  Interview Type: [video ▼]  Duration: [45] min      │
│                                                      │
│  Scheduled Date: [2024-01-15 14:00]                 │
│                                                      │
│  Location/Platform: [Zoom]                          │
│                                                      │
│  Key Topics: [Career path, tech stack]              │
│                                                      │
│  Post-Interview Notes:                              │
│  ┌─────────────────────────────────┐                │
│  │ Great conversation...           │                │
│  └─────────────────────────────────┘                │
│                                                      │
│  ☑ ✨ Opportunity Identified    ← CHECKED           │
│                                                      │
│  Opportunity Description:      ← NEW FIELD SHOWN    │
│  ┌─────────────────────────────────┐                │
│  │ Describe the opportunity        │                │
│  │ identified...                   │                │
│  │                                 │                │
│  │ VP of Eng mentioned hiring for  │                │
│  │ Senior Python Developer role    │                │
│  └─────────────────────────────────┘                │
│                                                      │
│  Relationship Value: [high ▼]                       │
│                                                      │
│  ┌──────────────────────┬──────────────────┐        │
│  │   [Update Interview] │   [Cancel]       │        │
│  └──────────────────────┴──────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Details Modal - With Opportunity

```
┌──────────────────────────────────────────────────┐
│ Interview Details                         [X]   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Candidate Information                            │
│ ─────────────────────────────────────────────    │
│ Name: John Smith                                 │
│ Company: TechCorp                                │
│ Title: Senior Engineer                           │
│ Email: john@techcorp.com                         │
│                                                  │
│ Interview Details                                │
│ ─────────────────────────────────────────────    │
│ Status: completed                                │
│ Type: video                                      │
│ Scheduled: 1/15/2024, 2:00 PM                    │
│ Duration: 45 minutes                             │
│ Platform: Zoom                                   │
│ Topics: Career path, tech stack                  │
│                                                  │
│ Post-Interview Notes                             │
│ ─────────────────────────────────────────────    │
│ Great conversation about growth opportunities...│
│                                                  │
│ ✨ Opportunity Identified      ← NEW SECTION    │
│ ─────────────────────────────────────────────    │
│ Every interaction builds toward               │
│ career opportunities!                           │
│                                                  │
│ Details: VP of Engineering mentioned            │
│ potential referral to startup CTO               │
│                                                  │
│ 💡 Pro Tip:                    ← NEW SECTION    │
│ ─────────────────────────────────────────────    │
│ Every interaction with a professional builds    │
│ toward career opportunities. Track insights,    │
│ opportunities, and relationship value to        │
│ maximize your professional network!             │
│                                                  │
│ ┌──────────────────────┬──────────────┐         │
│ │   [💡 Add Insight]   │   [Close]    │         │
│ └──────────────────────┴──────────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Details Modal - Without Opportunity

```
┌──────────────────────────────────────────────────┐
│ Interview Details                         [X]   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Candidate Information                            │
│ ─────────────────────────────────────────────    │
│ Name: Jane Doe                                   │
│ Company: StartupXYZ                              │
│ Title: Product Manager                           │
│ Email: jane@startup.com                          │
│                                                  │
│ Interview Details                                │
│ ─────────────────────────────────────────────    │
│ Status: scheduled                                │
│ Type: phone                                      │
│ Scheduled: 1/18/2024, 10:00 AM                   │
│ Duration: 30 minutes                             │
│ Platform: Phone                                  │
│ Topics: Industry trends                          │
│                                                  │
│ Post-Interview Notes                             │
│ ─────────────────────────────────────────────    │
│ (No notes yet)                                   │
│                                                  │
│ (Opportunity section NOT shown)                  │
│                                                  │
│ 💡 Pro Tip:                    (Always shown)   │
│ ─────────────────────────────────────────────    │
│ Every interaction with a professional builds    │
│ toward career opportunities. Track insights,    │
│ opportunities, and relationship value to        │
│ maximize your professional network!             │
│                                                  │
│ ┌──────────────────────┬──────────────┐         │
│ │   [💡 Add Insight]   │   [Close]    │         │
│ └──────────────────────┴──────────────┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Color Reference

### Gold/Amber (Opportunity Elements)
```
Primary:    #fbbf24 (Yellow Amber)
Secondary:  #f59e0b (Orange Amber)
Gradient:   #fbbf24 → #f59e0b (135deg)
Text Dark:  #7c4a1a (Brown on light background)
```

### Purple (Brand / Pro Tip)
```
Primary:    #4f46e5 (Indigo Purple)
Secondary:  #7c3aed (Violet)
Dark Text:  #5b21b6 (Dark Purple on light)
```

### Status Badges
```
Pending:     Light Gray
Scheduled:   Light Blue
Completed:   Light Green
Cancelled:   Light Red
Rescheduled: Light Orange
```

## Badge Styling Details

### Opportunity Badge
```
Shape:           Rounded pill
Icon:            ✨ (Sparkle emoji)
Text:            "Opportunity"
Font Size:       0.85rem (13px)
Font Weight:     600 (Semi-bold)
Padding:         0.4rem 0.8rem (6px 12px)
Border Radius:   20px
Background:      Linear gradient (135deg, #fbbf24, #f59e0b)
Box Shadow:      0 2px 8px rgba(245, 158, 11, 0.3)
Hover Effect:    (None - badge, not button)
```

### Status Badge
```
Shape:           Rounded rectangle
Text:            Interview status (lowercase)
Font Size:       0.85rem (13px)
Font Weight:     600 (Semi-bold)
Padding:         0.4rem 0.8rem
Border Radius:   12px
Background:      Color varies by status
Box Shadow:      None
```

### Opportunity Description Box
```
Background:      Linear gradient (left, rgba(251,191,36,0.1), rgba(245,158,11,0.05))
Border Left:     3px solid #fbbf24
Border Radius:   4px
Padding:         0.75rem
Text Color:      #7c4a1a (Dark brown)
Font Weight:     500 (Medium)
```

## Responsive Breakpoints

### Desktop (1200px+)
- Full layout with all elements
- Badges on single line
- Modal full width (max ~800px)

### Tablet (768px - 1199px)
- Cards in 2-column grid
- Badges may wrap if needed
- Modal adjusted for tablet

### Mobile (375px - 767px)
- Cards in single column
- Badges may stack vertically
- Modal full screen with scrolling
- Touch targets: min 44x44px

## Interaction States

### Checkbox State: Unchecked
```
[ ] ✨ Opportunity Identified
(textarea hidden below)
```

### Checkbox State: Checked
```
[✓] ✨ Opportunity Identified
(textarea appears below)
```

### Button States
- Normal: Clickable, visible
- Hover: Subtle background change
- Focus: Outline visible
- Active/Pressed: Slight inset effect

## Accessibility Features

### Color Independence
- Opportunity indicator uses badge PLUS text
- Status conveyed through text AND color
- Sufficient contrast for readability

### Interactive Elements
- Checkbox: Properly labeled with <label>
- Textarea: Has placeholder and description
- Links: Semantic <button> elements
- Focus: Visible outline on all interactive elements

### Semantic HTML
```html
<label>
  <input type="checkbox" /> 
  ✨ Opportunity Identified
</label>

<textarea 
  placeholder="Describe the opportunity identified..."
  rows="3"
></textarea>
```

## Animation & Transitions

### Textarea Appearance
```
CSS:  Rendered via conditional React logic
      No animation on first load
      Simple visibility toggle
```

### Modal Slide In
```
CSS:  fadeIn animation (0.3s ease)
      opacity: 0 → 1
      transform: translateY(10px) → translateY(0)
```

### Badge Styling
```
CSS:  No animation
      Static styling once rendered
      Subtle shadow for depth
```

## Copy/Text Standards

### Labels
- "✨ Opportunity Identified" - checkbox label
- "Opportunity Description" - textarea label
- "Describe the opportunity identified..." - placeholder

### Messages
- "Every interaction builds toward career opportunities!" - opportunity section header
- "Every interaction with a professional builds toward career opportunities. Track insights, opportunities, and relationship value to maximize your professional network!" - pro tip

### Badge Text
- "✨ Opportunity" - badge text on card

## Browser Compatibility

### Tested On
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### CSS Features Used
- Flexbox ✓
- CSS Grid ✓
- Linear Gradients ✓
- CSS Variables (optional) ✓

### JavaScript Features
- ES6+ (arrow functions, spread operator) ✓
- React Hooks (useState, useEffect) ✓
- Async/await ✓

---

This visual reference guide shows the exact layout, styling, and structure of all opportunity tracking components. Use for design review, QA testing, and documentation purposes.
