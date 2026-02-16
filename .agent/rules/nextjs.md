---
trigger: model_decision
description: Next Js 16 project guidelines, including coding principles, project structure, conventions, component rules, data & state management, styling, type system, server layer, error handling, best practices, decision trees, checklists, documentation etc
---

# Next.js 16 Project Guidelines
  
## 1. Role & Principles  
  
Senior Next.js 16 developer with React 19, TypeScript strict mode, and Clean Architecture expertise.  
  
| Principle            | Implementation                                          |
| -------------------- | ------------------------------------------------------- |
| Server-First         | Prefer Server Components; Client only for interactivity |
| Type Safety          | Strict mode, no `any`, explicit interfaces              |
| Atomic Design        | Atoms → Molecules → Organisms → Templates → Pages       |
| Dependency Injection | Modular components with clear boundaries                |
  
---  
  
## 2. Technology Stack  
  
| Layer         | Technologies                                                   |
| ------------- | -------------------------------------------------------------- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5+ strict        |
| **Styling**   | TailwindCSS 4, class-variance-authority, clsx + tailwind-merge |
| **UI**        | ShadCN UI, Magic UI (magicui.design), Remix Icons              |
| **Data**      | SWR, Axios, Server Actions                                     |
| **State**     | Zustand (persistence only), React Hook Form + Zod              |
| **i18n**      | next-intl (english is always the prefered and primary reference language)                                              |
  
---  
  
## 3. Project Structure  
  

src/
├── app/ # App Router (entry points only)
│ ├── (private)/ # Auth-required routes
│ ├── (public)/ # Public routes
│ ├── globals.css
│ └── layout.tsx
│
├── presentation/pages/ # Page presentation (injected into app router)
│ └── [domain]/
│ ├── [page].view.tsx
│ ├── [page].model.ts
│ └── [page].types.ts
│
├── presentation/components/ # Atomic Design hierarchy (ONLY FOR REUSABLE COMPONENTS)
│ ├── atoms/ui/ # ShadCN primitives (NEVER MODIFY)
│ ├── molecules/[domain]/ # Branded wrappers by domain
│ ├── organisms/[domain]/ # Complex sections by domain
│ └── templates/ # Non-nested layout structures
│
├── lib/
│ ├── utils.ts # cn() helper
│ └── constants/ # Act as SSOT files, centralizing global constants
│
├── server/
│ ├── actions/
│ ├── services/
│ └── api.ts
│
├── stores/ # Zustand (persistence only)
│
├── types/ # Global type definitions
│ └── [entity].type.ts
│
└── public/

  
---  
  
## 4. Conventions  
  
| Element           | Pattern    | Example                            |
| ----------------- | ---------- | ---------------------------------- |
| File names        | kebab-case | `user-card.tsx`, `auth-service.ts` |
| Folder names      | kebab-case | `user-profile/`, `auth-actions/`   |
| Components        | PascalCase | `UserCard`, `AuthProvider`         |
| Constants         | camelCase  | `maxRetryCount`, `apiBaseUrl`      |
| Variables         | camelCase  | `userData`, `isLoading`            |
| Methods/Functions | camelCase  | `fetchUsers()`, `handleSubmit()`   |

### Component Organization  
  
- Group all components by **domain/module**  
- Each complex component uses Model-View pattern with dedicated folder  
- Page components live in `src/presentation/pages/[domain]/` and are imported into App Router `page.tsx`  
  
### File Structure (Complex Components)  
  

[component]/
├── [component].view.tsx # Pure presentation
├── [component].model.ts # Hooks, state, logic
├── [component].types.ts # Local types (when needed)
└── index.ts

  
---  
  
## 5. Component Rules  
  
### Server vs Client  
  
- **Server Components** (default): Data fetching, static content, SEO  
- **Client Components**: Interactivity, browser APIs, state, effects  
- Add `"use client"` directive only when necessary  
  
### ShadCN UI  
  
- Install via `npx shadcn@latest add <component>`  
- Never modify `atoms/ui/` primitives  
- Create branded wrappers in `molecules/[domain]/` for customization  
- ShadCN primitives are Atoms in Atomic Design  
  
### Templates  
  
- Non-nested layout structures for page composition  
- Define structure without specific content  
- Used for consistent page layouts across domains  
  
---  
  
## 6. Data & State  
  
| Type              | Solution                                 |
| ----------------- | ---------------------------------------- |
| Server data       | SWR with caching, revalidation, mutation |
| Form state        | React Hook Form + Zod validation         |
| UI state          | useState, useReducer, useContext         |
| Persistent client | Zustand (not for fetching)               |
  
### SWR Requirements  
  
- Configure globally with appropriate options  
- Use structured keys for caching 
- Implement error handling and retry logic  
- Add loading states and optimistic updates  via `mutate()`
  
---  
  
## 7. Styling  
  
### Rules  
  
- TailwindCSS only, avoid hardcoded CSS  
- Use `cn()` utility for conditional classes  
- Design tokens from `globals.css` for colors  
- Responsive-first approach  
- Fonts: Fahkwang (headings), Ubuntu (body) defined globally  
  
### Sections  
  
- Use `<section>` tag with lowercase id  
- Leverage templates for consistent layout  
- Primary Button for main actions, Secondary for alternatives  
  
---  
  
## 8. Type System  
  
### Global Types (`src/types/`)  
  
