# Astera brand notes

Scope: four supplied website screenshots and two local logo files. Screenshot hex values below are representative sampled colors; gradients, antialiasing and compression create many nearby pixel values. The file set does not establish exact font files, responsive behavior, or motion behavior.

## Screenshot observations

1. **Pictures/1.1.PNG — Homepage hero.** White navigation over a pale blue gradient hero; a large dark, heavy headline and blue eyebrow sit opposite a rounded product-video thumbnail. Sampled colors include `#FFFFFF`, `#F7FAFF`, `#E1ECFB`, `#0B1524`, `#005CCC`, and muted blue-gray `#5A6B7D`. Headline appears geometric sans, very bold, tightly tracked, title case, large with compact line spacing; body is a lighter, more open sans at moderate size. Page uses generous whitespace, a wide two-column hero, capsule eyebrow, rounded filled and outlined CTAs, and a rounded media frame with soft shadow. Navigation is a horizontal text menu with chevrons and a prominent filled contact button. Voice is confident and product-led; the headline is a short multi-line promise and body copy is a longer explanatory sentence. No motion can be determined from a still image.

2. **Pictures/1.2.PNG — Solutions / product capability cards.** White page with centered heading and subtitle above a three-column card grid. Sampled colors include `#FFFFFF`, `#0B1524`, `#5A6B7D`, `#005CCC`, `#E6EDF5`, and `#0078D4`. Heading is oversized and bold; card headings are bold and smaller; descriptions are medium-sized muted blue-gray with relaxed line spacing. Cards have thin cool borders, large rounded corners, a narrow blue left accent, roomy padding and little visible shadow. Links are bold blue text with a simple arrow. Voice is explanatory and practical, using short capability titles and several-sentence descriptions; title case appears in headings, sentence case in body.

3. **Pictures/1.3.PNG — Measurable impact / metrics section.** White background, centered dark headline, four pale blue metric cards, with a dark navy section beginning at the bottom. Sampled colors include `#FFFFFF`, `#EEF3FD`, `#0B1524`, `#1668DC`, `#005CCC`, and navy near `#001838`. Large metric figures are bright blue and bold; card labels bold and body centered, muted, with relaxed line spacing. Four evenly spaced cards have generous padding, rounded corners and a soft lower shadow. A high-contrast dark navy band provides section transition. Voice is concise and proof-oriented: short headline, large numeric proof points, brief supporting explanation. No animation is inferable.

4. **Pictures/1.4.png — Document workflow feature / accordion section.** A pale blue metrics strip sits above a white area with a wide accordion panel. Sampled colors include `#F8FAFF`, `#FFFFFF`, `#EFF5FF`, `#E8F0FE`, `#005CCC`, `#1A1A1A`, and a light border near `#E7ECF3`. The metric numbers are large, blue and bold; captions are smaller regular sans. The accordion has a saturated blue header with white centered bold text; rows use very pale blue surfaces, thin separators, left-aligned medium-weight titles, and right-aligned circular chevron controls. A selected/hover-like row appears tinted blue, but the still cannot prove its trigger. Voice uses compact benefit statements in title case and plain explanatory labels. Motion is unknown.

## 1. Palette table

Values are sampled from the screenshots and consolidated into representative brand tokens; use exact source artwork for the logo colors. Contrast ratios are WCAG relative-luminance calculations for the indicated solid colors (not gradients).

| Token name | Hex | Role | Contrast notes |
|---|---|---|---|
| Paper | `#FFFFFF` | page background, card surface, inverse text | `#0B1524` on white: 18.31:1; `#5A6B7D`: 5.48:1; `#005CCC`: 6.17:1. |
| Cloud | `#F8FAFF` | pale page background | Near-white; use dark text. |
| Pale blue | `#EEF3FD` | metric/card surface, section background | `#0B1524` on this: 16.46:1; `#005CCC`: 5.55:1. |
| Mist blue | `#E1ECFB` | subtle gradient/selected surface | Use dark text or blue only after checking the exact shade. |
| Navy ink | `#0B1524` | primary text, headings | On white: 18.31:1; on `#EEF3FD`: 16.46:1. |
| Muted slate | `#5A6B7D` | body text, muted text | On white: 5.48:1; suitable for normal text. |
| Astera blue | `#005CCC` | accent, links, primary button | On white: 6.17:1; white on it: 6.17:1; on pale blue: 5.55:1. |
| Bright blue | `#1668DC` | metric figures, active emphasis | Screenshot sample; check exact uses against pale surfaces before small text. |
| Mid blue | `#0078D4` | secondary blue accent | Screenshot sample; use dark or white text only after checking chosen pairing. |
| Logo blue | `#1C5698` | logo lettering/mark | On white: 7.41:1. |
| Orange | `#F08018` | small logo accent | Decorative accent only; do not use for small text on white. |
| Border | `#E6EDF5` | card and row borders | Decorative; do not use as text. |
| Near-black | `#1A1A1A` | dark text seen in feature area | On white exceeds AA. |
| Deep navy | `#001838` | dark section surface | White text on it: 17.68:1. |

