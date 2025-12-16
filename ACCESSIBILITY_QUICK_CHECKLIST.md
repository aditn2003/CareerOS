# Accessibility Quick Checklist

## Pre-Deployment Checklist

### Automated Tests (5 minutes)
- [ ] Run Lighthouse accessibility audit (target: 95+)
- [ ] Run axe DevTools scan (0 critical, 0 serious)
- [ ] Run WAVE check (0 errors)

### Keyboard Navigation (10 minutes)
- [ ] Tab through all pages
- [ ] Verify focus indicators visible
- [ ] Test all forms with keyboard
- [ ] Verify no keyboard traps
- [ ] Test modals close with Escape

### Screen Reader (15 minutes)
- [ ] Test with NVDA/JAWS/VoiceOver
- [ ] Verify all form labels announced
- [ ] Verify all buttons have names
- [ ] Verify images have alt text
- [ ] Verify heading hierarchy logical

### Color Contrast (5 minutes)
- [ ] Check all text meets 4.5:1 ratio
- [ ] Check large text meets 3:1 ratio
- [ ] Verify focus indicators meet 3:1 ratio

### Forms (5 minutes)
- [ ] All inputs have labels
- [ ] Labels properly associated (htmlFor/id)
- [ ] Required fields indicated
- [ ] Error messages accessible

### Quick Fixes
- [ ] Fix any critical issues
- [ ] Fix any serious issues
- [ ] Document moderate issues for next sprint

---

## Critical Issues to Fix Immediately

1. **Missing Form Labels**: All inputs must have labels
2. **Keyboard Traps**: Users must be able to escape modals
3. **Missing Focus Indicators**: All interactive elements need visible focus
4. **Insufficient Contrast**: Text must meet 4.5:1 ratio
5. **Missing Alt Text**: All images need alt text or aria-hidden

---

## Testing Commands

```bash
# Run Lighthouse audit
# Open Chrome DevTools > Lighthouse > Accessibility > Generate report

# Run axe DevTools
# Install extension > Open DevTools > axe DevTools > Scan

# Run WAVE
# Install extension > Click WAVE icon > Review results

# Test with keyboard
# Disable mouse, navigate entire app with Tab, Enter, Space, Arrow keys

# Test with screen reader
# Enable NVDA/JAWS/VoiceOver, navigate through app
```

---

## Common Issues & Quick Fixes

### Missing Label
```jsx
// ❌ Bad
<input type="text" name="email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input type="text" id="email" name="email" />
```

### Missing Focus Indicator
```css
/* ❌ Bad */
button:focus {
  outline: none;
}

/* ✅ Good */
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### Insufficient Contrast
```css
/* ❌ Bad - 2.5:1 */
color: #9ca3af; /* on white */

/* ✅ Good - 5.7:1 */
color: #4b5563; /* on white */
```

### Missing Alt Text
```jsx
/* ❌ Bad */
<img src="logo.png" />

/* ✅ Good */
<img src="logo.png" alt="Company Logo" />

/* ✅ Good (decorative) */
<img src="decoration.png" alt="" aria-hidden="true" />
```

---

**Last Updated**: 2024

