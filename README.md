# Aule libere Bocconi

Applicazione indipendente per trovare le aule in cui studiare nel campus Bocconi. Riunisce le **aule studio ufficiali** e le normali aule senza attività programmate negli edifici di via Sarfatti 25 e piazza Sraffa 13.

## Come funziona

- Un Cloudflare Worker legge l'[orario ufficiale Bocconi](https://didattica.unibocconi.it/aule/lista_orario.php) ogni 30 minuti.
- `HTMLRewriter` normalizza attività e assegnazioni senza dipendenze di scraping Node.
- L'ultimo risultato valido viene conservato in Workers KV. Un errore temporaneo non sovrascrive la cache.
- `GET /api/schedule` espone catalogo, orari di apertura e intervalli `official-study`/`busy`.
- Il frontend statico calcola e filtra localmente le disponibilità, senza ulteriori richieste.

Il catalogo di base deriva dalla [pagina ufficiale degli edifici](https://www.unibocconi.it/it/campus/edifici-e-aule/edifici). Le nuove aule trovate nell'orario vengono aggiunte automaticamente alla risposta del giorno.

## Sviluppo locale

Richiede Node.js 20 o successivo.

```bash
npm install
npm run dev
```

Wrangler avvia frontend, API e un KV locale. Per simulare il cron:

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled"
```

Controlli disponibili:

```bash
npm test
npm run typecheck
npm run deploy:dry
```

I test usano il runtime Workers tramite `@cloudflare/vitest-plugin` e coprono parser, intervalli sovrapposti, priorità delle aule studio, cache vuota e fallimenti upstream.

## Primo deploy gratuito

1. Autorizzare Wrangler:

   ```bash
   npx wrangler login --device
   ```

2. Creare il namespace KV:

   ```bash
   npx wrangler kv namespace create SCHEDULE_CACHE
   ```

3. Sostituire l'ID provvisorio in `wrangler.jsonc` con quello restituito dal comando.
4. Distribuire:

   ```bash
   npm run deploy
   ```

5. Distribuire il Worker crea e gestisce anche il Custom Domain
   `aulebocconi.salvatoremusumeci.com`, già dichiarato in `wrangler.jsonc`.
   La zona `salvatoremusumeci.com` deve essere attiva nello stesso account
   Cloudflare: non serve creare a mano un record DNS.

Il progetto usa un Worker, un namespace KV e un Cron Trigger. Con un aggiornamento ogni 30 minuti consuma circa 48 esecuzioni e 48 scritture KV al giorno, molto meno dei limiti del piano Free. I file statici sono serviti gratuitamente. Non è necessario attivare Workers Paid.

## Deploy automatici

In Cloudflare, aprire **Workers & Pages → aule-vuote-bocconi → Settings → Builds**, collegare `totomusu/AuleVuoteBocconi` e scegliere `main` come branch di produzione. Il comando di deploy predefinito `npx wrangler deploy` utilizza la configurazione nel repository.

## Aggiornamento del catalogo

Il catalogo versionato si trova in `src/catalog.ts`. Quando Bocconi modifica l'elenco ufficiale:

1. aggiornare nomi e piani nel catalogo;
2. aggiungere o aggiornare i test del parser;
3. eseguire `npm run check` prima del push.

## Affidabilità e privacy

- Le attività occupate prevalgono sempre su eventuali intervalli “Aule studio” sovrapposti.
- Se i dati hanno più di 45 minuti, l'interfaccia mostra un avviso.
- Se il recupero fallisce, resta disponibile l'ultima copia valida; senza cache l'API risponde `503`.
- Nomi dei docenti e altri dati non necessari non vengono salvati né restituiti.
- Non sono presenti analytics, cookie applicativi o risorse esterne.

La disponibilità indicata non garantisce l'effettiva accessibilità delle aule e non sostituisce le comunicazioni dell'Università Bocconi.

## Licenza

MIT
