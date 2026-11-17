# English and Spanish implementation plan

User requested English as their primary language, English GitHub copy, and confirmed an English / Español selector. Sol subagents are explicitly preferred.

- [ ] Add persisted `settings.language`, default English, normalize unsupported/legacy values, and synchronize all windows without changing build data.
- [ ] Translate UI, accessibility labels, OCR status, shortcuts, native tray, and installer language selection. Display known civilization labels in the selected language while preserving stored keys.
- [ ] Provide a separately attributed English edition of all 25 starter builds; preserve Spanish edition and personal edits.
- [ ] Translate public documentation and GitHub release text. Package a new 0.3.1 beta, leaving the existing installer version immutable.
- [ ] Verify persistence/backup, locale-sensitive helper labels, civilization matching, pack invariants, Svelte checks, native build and bilingual UI switching. Install and publish the verified update.

Implementation: a tiny Svelte locale store and explicit Spanish/English text pairs, without translation dependencies. Content remains user-owned: changing UI language does not translate or replace personal builds. Independent Sol agents own components, public docs, and starter-pack translation; root owns integration and release.
