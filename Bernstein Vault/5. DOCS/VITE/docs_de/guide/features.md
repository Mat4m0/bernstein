# Funktionen

Auf grundlegender Ebene ist die Entwicklung mit Vite nicht sehr unterschiedlich von der Verwendung eines statischen Dateiservers. Allerdings bietet Vite viele Verbesserungen gegenüber nativen ESM-Imports, um verschiedene Funktionen zu unterstützen, die in typischen Konfigurationen mit Build-Tools zu finden sind.

## Auflösen und Vorab-Bündeln von NPM-Abhängigkeiten

Native ES-Imports unterstützen keine sogenannten "bare module imports" wie folgendes Beispiel:

```js
import { someMethod } from 'my-dep'
```

Dieser Code führt im Browser zu einem Fehler. Vite erkennt solche "bare module imports" in allen bereitgestellten Quelldateien und führt die folgenden Schritte aus:

1. [Vorab-Bündeln](./dep-pre-bundling), um die Ladezeit der Seite zu verbessern und CommonJS / UMD-Module in ESM umzuwandeln. Der Vorab-Bündelungsschritt wird mit [esbuild](http://esbuild.github.io/) durchgeführt und macht Vites Startzeit deutlich schneller als bei jedem auf JavaScript basierenden Build-Tool.

2. Ändern der Imports in gültige URLs wie `/node_modules/.vite/deps/my-dep.js?v=f3sf2ebd`, damit der Browser sie ordnungsgemäß importieren kann.

**Abhängigkeiten werden stark zwischengespeichert**

Vite zwischenspeichert Abhängigkeitsanfragen über HTTP-Header. Wenn Sie also eine Abhängigkeit lokal bearbeiten/fehlerbeheben möchten, befolgen Sie die Schritte [hier](./dep-pre-bundling#browser-cache).

## Hot Module Replacement (HMR)

Vite bietet eine [HMR-API](api-hmr__de%20-%20🇩🇪.md) über nativen ESM. Frameworks mit HMR-Fähigkeiten können diese API nutzen, um sofortige und präzise Aktualisierungen ohne Neuladen der Seite oder Verlust des Anwendungsstatus bereitzustellen. Vite bietet First-Party-HMR-Integrationen für [Vue Single File Components](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue) und [React Fast Refresh](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react). Es gibt auch offizielle Integrationen für Preact über [@prefresh/vite](https://github.com/JoviDeCroock/prefresh/tree/main/packages/vite).

Beachten Sie, dass Sie diese nicht manuell einrichten müssen - wenn Sie [eine App über `create-vite`](./) erstellen, sind diese Vorlagen bereits für Sie vorconfiguriert.

## TypeScript

Vite unterstützt das Importieren von `.ts`-Dateien von Haus aus.

### Nur Transpilation

Beachten Sie, dass Vite nur Transpilierung für `.ts`-Dateien durchführt und **keine** Typüberprüfung durchführt. Es geht davon aus, dass die Typüberprüfung von Ihrer IDE und Ihrem Build-Prozess durchgeführt wird.

Der Grund, warum Vite die Typüberprüfung nicht im Rahmen des Transformationsprozesses durchführt, ist, dass diese beiden Aufgaben grundlegend unterschiedlich arbeiten. Transpilation kann auf Dateiebene arbeiten und passt perfekt zum on-demand-Kompiliermodell von Vite. Im Vergleich dazu erfordert die Typüberprüfung Kenntnisse über den gesamten Modulgraphen. Das Hineinzwängen der Typüberprüfung in den Transformationsprozess von Vite wird zwangsläufig die Geschwindigkeitsvorteile von Vite beeinträchtigen.

Vites Aufgabe ist es, Ihre Quellmodule so schnell wie möglich in eine Form zu bringen, die im Browser ausgeführt werden kann. Zu diesem Zweck empfehlen wir, statische Analyseprüfungen aus dem Transformationsprozess von Vite auszulagern. Dieses Prinzip gilt auch für andere statische Analyseprüfungen wie ESLint.

- Für Production-Builds können Sie den Befehl `tsc --noEmit` zusätzlich zum Build-Befehl von Vite ausführen.

- Während der Entwicklung, wenn Sie mehr als nur IDE-Hinweise benötigen, empfehlen wir das Ausführen von `tsc --noEmit --watch` in einem separaten Prozess oder die Verwendung von [vite-plugin-checker](https://github.com/fi3ework/vite-plugin-checker), wenn Sie Typfehler direkt im Browser gemeldet haben möchten.

Vite verwendet [esbuild](https://github.com/evanw/esbuild), um TypeScript in JavaScript zu transpilieren, was etwa 20-30-mal schneller ist als das native `tsc`, und HMR-Updates können in weniger als 50 ms im Browser reflektiert werden.

Verwenden Sie die [Type-Only Imports and Export](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)-Syntax, um potenzielle Probleme wie falsche Bündelung von nur-Typ-Imports zu vermeiden, zum Beispiel:

```ts
import type { T } from 'only/types'
export type { T }
```

### TypeScript Compiler-Optionen

Einige Konfigurationsfelder unter `compilerOptions` in `tsconfig.json` erfordern besondere Aufmerksamkeit.

#### `isolatedModules`

- [TypeScript Dokumentation](https://www.typescriptlang.org/tsconfig#isolatedModules)

Sollte auf `true` gesetzt werden.

Der Grund dafür ist, dass `esbuild` nur die Transpilierung ohne Typinformationen durchführt und bestimmte Funktionen wie `const enum` und implizite nur-Typen-Imports nicht unterstützt.

Sie müssen `"isolatedModules": true` in Ihrer `tsconfig.json` unter `compilerOptions` festlegen, damit TypeScript Sie vor den Funktionen warnt, die nicht mit isolierter Transpilierung funktionieren.

Einige Bibliotheken (z.B. [`vue`](https://github.com/vuejs/core/issues/1228)) funktionieren jedoch nicht gut mit `"isolatedModules": true`. In solchen Fällen können Sie `"skipLibCheck": true` verwenden, um die Fehler vorübergehend zu unterdrücken, bis sie behoben sind.

#### `useDefineForClassFields`

- [TypeScript documentation](https://www.typescriptlang.org/tsconfig#useDefineForClassFields)

Ab Vite 2.5.0 wird der Standardwert `true` sein, wenn das TypeScript-Ziel `ESNext` oder `ES2022` oder neuer ist. Es ist konsistent mit dem [Verhalten von `tsc` 4.3.2 und später](https://github.com/microsoft/TypeScript/pull/42663). Es ist auch das Standardverhalten der ECMAScript-Laufzeit.

Andere TypeScript-Ziele werden standardmäßig auf `false` gesetzt.

Aber es kann für diejenigen, die von anderen Programmiersprachen oder älteren Versionen von TypeScript kommen, kontraintuitiv sein.
Weitere Informationen über den Übergang finden Sie in den [TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#the-usedefineforclassfields-flag-and-the-declare-property-modifier).

Wenn Sie eine Bibliothek verwenden, die sich stark auf Klassenfelder stützt, achten Sie bitte auf die beabsichtigte Verwendung dieser Felder durch die Bibliothek.

Die meisten Bibliotheken erwarten `"useDefineForClassFields": true`, wie zum Beispiel [MobX](https://mobx.js.org/installation.html#use-spec-compliant-transpilation-for-class-properties).

Aber ein paar Bibliotheken sind noch nicht zu diesem neuen Standard übergegangen, einschließlich [`lit-element`](https://github.com/lit/lit-element/issues/1030). Bitte setzen Sie in diesen Fällen `useDefineForClassFields` explizit auf `false`.

#### `target`

- [TypeScript Dokumentation](https://www.typescriptlang.org/tsconfig#target)

Vite transpiliert TypeScript standardmäßig nicht mit dem konfigurierten `target`-Wert und folgt damit dem gleichen Verhalten wie `esbuild`.

Stattdessen kann die Option [`esbuild.target`](/config/shared-options.html#esbuild) verwendet werden, die für eine minimale Transpilierung auf `esnext` voreingestellt ist. Bei Builds hat die Option [`build.target`](/config/build-options.html#build-target) höhere Priorität und kann bei Bedarf ebenfalls gesetzt werden.

::: warning `useDefineForClassFields`
Wenn `target` nicht `ESNext` oder `ES2022` oder neuer ist, oder wenn es keine `tsconfig.json` Datei gibt, wird `useDefineForClassFields` standardmäßig auf `false` gesetzt, was mit dem Standardwert `esbuild.target` von `esnext` problematisch sein kann. Es kann zu [statischen Initialisierungsblöcken](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Static_initialization_blocks#browser_compatibility) transpilieren, was in Ihrem Browser möglicherweise nicht unterstützt wird.

Es wird daher empfohlen, `target` auf `ESNext` oder `ES2022` oder neuer zu setzen, oder `useDefineForClassFields` bei der Konfiguration von `tsconfig.json` explizit auf `true` zu setzen.
:::

#### Andere Compiler-Optionen, die das Build-Ergebnis beeinflussen

- [`Erweiterungen`](https://www.typescriptlang.org/tsconfig#extends)
- [`importsNotUsedAsValues`](https://www.typescriptlang.org/tsconfig#importsNotUsedAsValues)
- [`preserveValueImports`](https://www.typescriptlang.org/tsconfig#preserveValueImports)
- [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax)
- [`jsx`](https://www.typescriptlang.org/tsconfig#jsx)
- [`jsxFactory`](https://www.typescriptlang.org/tsconfig#jsxFactory)
- [`jsxFragmentFactory`](https://www.typescriptlang.org/tsconfig#jsxFragmentFactory)
- [`jsxImportSource`](https://www.typescriptlang.org/tsconfig#jsxImportSource)
- [`experimentalDecorators`](https://www.typescriptlang.org/tsconfig#experimentalDecorators)
- [`alwaysStrict`](https://www.typescriptlang.org/tsconfig#alwaysStrict)

::: tip `skipLibCheck`
Vite-Start-Vorlagen haben `"skipLibCheck": "true"` gesetzt, um die Überprüfung von Abhängigkeiten zu vermeiden, da sie möglicherweise nur bestimmte Versionen und Konfigurationen von TypeScript unterstützen. Mehr dazu erfahren Sie unter [vuejs/vue-cli#5688](https://github.com/vuejs/vue-cli/pull/5688).
:::

### Client-Typen

Die Standardtypen von Vite sind für die Node.js-API. Um die Umgebung von clientseitigem Code in einer Vite-Anwendung zu optimieren, fügen Sie eine Deklarationsdatei `d.ts` hinzu:

```typescript
/// <reference types="vite/client" />
```

Alternativ können Sie `vite/client` zu `compilerOptions.types` in `tsconfig.json` hinzufügen:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

Damit werden die folgenden Arten von Shims bereitgestellt:

- Asset-Importe (z.B. Importieren einer `.svg`-Datei)
- Typen für die in Vite eingefügten [env-Variablen](./env-and-mode#env-variables) auf `import.meta.env`
- Typen für die [HMR-API](api-hmr__de%20-%20🇩🇪.md) unter `import.meta.hot`

::: tip
Um die Standardtypisierung außer Kraft zu setzen, fügen Sie eine Typdefinitionsdatei hinzu, die Ihre Typisierungen enthält. Fügen Sie dann die Typreferenz vor "vite/client" ein.

Zum Beispiel, um den Standardimport von `*.svg` zu einer React-Komponente zu machen:

- `vite-env-override.d.ts` (die Datei, die Ihre Eingaben enthält):
  ```ts
  declare module '*.svg' {
    const content: React.FC<React.SVGProps<SVGElement>>
    export default content
  }
  ```
- Die Datei, die den Verweis auf `vite/client` enthält:
  ```ts
  /// <reference types="./vite-env-override.d.ts" />
  /// <reference types="vite/client" />
  ```

:::

## Vue

Vite bietet First-Class Vue Support:

- Vue 3 SFC Unterstützung über [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue)
- Ansicht 3 JSX Unterstützung via [@vitejs/plugin-vue-jsx](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx)
- Ansicht 2.7 Unterstützung über [@vitejs/plugin-vue2](https://github.com/vitejs/vite-plugin-vue2)
- Ansicht <2.7 Unterstützung via [vite-plugin-vue2](https://github.com/underfin/vite-plugin-vue2)

## JSX

.jsx"- und "tsx"-Dateien werden ebenfalls von Haus aus unterstützt. JSX Transpilierung wird auch über [esbuild](https://esbuild.github.io) gehandhabt.

Vue-Benutzer sollten das offizielle [@vitejs/plugin-vue-jsx](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx) Plugin verwenden, das Vue 3-spezifische Funktionen wie HMR, globale Komponentenauflösung, Direktiven und Slots bietet.

Wenn JSX nicht mit React oder Vue verwendet wird, können eigene `jsxFactory` und `jsxFragment` mit der [`esbuild` Option](/config/shared-options.md#esbuild) konfiguriert werden. Zum Beispiel für Preact:

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
})
```

Mehr Details in [esbuild docs](https://esbuild.github.io/content-types/#jsx).

Sie können die JSX-Helfer mit `jsxInject` injizieren (eine Option, die nur für Vite verfügbar ist), um manuelle Importe zu vermeiden:

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    jsxInject: `import React from 'react'`
  }
})
```

## CSS

Der Import von `.css`-Dateien fügt deren Inhalt über ein `<style>`-Tag mit HMR-Unterstützung in die Seite ein.

### `@import` Inlining und Rebasing

Vite ist vorkonfiguriert, um CSS `@import` Inlining über `postcss-import` zu unterstützen. Vite-Aliase werden auch für CSS `@import` respektiert. Darüber hinaus werden alle CSS `url()`-Referenzen, auch wenn die importierten Dateien in verschiedenen Verzeichnissen liegen, immer automatisch umbasiert, um die Korrektheit zu gewährleisten.

`@import`-Aliase und URL-Rebasing werden auch für Sass- und Less-Dateien unterstützt (siehe [CSS Pre-processors](#css-pre-processors)).

### PostCSS

Wenn das Projekt eine gültige PostCSS-Konfiguration enthält (ein beliebiges Format, das von [postcss-load-config](https://github.com/postcss/postcss-load-config) unterstützt wird, z. B. `postcss.config.js`), wird diese automatisch auf alle importierten CSS angewendet.

Beachten Sie, dass die CSS-Minifizierung nach PostCSS ausgeführt wird und die Option [`build.cssTarget`](/config/build-options.md#build-csstarget) verwendet wird.

### CSS-Module

Jede CSS-Datei, die mit `.module.css` endet, wird als [CSS-Modul-Datei](https://github.com/css-modules/css-modules) betrachtet. Beim Importieren einer solchen Datei wird das entsprechende Modulobjekt zurückgegeben:

```css
/* example.module.css */
.red {
  color: red;
}
```

```js
import classes from './example.module.css'
document.getElementById('foo').className = classes.red
```

Das Verhalten von CSS-Modulen kann über die Option [`css.modules`](/config/shared-options.md#css-modules) konfiguriert werden.

Wenn `css.modules.localsConvention` so eingestellt ist, dass camelCase locals aktiviert sind (z.B. `localsConvention: 'camelCaseOnly'`), können Sie auch benannte Importe verwenden:

```js
// .apply-color -> applyColor
import { applyColor } from './example.module.css'
document.getElementById('foo').className = applyColor
```

### CSS-Präprozessoren

Da Vite nur auf moderne Browser abzielt, wird empfohlen, native CSS-Variablen mit PostCSS-Plugins zu verwenden, die CSSWG-Entwürfe implementieren (z. B. [postcss-nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting)) und einfaches, den zukünftigen Standards entsprechendes CSS erstellen.

Abgesehen davon bietet Vite integrierte Unterstützung für `.scss`, `.sass`, `.less`, `.styl` und `.stylus` Dateien. Es ist nicht notwendig, Vite-spezifische Plugins für diese Dateien zu installieren, aber der entsprechende Präprozessor selbst muss installiert sein:

```bash
# .scss and .sass
npm add -D sass

# .less
npm add -D less

# .styl and .stylus
npm add -D stylus
```

Bei der Verwendung von Vue-Einzeldateikomponenten aktiviert dies auch automatisch `<style lang="sass">` und andere.

Vite verbessert die `@import`-Auflösung für Sass und Less, so dass Vite-Aliase ebenfalls respektiert werden. Außerdem werden relative `url()`-Referenzen innerhalb importierter Sass/Less-Dateien, die sich in anderen Verzeichnissen als die Stammdatei befinden, automatisch umgestellt, um die Korrektheit sicherzustellen.

`@import` alias und url rebasing werden für Stylus aufgrund seiner API-Beschränkungen nicht unterstützt.

Sie können auch CSS-Module in Kombination mit Präprozessoren verwenden, indem Sie der Dateierweiterung `.module` voranstellen, zum Beispiel `style.module.scss`.

### Deaktivieren der CSS-Injektion in die Seite

Die automatische Injektion von CSS-Inhalten kann über den Abfrageparameter `?inline` ausgeschaltet werden. In diesem Fall wird der verarbeitete CSS-String wie üblich als Standard-Export des Moduls zurückgegeben, aber die Stile werden nicht in die Seite injiziert.

```js
import styles from './foo.css' // will be injected into the page
import otherStyles from './bar.css?inline' // will not be injected
```

:::tip HINWEIS
Standard- und benannte Importe aus CSS-Dateien (z.B. `import style from './foo.css'`) sind seit Vite 5 veraltet. Verwenden Sie stattdessen die `?inline`-Query-Komponente.
:::

### Lightning CSS

Ab Vite 4.4 gibt es eine experimentelle Unterstützung für [Lightning CSS](https://lightningcss.dev/). Sie können sich dafür entscheiden, indem Sie [`css.transformer: 'lightningcss'`](../config/shared-options.md#css-transformer) zu Ihrer Konfigurationsdatei hinzufügen und die optionale Abhängigkeit von [`lightningcss`](https://www.npmjs.com/package/lightningcss) installieren:

```bash
npm add -D lightningcss
```

Wenn diese Option aktiviert ist, werden CSS-Dateien von Lightning CSS anstelle von PostCSS verarbeitet. Um dies zu konfigurieren, können Sie Lightning CSS-Optionen an die Konfigurationsoption [`css.lightningcss`](../config/shared-options.md#css-lightningcss) übergeben.

Um CSS-Module zu konfigurieren, verwenden Sie [`css.lightningcss.cssModules`](https://lightningcss.dev/css-modules.html) anstelle von [`css.modules`](../config/shared-options.md#css-modules) (die die Art und Weise konfiguriert, wie PostCSS CSS-Module behandelt).

Standardmäßig verwendet Vite esbuild zum Minifizieren von CSS. Lightning CSS kann auch als CSS-Minifizierer mit [`build.cssMinify: 'lightningcss'`](../config/build-options.md#build-cssminify) verwendet werden.

:::tip HINWEIS
[CSS-Präprozessoren](#css-pre-processors) werden bei der Verwendung von Lightning CSS nicht unterstützt.
:::

## Statische Assets

Beim Importieren eines statischen Assets wird die aufgelöste öffentliche URL zurückgegeben, wenn es bereitgestellt wird:

```js
import imgUrl from './img.png'
document.getElementById('hero-img').src = imgUrl
```

Spezielle Abfragen können die Art und Weise, wie Assets geladen werden, verändern:

```js
// Explicitly load assets as URL
import assetAsURL from './asset.js?url'
```

```js
// Load assets as strings
import assetAsString from './shader.glsl?raw'
```

```js
// Load Web Workers
import Worker from './worker.js?worker'
```

```js
// Web Workers inlined as base64 strings at build time
import InlineWorker from './worker.js?worker&inline'
```

Weitere Einzelheiten unter [Statische Vermögensverwaltung](./assets).

## JSON

JSON-Dateien können direkt importiert werden - benannte Importe werden ebenfalls unterstützt:

```js
// import the entire object
import json from './example.json'
// import a root field as named exports - helps with tree-shaking!
import { field } from './example.json'
```

## Glob-Import

Vite unterstützt den Import von mehreren Modulen aus dem Dateisystem über die spezielle Funktion `import.meta.glob`:

```js
const modules = import.meta.glob('./dir/*.js')
```

Der obige Code wird in den folgenden Code umgewandelt:

```js
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js'),
  './dir/bar.js': () => import('./dir/bar.js')
}
```

Sie können dann die Schlüssel des Objekts "Module" durchlaufen, um auf die entsprechenden Module zuzugreifen:

```js
for (const path in modules) {
  modules[path]().then((mod) => {
    console.log(path, mod)
  })
}
```

Übereinstimmende Dateien werden standardmäßig über den dynamischen Import nachgeladen und während des Builds in einzelne Teile aufgeteilt. Wenn Sie lieber alle Module direkt importieren möchten (z. B. im Vertrauen darauf, dass Seiteneffekte in diesen Modulen zuerst angewendet werden), können Sie `{ eager: true }` als zweites Argument übergeben:

```js
const modules = import.meta.glob('./dir/*.js', { eager: true })
```

Der obige Code wird in den folgenden Code umgewandelt:

```js
// code produced by vite
import * as __glob__0_0 from './dir/foo.js'
import * as __glob__0_1 from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1
}
```

### Mehrere Patterns

Das erste Argument kann ein Array von Globs sein, zum Beispiel

```js
const modules = import.meta.glob(['./dir/*.js', './another/*.js'])
```

### Negative Patterns

Negative glob-Muster werden ebenfalls unterstützt (mit dem Präfix `!`). Um einige Dateien aus dem Ergebnis zu ignorieren, können Sie dem ersten Argument "exclude glob patterns" hinzufügen:

```js
const modules = import.meta.glob(['./dir/*.js', '!**/bar.js'])
```

```js
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js')
}
```

#### Benannte Importe

Es ist möglich, nur Teile der Module mit den `import` Optionen zu importieren.

```ts
const modules = import.meta.glob('./dir/*.js', { import: 'setup' })
```

```ts
// code produced by vite
const modules = {
  './dir/foo.js': () => import('./dir/foo.js').then((m) => m.setup),
  './dir/bar.js': () => import('./dir/bar.js').then((m) => m.setup)
}
```

In Kombination mit `eager` ist es sogar möglich, das Tree-Shaking für diese Module zu aktivieren.

```ts
const modules = import.meta.glob('./dir/*.js', {
  import: 'setup',
  eager: true
})
```

```ts
// code produced by vite:
import { setup as __glob__0_0 } from './dir/foo.js'
import { setup as __glob__0_1 } from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1
}
```

Setzen Sie `import` auf `default`, um den Standard-Export zu importieren.

```ts
const modules = import.meta.glob('./dir/*.js', {
  import: 'default',
  eager: true
})
```

```ts
// code produced by vite:
import __glob__0_0 from './dir/foo.js'
import __glob__0_1 from './dir/bar.js'
const modules = {
  './dir/foo.js': __glob__0_0,
  './dir/bar.js': __glob__0_1
}
```

#### Benutzerdefinierte Abfragen

Sie können auch die Option `query` verwenden, um Abfragen für Importe zu stellen, zum Beispiel um Assets [als String](https://vitejs.dev/guide/assets.html#importing-asset-as-string) oder [als URL](https://vitejs.dev/guide/assets.html#importing-asset-as-url) zu importieren:

```ts
const moduleStrings = import.meta.glob('./dir/*.svg', {
  query: '?raw',
  import: 'default',
})
const moduleUrls = import.meta.glob('./dir/*.svg', {
  query: '?url',
  import: 'default',
})
```

```ts
// code produced by vite:
const moduleStrings = {
  './dir/foo.svg': () => import('./dir/foo.js?raw').then((m) => m['default']),
  './dir/bar.svg': () => import('./dir/bar.js?raw').then((m) => m['default']),
}
const moduleUrls = {
  './dir/foo.svg': () => import('./dir/foo.js?url').then((m) => m['default']),
  './dir/bar.svg': () => import('./dir/bar.js?url').then((m) => m['default']),
}
```

You can also provide custom queries for other plugins to consume:

```ts
const modules = import.meta.glob('./dir/*.js', {
  query: { foo: 'bar', bar: true }
})
```

### Glob Import Caveats

Beachten Sie dies:

- Dies ist ein reines Vite-Feature und kein Web- oder ES-Standard.
- Die Glob-Muster werden wie Import-Spezifizierer behandelt: Sie müssen entweder relativ (beginnen mit `./`) oder absolut (beginnen mit `/`, aufgelöst relativ zum Projektstamm) oder ein Alias-Pfad sein (siehe [Option `resolve.alias`](/config/shared-options.md#resolve-alias)).
- Der Glob-Abgleich erfolgt über [`fast-glob`](https://github.com/mrmlnc/fast-glob) - sehen Sie sich die Dokumentation für [unterstützte Glob-Muster](https://github.com/mrmlnc/fast-glob#pattern-syntax) an.
- Sie sollten sich auch bewusst sein, dass alle Argumente in `import.meta.glob` als Literale **übergeben werden müssen**. Sie können KEINE Variablen oder Ausdrücke in ihnen verwenden.

## Dynamischer Import

Ähnlich wie [glob-import](#glob-import), unterstützt Vite auch den dynamischen Import mit Variablen.

```ts
const module = await import(`./dir/${file}.js`)
```

Beachten Sie, dass Variablen nur Dateinamen eine Ebene tiefer darstellen. Wenn `file` `'foo/bar'` ist, würde der Import fehlschlagen. Für fortgeschrittene Anwendungen können Sie die Funktion [glob-import](#glob-import) verwenden.

## WebAssembly

Vorkompilierte `.wasm` Dateien können mit `?init` importiert werden.
Der Standardexport wird eine Initialisierungsfunktion sein, die ein Promise der [`WebAssembly.Instance`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Instance) zurückgibt:

```js
import init from './example.wasm?init'

init().then((instance) => {
  instance.exports.test()
})
```

Die init-Funktion kann auch ein importObject annehmen, das als zweites Argument an [`WebAssembly.instantiate`](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/instantiate) weitergegeben wird:

```js
init({
  imports: {
    someFunc: () => {
      /* ... */
    }
  }
}).then(() => {
  /* ... */
})
```

Im Produktions-Build werden `.wasm`-Dateien, die kleiner als `assetInlineLimit` sind, als base64-Strings inlined. Andernfalls werden sie wie ein [statisches Asset](./assets) behandelt und bei Bedarf abgerufen.

:::tip HINWEIS
[ES Module Integration Proposal for WebAssembly](https://github.com/WebAssembly/esm-integration) wird derzeit nicht unterstützt.
Verwenden Sie [`vite-plugin-wasm`](https://github.com/Menci/vite-plugin-wasm) oder andere Community-Plugins, um dies zu handhaben.
:::

### Zugriff auf das WebAssembly-Modul

Wenn Sie Zugriff auf das "Modul"-Objekt benötigen, z.B. um es mehrfach zu instanziieren, verwenden Sie einen [expliziten URL-Import](./assets#explicit-url-imports), um das Asset aufzulösen, und führen Sie dann die Instanziierung durch:

```js
import wasmUrl from 'foo.wasm?url'

const main = async () => {
  const responsePromise = fetch(wasmUrl)
  const { module, instance } =
    await WebAssembly.instantiateStreaming(responsePromise)
  /* ... */
}

main()
```

### Abrufen des Moduls in Node.js

In SSR kann das `fetch()` Ereignis als Teil des `?init` Imports mit `TypeError: Ungültige URL` fehlschlagen.
Siehe das Problem [Support wasm in SSR](https://github.com/vitejs/vite/issues/8882).

Hier ist eine Alternative, vorausgesetzt, die Projektbasis ist das aktuelle Verzeichnis:

```js
import wasmUrl from 'foo.wasm?url'
import { readFile } from 'node:fs/promises'

const main = async () => {
  const resolvedUrl = (await import('./test/boot.test.wasm?url')).default
  const buffer = await readFile('.' + resolvedUrl)
  const { instance } = await WebAssembly.instantiate(buffer, {
    /* ... */
  })
  /* ... */
}

main()
```

## Web Workers

### Import mit Konstruktoren

Ein Web-Worker-Skript kann mit [`new Worker()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker) und [`new SharedWorker()`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/SharedWorker) importiert werden. Im Vergleich zu den Worker-Suffixen lehnt sich diese Syntax näher an die Standards an und ist der **empfohlene** Weg, um Worker zu erstellen.

```ts
const worker = new Worker(new URL('./worker.js', import.meta.url))
```

Der Worker-Konstruktor akzeptiert auch Optionen, die verwendet werden können, um "Modul"-Arbeiter zu erstellen:

```ts
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module'
})
```

### Import mit Abfrage-Suffixen

Ein Webworker-Skript kann direkt importiert werden, indem man `?worker` oder `?sharedworker` an die Importanfrage anhängt. Der Standard-Export ist ein eigener Worker-Konstruktor:

```js
import MyWorker from './worker?worker'

const worker = new MyWorker()
```

Das Arbeitsskript kann auch ESM-`import`-Anweisungen anstelle von ìmportScripts()`Ω verwenden. **Anmerkung**: Während der Entwicklung ist dies auf [browser native support](https://caniuse.com/?search=module%20worker) angewiesen, aber für den Produktions-Build wird es wegkompiliert.

Standardmäßig wird das Arbeitsskript als separater Chunk im Produktions-Build ausgegeben. Wenn Sie den Worker als base64-String einbinden möchten, fügen Sie die Abfrage `inline` hinzu:

```js
import MyWorker from './worker?worker&inline'
```

Wenn Sie den Worker als URL abrufen möchten, fügen Sie die Abfrage `url` hinzu:

```js
import MyWorker from './worker?worker&url'
```

Siehe [Worker-Optionen](/config/worker-options.md) für Details zur Konfiguration der Bündelung aller Worker.

## Build-Optimierungen

> Die unten aufgeführten Funktionen werden automatisch als Teil des Build-Prozesses angewendet und müssen nicht explizit konfiguriert werden, es sei denn, Sie möchten sie deaktivieren.

### CSS-Code-Aufteilung

Vite extrahiert automatisch das CSS, das von Modulen in einem asynchronen Chunk verwendet wird, und erzeugt dafür eine separate Datei. Die CSS-Datei wird automatisch über einen `<link>`-Tag geladen, wenn der zugehörige asynchrone Chunk geladen wird, und der asynchrone Chunk wird garantiert erst ausgewertet, nachdem das CSS geladen wurde, um [FOUC](https://en.wikipedia.org/wiki/Flash_of_unstyled_content#:~:text=A%20flash%20of%20unstyled%20content,before%20all%20information%20is%20retrieved.) zu vermeiden.

Wenn Sie das gesamte CSS lieber in eine einzige Datei extrahiert haben möchten, können Sie die Aufteilung des CSS-Codes deaktivieren, indem Sie [`build.cssCodeSplit`](/config/build-options.md#build-csscodesplit) auf `false` setzen.

### Generierung von Preload-Direktiven

Vite generiert automatisch `<link rel="modulepreload">` Direktiven für Eintrags-Chunks und deren direkte Importe in der erstellten HTML.

### Asynchrones Laden von Chunks Optimierung

In realen Anwendungen erzeugt Rollup oft "gemeinsame" Chunks - Code, der von zwei oder mehreren anderen Chunks gemeinsam genutzt wird. In Kombination mit dynamischen Importen kommt es häufig zu folgendem Szenario:

<script setup>
import graphSvg from '../images/graph.svg?raw'
</script>
<svg-image :svg="graphSvg" />

In den nicht optimierten Szenarien muss der Browser beim Import des asynchronen Chunks "A" zunächst "A" anfordern und analysieren, bevor er herausfinden kann, dass er auch den gemeinsamen Chunk "C" benötigt. Dies führt zu einem zusätzlichen Netzwerk-Roundtrip:

```
Entry ---> A ---> C
```

Vite schreibt automatisch Code-getrennte dynamische Importaufrufe mit einem Vorladeschritt um, so dass, wenn "A" angefordert wird, "C" **parallel** abgerufen wird:

```
Entry ---> (A + C)
```

Es ist möglich, dass "C" weitere Importe hat, was im nicht optimierten Szenario zu noch mehr Roundtrips führen würde. Die Optimierung von Vite verfolgt alle direkten Importe, um die Roundtrips unabhängig von der Importtiefe vollständig zu eliminieren.
