---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'Travel Planning Module — Epic 10 per Ottoboard'
session_goals: 'Analizzare criticamente i requisiti già definiti, trovare edge cases, problemi UX/tecnici non considerati, suggerire miglioramenti e feature mancanti, identificare rischi implementativi. Output: requisiti raffinati pronti per aggiornare CLAUDE.md e creare Epic 10.'
selected_approach: 'AI-Recommended — Critical Analysis + Creative Expansion'
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session — Travel Planning Module (Epic 10)

**Facilitator:** Mary 📊 Business Analyst
**Date:** 2026-03-26

## Session Overview

**Topic:** Travel Planning Module da aggiungere a Ottoboard
**Goals:** Analisi critica e completamento requisiti per Epic 10

### Requisiti già definiti (da conversazione precedente)

**Entità viaggio:** cover photo, stato (bozza/pianificato/in corso/completato), date, partecipanti, share_token.

**Sezioni:**
1. **Luoghi** — lista unificata (ristorante|bar|attrazione), link Maps con parsing coordinate, descrizione, prezzo/persona, filtrabili/ordinabili, mappa Leaflet in modale
2. **Alloggi** — radio button group (uno attivo), check-in/check-out, prezzo totale, link booking + maps
3. **Trasporti** — outbound vs locali, prezzo (toggle per persona/totale)
4. **Itinerario** — agenda X giorni, fasce orarie, DnD da luoghi, orario preciso opzionale, check-in/out automatici
5. **Stima costi** — readonly, totale + quota/persona, breakdown, confermato vs stimato
6. **Export PDF** — @react-pdf/renderer
7. **Genera percorso** — URL waypoints Google Maps (free)
8. **Condivisione** — /shared/[token], readonly, permanente

### Decisioni già prese
- Coordinate da parsing link Google Maps (approccio furbo)
- No valuta, no checklist, no tipo viaggio, no note generali
- react-pdf per export
- Stato viaggio + cover photo inclusi

---

## Decisioni Finali (post-brainstorming)

### Entità Viaggio
- Campi: `id`, `user_id`, `nome` (coincide con destinazione), `cover_photo_url` (Supabase Storage), `stato` (bozza|pianificato|in_corso|completato), `data_inizio`, `data_fine` (nullable), `partecipanti`, `share_token` (nullable — attivabile/disattivabile da lista), `created_at`
- Lista viaggi: **card grid** (2 col desktop / 1 mobile) con cover photo

### Luoghi (lista unificata)
- `tipo`: ristorante | bar | attrazione
- Mappa Leaflet in modale se coordinate disponibili
- Se parsing Maps fallisce → fallback manuale lat/lon (coordinate opzionali, link rimane cliccabile)
- Filtrabili per testo + categoria, ordinabili per prezzo
- Modellati come **riferimento** nell'itinerario (non copia) → aggiornamenti propagati

### Alloggi
- Più alloggi permessi, con validazione date non sovrapposte (warning inline se si tenta di attivare due alloggi con date sovrapposte)
- Ogni alloggio ha toggle **"Includi in stima: sì/no"** (default ON)
- Se date non sovrapposte: tutti ON di default, tutti contribuiscono
- Se date sovrapposte: uno solo può essere ON (sistema blocca con errore inline)
- Singolo alloggio: toggle ON automatico, nessuna UI speciale
- Ogni alloggio inserisce check-in/out nel giorno corretto dell'itinerario automaticamente

### Trasporti
- Categoria: outbound | locale
- Prezzo con toggle per_persona / totale

### Itinerario
- Abilitato solo se date viaggio definite (bozza senza date → disabilitato con messaggio)
- Se date cambiano: giorni aggiunti = vuoti, giorni rimossi = item eliminati (con warning)
- Navigazione giorni: **scroll/tab orizzontale** stile calendario
- Item = riferimento a luogo o evento automatico (check-in/checkout alloggio)
- Orario preciso opzionale per ogni item

### Stima Costi (readonly)
- Include: alloggi (somma prezzi) + attrazioni (prezzo × partecipanti) + trasporti
- **Esclusi**: ristoranti e bar (solo stima non attendibile)
- Mostra: totale complessivo + quota per persona

### Export PDF
- **Due opzioni**: "Itinerario snello" (solo agenda) e "Itinerario completo" (agenda + luoghi + alloggi + trasporti + stima costi)
- Generazione lato client con @react-pdf/renderer (dynamic import, no SSR)

### Genera Percorso
- URL Google Maps Directions con lat/lon dei luoghi nell'itinerario in ordine
- Funziona con coordinate da parsing o da inserimento manuale

### Condivisione
- `share_token` attivabile/disattivabile da lista viaggi
- Disattivazione = token revocato (impostato a null)
- Route `/shared/[token]` → 404 se token non trovato o revocato
- Tutti i dati visibili, readonly

### Note Tecniche da Aggiungere a CLAUDE.md
- `react-leaflet` richiede `dynamic(() => import(...), { ssr: false })` su OGNI componente mappa
- `@react-pdf/renderer` client-only, usare `dynamic` con `ssr: false`
- Parsing Google Maps URL: formati multipli (link corto, long URL, mobile). Fallback manuale obbligatorio se parsing fallisce.
- Google Maps Directions URL accetta `lat,lon` direttamente come waypoints (no API key)
- Supabase Storage free tier = 1GB, sufficiente per cover photo uso personale
- Condivisione pubblica: scelta consapevole — dati visibili a chiunque abbia il link. Mitigazione: revoca token da UI.

