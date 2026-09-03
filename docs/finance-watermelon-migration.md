# Finanze — Watermelon UI

> Documento della prima fase. Il tema locale e la navigazione sono stati sostituiti dalla [migrazione UI globale](global-watermelon-migration.md).

## Implementazione

- React e React DOM 19.2.8, Next.js 16.3.4, Tailwind CSS e relativo plugin PostCSS 4.3.3; Node 24.
- Componenti Watermelon con licenza MIT conservata, adattati al progetto. Composizione ispirata a Tallie: intestazione con mese e azioni, KPI, grafico e riepiloghi.
- Tab Panoramica, Movimenti, Pianificazione e Strumenti. Le tab già visitate conservano lo stato durante la permanenza nella pagina; cambiare mese azzera la selezione dei movimenti e le modifiche del budget mensile.
- Tema chiaro/scuro limitato a Finanze, persistito nel cookie `ottoboard-finance-theme`. Menu e modali usano un portal interno al tema. La navigazione globale mantiene il proprio aspetto.
- Controlli Radix per focus e tastiera, conferme di eliminazione, protezione dai doppi invii e conservazione degli input dopo errori di salvataggio.
- Client Supabase server asincrono e migrazione da middleware a proxy. Contratti API e schema database invariati.
- PWA mantenuta con Webpack esplicito negli script di sviluppo e build.

## Verifiche automatiche consentite

ESLint sull’intero codice sorgente e Prettier sui file modificati sono passati. Sono stati eseguiti esclusivamente questi controlli. Nessuna build, avvio server, verifica browser, typecheck o suite di test.

La configurazione ESLint usa la versione 9.39.5: la versione 10 causa un errore nel plugin React incluso in `eslint-config-next@16.3.4`. Aggiornare ESLint quando tale plugin sarà compatibile. La versione 9 è segnalata come deprecata da npm.

Il formatter va applicato solo ai file interessati: `npm run format -- <file...>`. Per verificarli: `npm run format:check -- <file...>`. `npm run lint` analizza il codice sorgente.

## Checklist manuale

- [ ] Aprire Finanze in chiaro e scuro a 360, 768 e 1440 px. Controllare tab, grafici, modali, dropdown e assenza di overflow della pagina.
- [ ] Cambiare tema e ricaricare: verificare la preferenza e l'assenza di cambi involontari sulle altre pagine.
- [ ] Cambiare mese; confrontare KPI, saldo storico, grafici e CSV esportato con i dati originali.
- [ ] Creare, modificare ed eliminare transazioni; provare importi non validi, errore di rete e invii ripetuti.
- [ ] Provare ricerca, filtro entrate/uscite, paginazione a 20 elementi, selezione multipla e categorie bloccate. Le selezioni miste devono proporre categorie compatibili con entrambi i tipi.
- [ ] Creare/modificare/eliminare budget e obiettivi; riordinare gli obiettivi anche da tastiera; verificare ricorrenze e attivazione/disattivazione.
- [ ] Importare un CSV di prova con duplicati e righe non valide. Cambiare tab durante la preparazione e verificare che mappatura e selezioni restino disponibili.
- [ ] Verificare caricamento, dati vuoti, errori con Riprova, primo setup e modalità privacy.
- [ ] Usare Tab, Shift+Tab, frecce ed Escape; verificare focus delle modali e ritorno al controllo di apertura.
- [ ] Controllare login, logout, callback OAuth, Home, Fitness, Profilo e aggiornamento del progresso obiettivi dalla Home.
- [ ] Verificare manualmente compilazione, installazione della PWA, comportamento offline e aggiornamento del service worker.

## Limiti e lavoro successivo

Compilazione, runtime, aspetto grafico e PWA non sono stati verificati automaticamente, come richiesto. L'installazione delle dipendenze ha segnalato 14 vulnerabilità nell'albero npm (1 bassa, 4 moderate, 9 alte): non è stato eseguito un audit separato né applicato un aggiornamento forzato. La loro analisi resta un intervento distinto.

Le query del saldo storico e del controllo duplicati mantengono il caricamento delle transazioni previsto dal progetto. Aggregazioni e paginazione sul server per grandi volumi restano un miglioramento successivo. Home, Fitness, Profilo e la navigazione globale richiedono un piano separato per la migrazione visiva.
