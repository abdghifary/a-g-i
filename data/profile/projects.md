# Projects

## Brewmulator

Agi is building Brewmulator, a physics-based coffee extraction simulator designed to help baristas and coffee enthusiasts predict how brew parameters affect extraction yield. The application combines a Nuxt 4 frontend with an AssemblyScript WebAssembly physics engine to simulate brewing scenarios with scientifically-grounded extraction kinetics.

The simulator currently supports five brew methods (V60, French Press, Espresso, AeroPress, Cold Brew) and includes ten real grinder profiles with bimodal particle size distribution modeling. Users can adjust parameters like grind size, temperature, time, and ratio, with real-time extraction curve visualization and a V60 pour schedule editor featuring templates from industry experts such as Hoffmann, Rao, and Kasuya.

The physics engine implements models for saturation-aware reversible kinetics, two-phase extraction, thermal modeling, and roast-dependent parameters. However, the engine remains a work in progress and requires real-world brew sample data for calibration and validation. Gathering this experimental data is the current blocker.

### Tech Stack

- **Framework:** Nuxt 4 (Vue 3, TypeScript, SSR/SSG)
- **Physics Engine:** AssemblyScript compiled to WebAssembly
- **State Management:** Pinia with composable architecture
- **UI:** Nuxt UI (Headless UI + Tailwind CSS)
- **Visualization:** ApexCharts with lazy loading
- **Testing:** Vitest with unit test coverage
- **Build Tooling:** Vite with WASM and top-level-await plugins

### Current Status

- Active development with a three-phase roadmap (two-phase kinetics implemented, stochastic realism and method-specific hydraulics planned)
- Physics engine built on 15+ peer-reviewed scientific references but pending real-world calibration
- SSR load time optimized from 1,630ms to 27ms through lazy loading and deferred hydration
- TypeScript strict mode maintained with no type suppression
- Blocked on gathering real brew samples for model validation

### Links

- **Live Site:** brewmulator.app
- **Repository:** github.com/abdghifary/brewmulator