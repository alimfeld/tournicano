# Agent Guidelines for Tournicano

## Build/Test Commands
- **Dev server**: `npm run dev` - Start Vite dev server
- **Build**: `npm run build` - Build production bundle
- **Test all**: `npm test` - Run all tests with Vitest
- **Test single file**: `npx vitest src/model/Tournament.test.ts` - Run specific test file
- **Test watch mode**: `npm test -- --watch` - Run tests in watch mode

## Code Style
- **Imports**: Use `.ts` extensions in imports (e.g., `from "./Tournament.ts"`)
- **Formatting**: 2-space indentation, LF line endings, trailing newlines required
- **Types**: Strict TypeScript enabled; no implicit any, unused locals/parameters, or implicit returns
- **Framework**: Mithril.js components using `m()` syntax
- **Naming**: PascalCase for classes/components, camelCase for functions/variables
- **Interfaces**: Use interfaces for public contracts, classes with readonly for implementations
- **Pattern**: Separate interface definitions (e.g., `Tournament.ts`) from implementations (e.g., `Tournament.impl.ts`)
- **Factory pattern**: Use factories for object creation (e.g., `tournamentFactory.create()`)
- **Error handling**: Return success booleans for operations that can fail
- **State management**: Use listener pattern for change notifications (`addListener`, `onchange`)
- **Testing**: Use Vitest with fixtures via `baseTest.extend<Fixture>()` for test setup

## UI/Styling Philosophy
- **Pico CSS First**: Rely on the Pico CSS design system wherever possible
  - Use Pico's semantic HTML components (buttons, forms, tables, etc.)
  - Leverage Pico CSS variables for theming (`--pico-primary`, `--pico-muted-color`, `--pico-spacing`, etc.)
  - Keep custom CSS minimal - only add when Pico doesn't provide the pattern
  - Let Pico handle responsive design and dark mode automatically
