# Page Import Prompt

Use this prompt to import a webpage and implement it as AEM Edge Delivery Services blocks.

---

Use the web-to-mcp tool with reference {REFERENCE_ID} to implement the fetched website component corresponding to this page {PAGE_URL}

**Block Identification:**
Identify blocks by visual sections (hero, navigation bars, card grids, text sections, footer). Skip header/navigation if they are site-wide components not specific to this page.

**Image Handling:**
Keep image URLs absolute including the domain (use live URLs from the original site).

**Implementation:**
Split the component into blocks and implement each of them as a new block using the building-blocks skill. Keep all CSS changes in the block CSS with block-specific selectors to prevent style impact to other blocks. For each block import exactly all the content (text, images, etc.) from the original page.

**Testing:**
Create a local test page, make the look and feel of the new blocks exactly like the original page.

**Visual Validation:**
Validate visual exactness with pixelmatch. Compare against the scraped screenshot (from import-work/screenshot.png) rather than the live site to avoid content drift issues.

For validation, distinguish between:
- **Structural/styling differences** (fonts, colors, layout, spacing) - must be <10%
- **Content differences** (different images due to live site updates or CORS issues) - acceptable if structure matches, document the reason

**Iteration:**
Reiterate in loop until difference for each block is below 10% (keep iterating only for blocks above 10%). Maximum 5 iterations per block. If still >10% after max iterations, document the remaining differences and root cause in the status file.

**Progress Tracking:**
Use a todo list to stay on the plan and write status updates in a file while you are progressing.

---

## Example Usage

```
Use the web-to-mcp tool with reference efab8d08-8025-4817-8dc2-a7ba7dd596f2 to implement
the fetched website component corresponding to this page https://www.example.com/page.html
```

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{REFERENCE_ID}` | MCP tool reference ID for pre-scraped content | `efab8d08-8025-4817-8dc2-a7ba7dd596f2` |
| `{PAGE_URL}` | URL of the page to import | `https://www.virginatlanticcargo.com/gb/en.html` |
