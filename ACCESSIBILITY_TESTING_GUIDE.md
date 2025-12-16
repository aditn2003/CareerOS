# Accessibility Testing Guide - WCAG 2.1 AA Compliance

## Overview
This guide provides comprehensive instructions for testing and verifying accessibility compliance according to WCAG 2.1 Level AA standards.

---

## Table of Contents
1. [Automated Testing Tools](#automated-testing-tools)
2. [Keyboard Navigation Testing](#keyboard-navigation-testing)
3. [Screen Reader Testing](#screen-reader-testing)
4. [Color Contrast Verification](#color-contrast-verification)
5. [Form Labels & ARIA Testing](#form-labels--aria-testing)
6. [Focus Indicators](#focus-indicators)
7. [Assistive Technology Testing](#assistive-technology-testing)
8. [Issue Priority & Fixing](#issue-priority--fixing)
9. [Verification Checklist](#verification-checklist)

---

## Automated Testing Tools

### 1. Lighthouse Accessibility Audit

#### Setup
1. Open Chrome DevTools (F12)
2. Navigate to **Lighthouse** tab
3. Select **Accessibility** category
4. Click **Generate report**

#### Target Scores
- **Accessibility Score**: 95+ (aim for 100)
- **All checks should pass**

#### Running the Audit
```bash
# Install Lighthouse CLI (optional)
npm install -g lighthouse

# Run audit
lighthouse http://localhost:4000 --only-categories=accessibility --output=html --output-path=./accessibility-report.html
```

#### Common Issues to Check
- [ ] Missing alt text on images
- [ ] Missing form labels
- [ ] Insufficient color contrast
- [ ] Missing ARIA labels
- [ ] Missing document language
- [ ] Missing heading hierarchy
- [ ] Missing focus indicators

---

### 2. axe DevTools

#### Setup
1. Install **axe DevTools** browser extension:
   - Chrome: [axe DevTools Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility/lhdoppojpmngadmnindnejefpokejbdd)
   - Firefox: [axe DevTools Extension](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)
   - Edge: Available in Edge Add-ons

2. Open DevTools (F12)
3. Navigate to **axe DevTools** tab
4. Click **Scan** button

#### Running Automated Scan
1. Navigate to each page in the application
2. Run axe DevTools scan
3. Review all violations
4. Fix critical and serious issues first
5. Document moderate and minor issues

#### Issue Severity Levels
- **Critical**: Blocks users, must fix immediately
- **Serious**: Significant impact, fix in current sprint
- **Moderate**: Some impact, fix in next sprint
- **Minor**: Low impact, fix when convenient

---

### 3. WAVE (Web Accessibility Evaluation Tool)

#### Setup
1. Install **WAVE** browser extension:
   - Chrome: [WAVE Extension](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)
   - Firefox: [WAVE Extension](https://addons.mozilla.org/en-US/firefox/addon/wave-accessibility-tool/)

2. Navigate to any page
3. Click WAVE icon in toolbar
4. Review errors, alerts, and features

#### What to Check
- [ ] Errors (red): Must fix
- [ ] Alerts (yellow): Should fix
- [ ] Features (green): Good practices
- [ ] Structural elements: Proper heading hierarchy
- [ ] ARIA: Proper usage

---

## Keyboard Navigation Testing

### Testing Checklist

#### Basic Navigation
- [ ] **Tab**: Navigate forward through all interactive elements
- [ ] **Shift+Tab**: Navigate backward
- [ ] **Enter/Space**: Activate buttons and links
- [ ] **Arrow Keys**: Navigate dropdowns, menus, and lists
- [ ] **Escape**: Close modals and dropdowns
- [ ] **Home/End**: Navigate to start/end of lists

#### Page-by-Page Testing

##### Home Page
- [ ] Can navigate to all links
- [ ] Can access login/register buttons
- [ ] Can navigate through navigation menu

##### Login/Register Pages
- [ ] Can tab through all form fields
- [ ] Can submit forms with keyboard
- [ ] Error messages are announced
- [ ] Focus order is logical

##### Dashboard/Jobs Page
- [ ] Can navigate through job cards
- [ ] Can access all action buttons
- [ ] Can navigate through tabs
- [ ] Can use filters with keyboard
- [ ] Can navigate through job pipeline

##### Statistics Page
- [ ] Can navigate through all tabs
- [ ] Can interact with charts (if keyboard accessible)
- [ ] Can navigate through data tables
- [ ] Can access all filter controls

##### Profile Page
- [ ] Can navigate through all form fields
- [ ] Can save changes with keyboard
- [ ] Can navigate through tabs
- [ ] Can upload files (if keyboard accessible)

##### Interview Preparation
- [ ] Can navigate through all sections
- [ ] Can interact with question bank
- [ ] Can navigate through mock interview interface
- [ ] Can access all tools

##### Network Page
- [ ] Can navigate through contacts list
- [ ] Can add/edit contacts with keyboard
- [ ] Can navigate through tabs
- [ ] Can access all actions

##### Offer Comparison
- [ ] Can navigate through comparison table
- [ ] Can edit offer details with keyboard
- [ ] Can navigate through all inputs
- [ ] Can access all actions

##### Career Growth Calculator
- [ ] Can navigate through all inputs
- [ ] Can select offers with keyboard
- [ ] Can edit salary and raise percentages
- [ ] Can add milestones with keyboard

#### Common Issues to Check
- [ ] **Keyboard Trap**: User cannot escape a modal or dropdown
- [ ] **Missing Focus Indicators**: No visible focus outline
- [ ] **Focus Order**: Focus jumps illogically
- [ ] **Skip Links**: Missing "Skip to main content" link
- [ ] **Hidden Focusable Elements**: Elements that can be focused but are hidden

---

## Screen Reader Testing

### Screen Reader Software

#### NVDA (Windows - Free)
1. Download: [NVDA Download](https://www.nvaccess.org/download/)
2. Install and start NVDA
3. Use **Insert+Q** to stop/start
4. Navigate with arrow keys, Tab, and screen reader commands

#### JAWS (Windows - Paid)
1. Download trial: [JAWS Download](https://www.freedomscientific.com/products/software/jaws/)
2. Use **Insert+J** to open JAWS settings
3. Navigate with standard keyboard commands

#### VoiceOver (macOS/iOS - Built-in)
1. Enable: **System Preferences > Accessibility > VoiceOver**
2. Or press **Cmd+F5**
3. Use **VO+Arrow Keys** to navigate
4. Use **VO+Space** to activate

#### TalkBack (Android - Built-in)
1. Enable: **Settings > Accessibility > TalkBack**
2. Use swipe gestures to navigate
3. Double-tap to activate

### Testing Checklist

#### Page Structure
- [ ] Page title is announced correctly
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Landmarks are announced (header, nav, main, footer)
- [ ] Lists are announced as lists
- [ ] Tables are announced with headers

#### Navigation
- [ ] Navigation menu is announced
- [ ] Current page is indicated
- [ ] Links are descriptive (not "click here")
- [ ] Breadcrumbs are announced

#### Forms
- [ ] All inputs have labels announced
- [ ] Required fields are indicated
- [ ] Error messages are announced
- [ ] Help text is announced
- [ ] Form submission is confirmed

#### Interactive Elements
- [ ] Buttons are announced as buttons
- [ ] Links are announced as links
- [ ] Checkboxes are announced with state
- [ ] Radio buttons are announced with state
- [ ] Dropdowns are announced with options
- [ ] Modals are announced when opened

#### Content
- [ ] Images have alt text (or marked decorative)
- [ ] Icons have labels or aria-labels
- [ ] Charts have descriptions or aria-labels
- [ ] Status messages are announced
- [ ] Loading states are announced

#### Common Issues
- [ ] **Missing Labels**: Form inputs without labels
- [ ] **Unlabeled Buttons**: Buttons with only icons
- [ ] **Missing Alt Text**: Images without descriptions
- [ ] **Poor Heading Structure**: Skipped heading levels
- [ ] **Missing Landmarks**: No semantic HTML5 elements
- [ ] **Unannounced Changes**: Dynamic content not announced

---

## Color Contrast Verification

### WCAG 2.1 AA Requirements
- **Normal Text** (under 18pt): 4.5:1 contrast ratio
- **Large Text** (18pt+ or 14pt+ bold): 3:1 contrast ratio
- **UI Components**: 3:1 contrast ratio for visual indicators

### Testing Tools

#### Browser Extensions
1. **WebAIM Contrast Checker**: [Chrome Extension](https://chrome.google.com/webstore/detail/webaim-contrast-checker/plnahcmcbffbkkhfhkmfhfkmfadgklid)
2. **Colour Contrast Analyser**: [Desktop App](https://www.tpgi.com/color-contrast-checker/)

#### Manual Testing
1. Use browser DevTools to inspect element colors
2. Calculate contrast ratio using online tools
3. Verify all text meets minimum requirements

### Elements to Check

#### Text Colors
- [ ] Body text on white background
- [ ] Body text on colored backgrounds
- [ ] Heading text on all backgrounds
- [ ] Link text on all backgrounds
- [ ] Button text on button backgrounds
- [ ] Error/warning/success message text

#### UI Elements
- [ ] Form labels
- [ ] Input placeholders
- [ ] Button text
- [ ] Badge text
- [ ] Status indicators
- [ ] Chart text and labels
- [ ] Tooltip text

#### Background Colors
- [ ] Card backgrounds
- [ ] Modal backgrounds
- [ ] Dropdown backgrounds
- [ ] Table row backgrounds
- [ ] Highlighted elements

### Fixed Issues (Already Addressed)
✅ Priority badge colors (high, medium, low)
✅ Recommendation message text
✅ Timing rate text
✅ Winner badge text
✅ Variant stats percentage
✅ Date text in widgets

---

## Form Labels & ARIA Testing

### Testing Checklist

#### Form Labels
- [ ] All inputs have associated `<label>` elements
- [ ] Labels use `htmlFor` and inputs use `id`
- [ ] Labels are visible and descriptive
- [ ] Required fields are indicated
- [ ] Error messages are associated with inputs

#### ARIA Attributes
- [ ] `aria-label` used when label is not visible
- [ ] `aria-labelledby` used to reference visible labels
- [ ] `aria-describedby` used for help text
- [ ] `aria-required` used for required fields
- [ ] `aria-invalid` used for error states
- [ ] `aria-live` used for dynamic content
- [ ] `aria-expanded` used for collapsible content
- [ ] `aria-hidden` used appropriately

#### Form Elements
- [ ] Text inputs have labels
- [ ] Number inputs have labels
- [ ] Date inputs have labels
- [ ] Select dropdowns have labels
- [ ] Checkboxes have labels
- [ ] Radio buttons have labels
- [ ] Textareas have labels
- [ ] File inputs have labels

### Fixed Issues (Already Addressed)
✅ Job search filter inputs
✅ Job pipeline checkboxes
✅ Statistics date inputs
✅ Pipeline toolbar selects
✅ Career growth calculator inputs

---

## Focus Indicators

### WCAG 2.1 Requirements
- Focus indicators must be visible
- Focus indicators must have at least 3:1 contrast
- Focus indicators must be at least 2px thick

### Testing Checklist

#### Focus Visibility
- [ ] All interactive elements show focus indicator
- [ ] Focus indicator is visible on all backgrounds
- [ ] Focus indicator has sufficient contrast (3:1)
- [ ] Focus indicator is at least 2px thick
- [ ] Focus indicator is not obscured by other elements

#### Focus Styles
- [ ] Buttons have visible focus outline
- [ ] Links have visible focus outline
- [ ] Form inputs have visible focus outline
- [ ] Select dropdowns have visible focus outline
- [ ] Checkboxes/radio buttons have visible focus
- [ ] Tabs have visible focus indicator
- [ ] Modals trap focus correctly

#### Custom Focus Styles
- [ ] Custom focus styles meet contrast requirements
- [ ] Focus styles are consistent across the app
- [ ] Focus styles are not removed with `outline: none` without replacement

### Common Issues
- [ ] **No Focus Indicator**: `outline: none` without replacement
- [ ] **Low Contrast**: Focus indicator doesn't meet 3:1
- [ ] **Too Thin**: Focus indicator less than 2px
- [ ] **Hidden Focus**: Focus indicator obscured by z-index

---

## Assistive Technology Testing

### Testing with Screen Readers

#### NVDA Testing (Windows)
1. Start NVDA
2. Navigate through each page
3. Test all interactive elements
4. Verify all content is accessible
5. Document any issues

#### JAWS Testing (Windows)
1. Start JAWS
2. Navigate through each page
3. Test all interactive elements
4. Verify all content is accessible
5. Document any issues

#### VoiceOver Testing (macOS/iOS)
1. Enable VoiceOver (Cmd+F5)
2. Navigate through each page
3. Test all interactive elements
4. Verify all content is accessible
5. Document any issues

### Testing with Keyboard Only
1. Disable mouse/trackpad
2. Navigate entire application with keyboard only
3. Complete all user flows
4. Verify all functionality is accessible
5. Document any issues

### Testing with Zoom
1. Zoom browser to 200%
2. Verify all content is readable
3. Verify layout doesn't break
4. Verify all functionality works
5. Test at 400% zoom

### Testing with High Contrast Mode
1. Enable Windows High Contrast Mode
2. Verify all content is visible
3. Verify all functionality works
4. Document any issues

---

## Issue Priority & Fixing

### Priority Levels

#### Critical (P0)
- Blocks users from completing tasks
- Violates WCAG 2.1 Level A requirements
- Must fix immediately

**Examples:**
- Missing form labels
- Keyboard traps
- Missing focus indicators
- Insufficient contrast (< 3:1)

#### High (P1)
- Significant impact on usability
- Violates WCAG 2.1 Level AA requirements
- Fix in current sprint

**Examples:**
- Missing ARIA labels
- Insufficient contrast (3:1 - 4.5:1)
- Poor heading structure
- Missing alt text

#### Medium (P2)
- Some impact on usability
- Best practice violations
- Fix in next sprint

**Examples:**
- Redundant ARIA attributes
- Minor contrast issues
- Missing skip links
- Non-critical heading issues

#### Low (P3)
- Minimal impact
- Enhancement opportunities
- Fix when convenient

**Examples:**
- Minor ARIA improvements
- Enhanced descriptions
- Additional skip links

### Fixing Process
1. **Identify Issue**: Use automated tools or manual testing
2. **Document Issue**: Create issue ticket with:
   - Description
   - Location (page, component)
   - Severity
   - Steps to reproduce
   - Screenshot/video
3. **Fix Issue**: Implement fix following WCAG guidelines
4. **Verify Fix**: Re-test with tools and assistive technology
5. **Document Fix**: Update accessibility documentation

---

## Verification Checklist

### Automated Testing
- [ ] Lighthouse accessibility score: 95+
- [ ] axe DevTools: 0 critical, 0 serious violations
- [ ] WAVE: 0 errors
- [ ] All automated checks pass

### Manual Testing
- [ ] Keyboard navigation works on all pages
- [ ] Screen reader testing completed (NVDA/JAWS/VoiceOver)
- [ ] All color contrast ratios meet WCAG AA
- [ ] All form elements have labels
- [ ] All interactive elements have focus indicators
- [ ] All images have alt text
- [ ] Heading hierarchy is logical
- [ ] ARIA attributes are used correctly

### Page-by-Page Verification

#### Public Pages
- [ ] Home page
- [ ] Login page
- [ ] Register page
- [ ] Forgot password page
- [ ] Reset password page

#### Protected Pages
- [ ] Dashboard/Jobs page
- [ ] Statistics page
- [ ] Profile page
- [ ] Interview preparation pages
- [ ] Network page
- [ ] Offer comparison page
- [ ] Career growth calculator
- [ ] Resume builder
- [ ] Cover letter page

### Component Verification
- [ ] Navigation bar
- [ ] Job pipeline
- [ ] Job search filters
- [ ] Forms (all types)
- [ ] Modals
- [ ] Dropdowns
- [ ] Charts (if keyboard accessible)
- [ ] Tables
- [ ] Buttons
- [ ] Links

---

## Testing Tools & Resources

### Browser Extensions
- **axe DevTools**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Built into Chrome DevTools
- **WebAIM Contrast Checker**: Color contrast verification

### Desktop Tools
- **NVDA**: Free screen reader for Windows
- **JAWS**: Professional screen reader for Windows
- **Colour Contrast Analyser**: Desktop contrast checker

### Online Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Documentation
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

---

## Testing Schedule

### Pre-Release Testing
1. **Week 1**: Automated testing (Lighthouse, axe, WAVE)
2. **Week 2**: Keyboard navigation testing
3. **Week 3**: Screen reader testing
4. **Week 4**: Color contrast verification
5. **Week 5**: Final verification and fixes

### Continuous Testing
- Run automated tests before each deployment
- Test new features with keyboard and screen reader
- Verify color contrast for new UI elements
- Check form labels for new forms

---

## Issue Tracking Template

```markdown
### Issue: [Title]
**Severity**: Critical / High / Medium / Low
**WCAG Level**: A / AA / AAA
**WCAG Criterion**: [e.g., 1.4.3 Contrast (Minimum)]

**Description**:
[Detailed description of the issue]

**Location**:
- Page: [Page URL or name]
- Component: [Component name]
- Element: [Specific element]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshot/Video**:
[Link to screenshot or video]

**Fix**:
[Description of fix applied]

**Verification**:
- [ ] Automated test passes
- [ ] Manual test passes
- [ ] Screen reader test passes
- [ ] Keyboard navigation works
```

---

## Sign-Off

### Testing Completed By
- **Name**: ________________
- **Date**: ________________
- **Tools Used**: ________________

### Verification
- **Lighthouse Score**: _____ / 100
- **axe Violations**: Critical: ___, Serious: ___, Moderate: ___, Minor: ___
- **WAVE Errors**: ___
- **Keyboard Navigation**: ✅ Pass / ❌ Fail
- **Screen Reader**: ✅ Pass / ❌ Fail
- **Color Contrast**: ✅ Pass / ❌ Fail

### Approval
- **QA Lead**: ________________
- **Date**: ________________
- **Status**: ✅ Approved / ❌ Needs Fixes

---

## Notes
- Update this document as new features are added
- Document any accessibility workarounds implemented
- Keep testing tools updated
- Review WCAG guidelines regularly

---

**Last Updated**: 2024
**Maintained By**: QA Team