The screenshots also contain many gradient stops and antialiased shades. Keep gradients decorative and choose foreground contrast against the least favorable point behind the text.

## 2. Typography

- **Observed classification:** headings look geometric sans (round forms, broad proportions, heavy weights); body/navigation look geometric or clean grotesque sans. The screenshots alone cannot identify the actual font.
- **Likely-family guesses only:** **GUESS — Poppins** (geometric, closest visual fit; SIL Open Font License, bundle locally), **GUESS — Inter** (grotesque, SIL Open Font License, bundle locally), **GUESS — Montserrat** (geometric, SIL Open Font License, bundle locally). Verify each font's license file and chosen static/variable files before redistributing; do not fetch fonts at runtime.
- **Suggested stack:** `"Poppins", "Avenir Next", Avenir, "Segoe UI", Arial, sans-serif` (system fallbacks keep the app usable offline; if Poppins is bundled, declare it with a local `@font-face`).
- **Observed hierarchy:** very bold/extra-bold large headings; bold card titles and buttons; regular body copy; medium navigation. Headings are tight to moderately tight in line height, body is more open. No reliable exact measurements can be extracted from scaled screenshots.
- **Suggested implementation scale (design translation, not measured source values):** 12/14/16px utility/body; 18/20px card headings; 28px section heading; 40–56px hero heading. Body line-height 1.5–1.65, headings 1.05–1.2; slightly negative heading tracking, neutral body tracking. Use sentence case for body and title case where the screenshots show title-style headings.

## 3. Shape, spacing and elevation

- Broad desktop content width, centered alignment for feature sections, left-aligned hero copy, balanced columns and consistent gutters.
- Spacious marketing layout with large section gaps and card padding. Translate to a 4px spacing grid; retain compact density inside the analytics product where data needs room.
- Rounded card corners appear roughly 16–24px in these screenshots; CTA corners roughly 10–14px; small badges are pill-shaped. These are visual estimates.
- Borders are thin and cool-toned. Shadows are soft and diffuse, mostly under cards/media; avoid heavy outlines and hard shadows.
- Hero uses a pale blue gradient; other surfaces are mostly flat white or pale blue. Dark navy appears as a full-width section background.
- Screenshots show desktop navigation only; mobile navigation behavior is unknown. Buttons combine saturated blue fill/white text or white fill/blue border and text. Approximate CTA height is generous; preserve the project's 44px minimum and use 16px minimum input text.

## 4. Component styles

| Component | Brand translation |
|---|---|
| Button | Astera blue fill with white bold text for primary; white surface with blue border/text for secondary; rounded rectangle, comfortable horizontal padding, 44px minimum height. Use a visible non-color focus ring. |
| Card | White or pale blue surface, 1px cool border, 16–24px radius, generous padding; optional narrow blue edge accent or restrained soft shadow. |
| Nav item | Medium-weight dark slate text, chevron for expandable items, active state with pale blue backing and blue text plus a second cue (underline, marker, or icon). Keep touch target >=44px. |
| Badge | Compact pale tint with clear icon and text; rounded/pill shape. Do not rely on color alone for pipeline status. |
| Input | White surface, cool border, rounded corners, readable label and clear focus ring; keep 16px minimum font and 44px minimum height. |

These are proposed translations of marketing components to the analytics app, not exact dimensions from a design system manual.

## 5. Icons and imagery

- Navigation uses simple, thin-to-medium outline chevrons; the contact/action imagery is minimal. No complete icon system is shown, so use consistent inline SVG line icons with rounded joins and a consistent stroke width. Avoid mixing filled and outlined styles without purpose.
- The hero contains a product promo/video thumbnail with blue-toned, slightly dimensional UI imagery. Most other content is typography and cards; avoid adding stock imagery to the analytics interface.
- Blue is the brand accent; orange is only a small logo detail in the supplied files. Keep data visualization colors distinct from brand accent and label series directly where possible.

