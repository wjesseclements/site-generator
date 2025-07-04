# Template Gallery Feature

## Overview
Interactive template gallery allowing users to browse and select from pre-built website templates. Each template includes configuration parameters, cost estimates, and deployment options.

## Core Functionality
- Display 4 pre-built templates with cards showing details
- Interactive hover effects and animations
- Template configuration modal with parameter forms
- Real-time cost estimation
- Parameter validation and form handling

## Templates Available
1. **Data Explorer** - Interactive database dashboard (Analytics, $0.12/hour)
2. **Company Pulse** - Corporate announcement platform (Communication, $0.08/hour)
3. **PixelWorks** - Image transformation studio (Media, $0.15/hour)
4. **Team Polls** - Real-time polling platform (Engagement, $0.10/hour)

## Files
- `/frontend/lib/templates.ts` - Template definitions and configuration
- `/frontend/app/page.tsx` - Main gallery UI with grid layout
- `/frontend/components/template-modal-v2.tsx` - Configuration modal
- `/frontend/components/template-card-v2.tsx` - Individual template cards

## Technical Implementation
- **UI**: Dark theme with gradient backgrounds, inline CSS styling
- **State Management**: React hooks for modal state and form data
- **Validation**: Form validation for required fields and data types
- **Styling**: Responsive grid layout with hover animations
- **Parameter Types**: text, select, number, boolean with proper UI components

## Configuration Parameters
Each template supports dynamic parameters:
- Text inputs (site name, descriptions)
- Select dropdowns (themes, regions)
- Number inputs (capacity, limits)
- Boolean toggles (features, settings)

## Integration Points
- Triggers deployment creation via API when template is configured
- Passes parameters to Terraform runner for infrastructure provisioning
- Connects to real-time status updates during deployment