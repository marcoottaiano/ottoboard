---
stepsCompleted: [1, 2, 3]
session_topic: 'Evoluzione di Ottoboard — rimozione parti inutili + scoperta nuove direzioni'
session_goals: 'Eliminare modulo Progetti e notifiche push; generare idee per nuovi moduli e integrazioni esterne; nessuna monetizzazione'
selected_approach: 'ai-recommended'
techniques_used: ['SCAMPER Method', 'What If Scenarios', 'Cross-Pollination']
status: 'COMPLETATA'
---

## Session Overview

**Topic:** Evoluzione di Ottoboard — rimozione + nuove direzioni
**Goals:** Snellire l'app, aggiungere moduli utili, integrazioni esterne

---

## Decisioni già prese (da implementare)

- **DA ELIMINARE — Modulo Progetti:** Kanban board, integrazione Linear, KanbanColumnWidget nella home.
- **DA ELIMINARE — Notifiche Push (Fase 11):** Service worker push handler, tabella `push_subscriptions`, colonna `notified_at` su reminders, `NotificationPermissionBanner`, sezione Notifiche in `/profile`, hook `useNotificationPermission`.

---

## Idee generate

### 1. Savings Goals Waterfall ⭐
**Modulo:** Finanze
**Descrizione:** Il saldo totale viene allocato in cascata sugli obiettivi di risparmio ordinati manualmente dall'utente. Ogni obiettivo ha un target, si riempie progressivamente; quando è completato, il surplus scorre all'obiettivo successivo.
**Dettagli:**
- Ogni obiettivo ha nome + importo target
- Ordinamento manuale (drag & drop) per definire la priorità
- Il saldo totale viene distribuito in base all'ordine: prima si riempie l'obiettivo 1, poi il 2, ecc.
- Visualizzazione chiara: obiettivi raggiunti, in corso, non ancora avviati
- Gli obiettivi si aggiornano automaticamente al variare del saldo totale

---

### 2. Weekly Review Modal ⭐
**Modulo:** Home / Trasversale
**Descrizione:** Ogni lunedì, al primo accesso della giornata, si apre automaticamente una modale con il resoconto della settimana precedente.
**Dettagli:**
- Sezione Fitness: n° sessioni, km totali, calorie, minuti
- Sezione Abitudini: % completamento per ogni abitudine
- Sezione Finanze: entrate/uscite, categoria più costosa, delta vs settimana precedente
- Si chiude manualmente e non si riapre fino al lunedì successivo (stato in localStorage o DB)

---

### 3. Modulo Viaggi ⭐⭐
**Modulo:** Nuovo — `/travel`
**Descrizione:** Sezione dedicata alla pianificazione e documentazione dei viaggi.
**Dettagli:**
- **Sezione Viaggio:** meta, date, note generali
- **Itinerario drag & drop:** skeleton giornaliero con slot fissi (Colazione / Mattina / Pranzo / Pomeriggio / Cena / Sera). Le card (attrazioni o ristoranti) si draggano negli slot
- **Sezione Ristoranti:** nome + link Google Maps
- **Sezione Attrazioni:** nome + link
- **Sezione Alloggi:** link Booking, Airbnb o altro
- **Resoconto spese viaggio:** aggregazione costi attrazioni, trasporti, alloggio
- **Export/Import itinerario** (JSON o PDF)
- **Generazione percorso Maps** dai link presenti nell'itinerario
- **Condivisione read-only via link pubblico** (UUID nel link, pagina pubblica senza login richiesto) — utile per condividere itinerario con compagni di viaggio

---

### 4. Gift List / Wishlist ⭐
**Modulo:** Nuovo (standalone o sezione)
**Descrizione:** Lista desideri personale con dettagli prodotto.
**Dettagli:**
- Nome prodotto, link, prezzo, foto (da URL o upload)
- Stato: desiderato / ricevuto / acquistato
- Possibilità di organizzare per categoria o occasione (compleanno, Natale, ecc.)
- Condivisibile con altri (come i viaggi, read-only via link)

---

### 5. Insight Finanze Rule-Based (no AI)
**Modulo:** Finanze
**Descrizione:** Analisi automatica delle spese basata su regole, senza nessun costo AI.
**Dettagli:**
- "Questa categoria è aumentata del X% rispetto alla media degli ultimi 3 mesi"
- "Hai superato il budget di categoria X di Y€"
- "Il tuo giorno più costoso è tipicamente il venerdì"
- "Questa settimana hai speso X% in più rispetto alla media settimanale"
- Visualizzazione come card/badge nel modulo Finanze

---

### 6. Recipe Bookmarker (Cucina)
**Modulo:** Nuovo (leggero)
**Descrizione:** Salvataggio link ricette da qualsiasi fonte (GialloZafferano, YouTube, ecc.) con note personali. Nessun scraping, solo bookmarking.
**Dettagli:**
- Salva URL ricetta + titolo + foto (da URL) + tag personali
- Lista ingredienti aggiuntiva manuale → genera lista della spesa
- Filtro per tag/categoria
- **Nota:** idea meno prioritaria rispetto alle altre

---

## Priorità suggerita

| Priorità | Idea | Complessità |
|----------|------|-------------|
| 🥇 Alta | Eliminazione Progetti + Push | Bassa |
| 🥇 Alta | Savings Goals Waterfall | Media |
| 🥇 Alta | Weekly Review Modal | Media |
| 🥈 Media | Modulo Viaggi | Alta |
| 🥈 Media | Gift List / Wishlist | Bassa-Media |
| 🥉 Bassa | Insight Finanze Rule-Based | Bassa |
| 🥉 Bassa | Recipe Bookmarker | Media |
