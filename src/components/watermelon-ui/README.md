# Watermelon UI for Ottoboard

Adapted from [Watermelon UI Registry](https://github.com/WatermelonCorp/watermellon-registry), retrieved on 2026-09-03. The upstream MIT license is preserved in LICENSE.

Source primitives: `src/components/watermelon-ui`. Dashboard composition reference: `src/components/dashboards/tallie-dashboard`.

Local adaptations: namespaced `wm-` color tokens, application-wide themed portals, Italian accessible labels, standard Radix state and focus management, and CSS transitions respecting reduced motion. Dialogs, menus, progress and tabs use thin Radix wrappers in place of the registry's animated helper implementations. No upstream demo data is used. Ottoboard provides its own global cookie-backed light/dark theme and a Fitness accent. Shared UI adapters live in `src/components/ui`; tab panels preserve state and suspend hidden chart containers.

These components are application-owned source, not an automatically synchronized dependency. Review future upstream changes before applying them.