## 6. Voice

Confident, clear, and business-oriented. Lead with a short outcome or capability, then explain it in plain language. Headlines are short and assertive; support copy is a complete sentence or a compact paragraph. Marketing headings often use title-style capitalization, while explanatory text uses sentence case. For the analytics mockup, keep chat summaries direct and factual, without marketing claims.

## 7. Logo usage rules

| File | Inspection | Recommended use |
|---|---|---|
| `logo/image.png` | PNG, 253 × 69 px, RGBA channel present but every pixel is opaque (no transparency); white background; blue wordmark with orange accent. | Horizontal wordmark for a white/light surface. Its white rectangle will show on dark backgrounds; use a verified transparent/light variant or a fitted white backing instead. |
| `logo/astera_software_logo.jpg` | JPEG, 200 × 200 px, opaque white background; standalone blue/orange “A” mark. | Square mark for light surfaces or a favicon source after cropping/creating a favicon asset. White background prevents direct clean use over dark surfaces. |

- A standalone mark is present in the square JPG and can work as the basis of an app icon/favicon, though JPG is not ideal for a favicon; produce a local PNG/ICO from the supplied mark only if asset creation is later authorized.
- No transparent logo or inverse/light logo is present. Do not place these files directly on dark surfaces expecting transparency.
- Minimum size is not documented by the supplied assets. Practical starting point: wordmark height >=24px; standalone mark >=24px; avoid reducing the wordmark below about 100px wide where legibility suffers. These are recommendations, not official rules.
- No official clear-space specification is visible. Use at least the height of the logo mark as clear space on every side; avoid crowding or altering the proportions/colors.

## 8. Mapping to the app CSS variables

| Existing variable | Suggested value | Reason |
|---|---|---|
| `--surface` | `#FFFFFF` | Main card and page surface. |
| `--text` | `#0B1524` | Sampled dark headline/body text. |
| `--muted` | `#5A6B7D` | Muted blue-gray body copy; AA on white. |
| `--accent` | `#005CCC` | Strong sampled CTA/link blue with AA contrast on white. |
| `--success` | `#167A45` | Proposed status green; not an observed Astera brand color. Check on both themes. |
| `--running` | `#1768C4` | Proposed status blue, harmonized with brand blue. |
| `--failed` | `#B42318` | Proposed status red with clear failure semantics. |
| `--scheduled` | `#9A5B00` | Proposed status amber/brown with readable contrast on light surfaces. |

Status colors are recommendations, not found in the screenshots. Always show status icon plus text. Create dark-theme-specific semantic tokens and verify contrast for each pairing instead of merely inverting the light palette.

## 9. Conflicts and risks

- **Touch:** marketing controls look generously sized, but screenshots do not certify dimensions. Preserve >=44 × 44px controls, especially nav, chips, and icon buttons.
- **Inputs:** no input fields are shown. Keep input text at least 16px as required by the app brief.
- **AA contrast:** sampled dark ink, muted slate and primary blue meet AA on white; decorative orange and light borders do not serve as text colors. Recalculate for gradients, tints, status badges and dark mode.
- **Offline fonts:** guessed fonts are not evidence of the site's actual font. Bundle a properly licensed local font and license notice if selected; retain a system stack and no CDN dependency.
- **Dark mode:** supplied logos have opaque white backgrounds; provide a suitable backing or a separately authorized inverse asset. Palette samples are mostly light-theme, so dark semantic colors need deliberate contrast checks.
- **Status palette:** brand screenshots do not show running/success/failed/scheduled statuses. The proposed status colors are separate from the observed palette and must remain icon-plus-label.

## 10. Confidence notes

- **High confidence:** screenshot section descriptions; dominant white, blue, pale-blue and navy surfaces; heavy sans headings; card/CTA composition; supplied logo formats, dimensions and opacity; no transparent logo available.
- **Medium confidence:** representative sampled palette roles, muted body tone, rounded card styling, outline-chevron navigation, and observed content hierarchy. Pixel sampling finds exact screenshot pixels, but screenshots are scaled captures and contain gradients/compression/antialiasing.
- **Low confidence / guesses:** exact font family, official design tokens, precise radii/spacing, responsive behavior, motion, hover behavior, minimum logo sizes, and official clear-space rules. Values labeled as recommendations should be treated as design translations, not official Astera specifications.
