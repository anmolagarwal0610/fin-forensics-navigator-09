## Expand Marquee Selection Area in FileUploader

### Problem
The marquee (rubber-band) selection can only be initiated in the small vertical gaps between file cards. Users cannot start the selection from the left or right sides of the file list because the container has no horizontal padding.

### Solution
Add horizontal padding to the file list container and adjust the marquee positioning logic to account for the padding offset.

### Changes

**File: `src/components/app/FileUploader.tsx`**

1. **Container padding (line ~452)**:
   - Change from: `className="relative space-y-2 select-none"`
   - Change to: `className="relative space-y-2 select-none px-4 -mx-4"`
   
   The `px-4` adds 16px of clickable padding on left/right. The `-mx-4` compensates to maintain visual alignment with the parent container.

2. **Marquee rectangle positioning (line ~297-302 in useEffect)**:
   - The marquee rectangle uses coordinates relative to the container. With padding added, the marquee origin needs to account for this.
   - Update `marqueeStartRef` initialization to use the padded coordinate space, OR
   - Keep the marquee logic unchanged since `getBoundingClientRect()` already returns coordinates relative to the viewport, and the subtraction `e.clientX - rect.left` will correctly account for the new padding.

   Actually, looking more carefully - the marquee calculation uses `rect.left` from `getBoundingClientRect()`, so adding padding will automatically be handled because `rect.left` will shift. The key is just ensuring users have padded area to click.

### Visual Result
- Users can now click and drag from 16px outside the left edge of file cards
- Users can now click and drag from 16px outside the right edge of file cards  
- The marquee selection "field area" is significantly expanded while maintaining the same visual layout

### Testing
- Verify marquee selection works when clicking in the padded left/right margins
- Verify file cards still align visually with the parent container
- Verify existing drag-and-drop and click-selection behaviors remain functional