# Watermelon UI globale

## Intervento

La migrazione estende Watermelon UI a Home, Fitness, Profilo, autenticazione, onboarding e offline. Le versioni dello stack restano quelle della precedente migrazione Finanze.

1. Tema e layout: cookie globale `ottoboard-theme`, lettura server, default scuro, selettore unico, barra superiore desktop e navigazione inferiore mobile. Auth, onboarding e offline hanno un layout essenziale. Rimossi sidebar, tema Finanze locale e limite allo zoom.
2. Home e Fitness: card, controlli, dialog, conferme e grafici condivisi. Home include gestione completa dei promemoria e widget riordinabili anche da tastiera. Le tab Fitness conservano form, filtri e selezioni; i contenitori Recharts vengono smontati quando la tab è nascosta, mantenendo lo stato dei componenti.
3. Profilo e pagine di accesso: form e messaggi coerenti, errori recuperabili, blocchi contro invii ripetuti e conferma della disconnessione Strava. Pulizia di quattro componenti Finanze non più utilizzati.

Il tema usa superfici neutre e verde, con accento arancione nella sezione Fitness. Successo ed errore hanno token separati: l'accento della sezione non cambia il significato degli indicatori. Colori delle categorie e degli obiettivi scelti dall'utente restano invariati.

I portal condividono tema e accento dell'app. Dialog e AlertDialog gestiscono navigazione da tastiera e focus; i controlli si bloccano durante i salvataggi e gli errori non cancellano gli input. Il nuovo cookie vale su tutte le route per un anno; il cookie precedente limitato a Finanze viene eliminato alla prima scelta del tema globale.

## Interfacce e compatibilità

- `AppTheme` sostituisce il tipo locale finanziario. Gli adattatori generici sono in `src/components/ui`: AppDialog, ConfirmDeleteDialog, DataError e Select.
- I riepiloghi espongono anche errore e ricaricamento. La conferma Strava utilizza la mutazione asincrona esistente, senza cambiare gli endpoint.
- Contratti API, schema database e tipi di dominio invariati.
- Strategie della PWA conservate. Il manifest mantiene il colore scuro; il colore della cornice browser segue il tema selezionato.
- La personalizzazione della Home mantiene le tipologie di approfondimenti già offerte: ultima attività e obiettivi.

## Verifiche

ESLint sull’intero sorgente è passato senza errori o avvisi. Prettier ha confermato la formattazione dei file modificati. Sono stati utilizzati soltanto questi controlli. La formattazione è limitata ai file interessati dalla migrazione. Review statica di struttura, hook, accessibilità, gestione degli errori, import e stati di caricamento.

Non sono stati eseguiti build, avvio server, typecheck, test automatici, verifiche browser, anteprime o pubblicazioni. **Compilazione, runtime, resa grafica e PWA non sono stati verificati.**

## Checklist manuale

- [ ] A 360, 768 e 1440 px: verificare entrambi i temi, navigazione, tab, assenza di overflow della pagina e tabelle scorribili internamente.
- [ ] Cambiare tema, navigare, ricaricare e riaprire l'app: controllare persistenza, sfondo, modali, toast, tooltip, calendario nativo e cornice browser.
- [ ] Controllare verde generale e arancione Fitness in chiaro/scuro; le percentuali favorevoli/sfavorevoli devono conservare verde/rosso.
- [ ] Verificare privacy su importi, riepiloghi, obiettivi, attività e misurazioni.
- [ ] Usare tastiera e zoom: link Salta al contenuto, frecce nelle tab, menu account, apertura/chiusura dialog, focus di ritorno e conferme annidate.
- [ ] Home: aggiungere, configurare, rimuovere e riordinare widget con mouse, touch e tastiera. Simulare errore di rete durante il salvataggio.
- [ ] Promemoria: creazione, modifica, completamento, riapertura, ricorrenze, storico e cancellazione; riepilogo settimanale.
- [ ] Finanze: CRUD, budget, obiettivi, categorie bloccate, selezioni multiple, percentuali, import/export e conservazione dell'import passando tra tab.
- [ ] Fitness: filtri, periodo dei grafici, anno della heatmap, dettagli attività, confronto delle circonferenze, inserimento/eliminazione misurazioni. Cambiare tab con un form compilato.
- [ ] Strava: connessione, sincronizzazione, errori e conferma della disconnessione.
- [ ] Account: login, registrazione, conferma email, recupero/reset password, onboarding, modifica profilo e logout.
- [ ] Compilazione manuale, installazione PWA, safe area, avvio standalone, modalità offline e aggiornamento del service worker.

## Criticità e miglioramenti successivi

Lint e formatter non verificano compatibilità di compilazione o comportamento dei componenti. Grafici SVG/Recharts, focus degli overlay, layout mobile e cache PWA richiedono i controlli manuali sopra indicati.

Il riordino widget mantiene gli aggiornamenti separati già usati dal progetto: ora gli errori vengono rilevati e la UI ricarica lo stato, ma una persistenza atomica richiederebbe un intervento specifico sul database. Le query storiche e le vulnerabilità delle dipendenze già segnalate nella precedente migrazione restano fuori da questo refactoring.