- API responses and data structures  
- Business entities  
- Cross-component interfaces  
- Shared props and state structures  
  
### Local Types  
  
Keep within component folder when used exclusively there.  
  
---  
  
## 9. Server Layer  
  
| Directory          | Purpose                               |
| ------------------ | ------------------------------------- |
| `server/actions/`  | Server Actions consuming services     |
| `server/services/` | API service layer with business logic |
| `server/api.ts`    | Axios client with interceptors        |
  
---  
  
## 10. Error Handling  
  
| Layer      | Approach                                |
| ---------- | --------------------------------------- |
| API        | Axios interceptors with typed responses |
| Components | Error boundaries with `error.tsx`       |
| Forms      | Zod validation with field-level errors  |
| SWR        | `onError` callback with retry logic     |
  
---  
  
## 11. Best Practices  
  
### Do  
  
- Embrace Server Components to minimize client JS  
- Use TypeScript generics and type guards  
- Include `loading.tsx` and `error.tsx` per route  
- Use `metadata` export for SEO  
- Ensure accessibility (ARIA, contrast)  
  
### Don't  
  
- Use `any` type  
- Overuse Client Components  
- Hardcode environment variables  
- Mix multiple state management patterns  
- Modify ShadCN primitives directly  
  
---  
  
## 12. Decision Trees  
  
### State Management  
  
| Need               | Solution            |
| ------------------ | ------------------- |
| Server data        | SWR                 |
| Form data          | React Hook Form     |
| Local UI           | useState/useReducer |
| Cross-component UI | useContext          |
| Persistent client  | Zustand             |
  
### Component Type  
  
| Condition           | Type   |
| ------------------- | ------ |
| Needs interactivity | Client |
| Needs browser API   | Client |
| Needs state/effects | Client |
| Otherwise           | Server |
  
### Type Location  
  
| Scope            | Location               |
| ---------------- | ---------------------- |
| Cross-module     | `src/types/`           |
| Single component | `[component].types.ts` |
  
---  
  
## 13. Checklists  
  
### Component Creation  
  
- [ ] Determine Server or Client Component  
- [ ] Place in correct Atomic Design level  
- [ ] Group by domain/module  
- [ ] Use Model-View pattern for complex components  
- [ ] Define explicit TypeScript interfaces  
- [ ] Use `cn()` for conditional styling  
  
### Page Creation  
  
- [ ] Create in `src/presentation/pages/[domain]/`  
- [ ] Use Model-View-Types structure  
- [ ] Import into App Router `page.tsx`  
- [ ] Add `loading.tsx` and `error.tsx`  
- [ ] Export metadata for SEO  
- [ ] Use `<section>` tags with lowercase ids  
  
---  

## 14. Documentation Access  
  
All library documentation available through **Context7 MCP**. Reference URLs for manual access:  
  
| Library         | URL                  |
| --------------- | -------------------- |
| Next.js         | nextjs.org/docs      |
| React           | react.dev            |
| SWR             | swr.vercel.app       |
| TailwindCSS     | tailwindcss.com/docs |
| ShadCN UI       | ui.shadcn.com        |
| Magic UI        | magicui.design       |
| Zod             | zod.dev              |
| React Hook Form | react-hook-form.com  |
| Zustand         | zustand-demo.pmnd.rs |
| next-intl       | next-intl.dev        |
| Axios           | axios-http.com/docs  |
| Remix Icons     | remixicon.com        |
  
---  
  
## 15. Internationalization  
  
### Configuration  
  
- Use next-intl for multi-language support  
- Review supported locales via messages folder's files
- The en.ts is the dictionary SSOT 
- Locale files organized by feature/domain  
- Server-side locale detection  
  
### Structure  
  

src/
├── messages/
│ ├── pt.json
│ └── en.json

  
---  
  
## 16. Forms  
  
### Requirements  
  
- React Hook Form for state management  
- Zod for schema validation  
- Server Actions for submission  
- Optimistic updates where appropriate  
- Clear error messaging and loading states  
  
### Validation Flow  
  
| Step              | Tool                     |
| ----------------- | ------------------------ |
| Schema definition | Zod                      |
| Form binding      | React Hook Form resolver |
| Field validation  | Real-time with Zod       |
| Submission        | Server Action            |
  
---  
  
## 17. Performance  
  
### Optimization Strategies  
  
| Area       | Approach                      |
| ---------- | ----------------------------- |
| Components | Client Components by default  |
| Images     | next/image with optimization  |
| Fonts      | next/font with preloading     |
| CSS        | TailwindCSS purging           |
| Data       | SWR caching and deduplication |
| Routes     | Route Segment Config          |
  
### Route Segment Config Options  
  
| Option     | Purpose                          |
| ---------- | -------------------------------- |
| dynamic    | Control static/dynamic rendering |
| revalidate | Set ISR interval                 |
| fetchCache | Configure fetch caching          |
  
---  
  
## 18. Accessibility  
  
### Requirements  
  
- Semantic HTML elements  
- ARIA attributes where needed  
- Keyboard navigation support  
- Color contrast compliance  
- Focus management  
- Screen reader compatibility  
  
### ShadCN Accessibility  
  
- Built-in ARIA support  
- Keyboard interactions included  
- Focus trapping in modals  
- Announce dynamic content that AI should follow when generating code, answering questions, or reviewing changes.