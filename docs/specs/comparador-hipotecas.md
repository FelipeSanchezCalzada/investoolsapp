# Spec — Comparador real de hipotecas

Estado: **cerrada** — 20 de 20 preguntas resueltas ([sección 10](#10-preguntas-abiertas)) y todos los flecos decididos ([sección 11](#11-decisiones-de-detalle)). Lista para implementar; desarrollo aplazado.
Fecha: 2026-08-05 · última revisión 2026-08-07

> Prosa en español; **todos los identificadores, nombres de fichero y campos de DB en inglés**, incluidos los del pseudocódigo (convención del proyecto, ver `CLAUDE.md`).

---

## 1. Objetivo

Herramienta para comparar varias ofertas hipotecarias reales entre sí calculando el **coste efectivo total** y la **TAE real** de cada una, incluyendo:

- Tipo de interés (fijo / variable / mixto) y sus revisiones.
- Comisiones y gastos de constitución a cargo del cliente.
- **Vinculaciones** (bonificaciones): productos que el banco obliga o incentiva a contratar a cambio de bajar el tipo, con su coste real.

El valor diferencial frente a los simuladores de los bancos: la TAE que publica el banco no refleja el sobrecoste real de las vinculaciones (o lo hace de forma incompleta), ni el hecho de que un seguro contratado con el banco cuesta X€ mientras que el mismo seguro en el mercado cuesta Y€.

**Métrica principal:** TAE real = TIR de todos los flujos de caja del cliente asociados a la hipoteca.

---

## 2. Conceptos de dominio

### 2.1 Tipos de hipoteca

| Tipo | Descripción |
|------|-------------|
| **Fija** | TIN constante toda la vida del préstamo. |
| **Variable** | Periodo inicial a tipo fijo (normalmente 6–12 meses) y después `Euríbor + diferencial`, revisado cada 6 o 12 meses. |
| **Mixta** | N años a tipo fijo, resto como variable. |

Parámetros asociados: suelo (`floor`), techo (`cap`), frecuencia de revisión. El redondeo al alza del índice queda [fuera de alcance](#8-fuera-de-alcance-v1).

### 2.2 Vinculaciones (bonificaciones)

Cada vinculación:
- Reduce el tipo en **puntos porcentuales** (ej. nómina −0,50 pp, seguro de hogar −0,10 pp, seguro de vida −0,20 pp).
- Tiene un **coste en el banco** y un **coste alternativo fuera**. El coste imputable a la hipoteca es siempre el **diferencial**:

```
attributableCost = bankCost − outsideCost
```

**Decisión tomada: la TAE real usa el coste neto, no el bruto.** El coste alternativo no es "el precio de mercado de ese producto", sino **lo que el usuario gastaría en ese producto si no existiera la hipoteca**. Por eso:

| Caso | Coste banco | Coste fuera | Neto | Razón |
|------|-------------|-------------|------|-------|
| Seguro de hogar (obligatorio por ley tener continente) | 380 €/año | 180 €/año | **200 €** | Lo pagarías igual; solo sobra el recargo del banco. |
| Seguro de salud (no lo querrías) | 600 €/año | 0 € | **600 €** | Coste íntegro: no lo contratarías nunca por tu cuenta. |
| Seguro de salud (ya lo tienes contratado) | 600 €/año | 550 €/año | **50 €** | Solo el sobrecoste frente al que ya pagas. |
| Seguro de coche del banco, más barato que el tuyo | 400 €/año | 480 €/año | **−80 €** | Neto **negativo**: la vinculación te ahorra dinero. |
| Nómina / recibos domiciliados | 0 € | 0 € | **0 €** | Bonificación gratis. |

El coste neto **puede ser negativo** y el cálculo debe permitirlo (no aplicar `Math.max(0, …)`).

Otras propiedades:
- **Obligatoria** (condición para conceder el préstamo) u **opcional** (solo bonifica).
- **Activa/inactiva** para ver el impacto (`¿me compensa esta vinculación?`).
- Vigencia dentro del préstamo (`fromYear` / `toYear`), porque muchas solo bonifican unos años o solo se exigen al principio.
- **Requisito de cumplimiento** informativo (ingreso mínimo, gasto mínimo con tarjeta, permanencia): no entra en el cálculo pero se muestra como aviso de riesgo de perder la bonificación.

### 2.2.1 Modelos de coste

No todas las vinculaciones se cuestan igual. Cada una elige un **modo de coste** (unión discriminada):

| Modo | Para qué | Campos | Coste del año *n* |
|------|----------|--------|-------------------|
| `free` | Nómina, recibos, tarjeta de débito, cuenta | — | `0` |
| `annual` | Seguros de prima anual, alarma, tarjeta de crédito, cuota de servicio | `bankCost`, `marketCost`, `growthPct`, `bankFirstYearDiscountPct` | `(bankCost − marketCost)·(1+g)ⁿ`, con el descuento aplicado a `bankCost` en el año 0 |
| `permille` | Seguro de vida / amortización ligado al capital vivo | `permille`, `marketPermille` | `(permille − marketPermille) × outstandingPrincipalₙ` |
| `singlePremium` | Prima única de seguro de vida, a veces **financiada** dentro del préstamo | `amount`, `financed`, `coverYears`, `marketAmount` | Pago único en `t=0`; si `financed`, se suma al capital y genera intereses. Si `coverYears` < plazo, se **renueva automáticamente** al mismo importe con aviso en la UI |
| `investment` | Plan de pensiones, fondos de inversión, cuenta de valores | ver [2.2.3](#223-modo-investment-fondos-y-planes-de-pensiones) | Diferencial de comisiones y rentabilidad sobre el saldo acumulado |

### 2.2.2 Catálogo de vinculaciones típicas

Extensible, con `otro` libre. Cada entrada trae **valores por defecto sensatos** al añadirla:

| Vinculación | Modo por defecto | Bonif. típica | Notas y variantes |
|---|---|---|---|
| **Nómina domiciliada** | `free` | 0,30–0,60 pp | La más rentable: coste 0. Variante: exige ingreso mínimo (600–2.500 €/mes) y con 2 titulares suele pedir ambas nóminas. Riesgo: paro o autónomo → pierdes la bonificación. |
| **Recibos domiciliados** | `free` | 0,05–0,10 pp | Luz, agua, gas, teléfono. Coste 0, a veces exige un número mínimo de recibos. |
| **Tarjeta de débito** | `free` | 0,00–0,10 pp | Normalmente gratuita. |
| **Tarjeta de crédito** | `annual` | 0,10–0,20 pp | Cuota anual (0 el primer año y 30–50 € después → usar `bankFirstYearDiscountPct`). Variante: exige gasto mínimo anual (1.000–3.000 €); si igualmente lo gastarías, coste 0. |
| **Cuenta/ nómina profesional con mantenimiento** | `annual` | — | Comisión de mantenimiento si se dejan de cumplir los requisitos. |
| **Seguro de hogar** | `annual` | 0,10–0,20 pp | El **continente** es obligatorio por ley con hipoteca → el coste fuera casi nunca es 0. El contenido sí es opcional. Variante: el banco lo cobra a prima única de varios años. |
| **Seguro de vida / amortización** | `annual` (por defecto) | 0,20–0,50 pp | No es obligatorio por ley aunque el banco lo presente como tal. La prima sube con la edad y baja con el capital pendiente. Variante: **prima única financiada** (`singlePremium` + `financed`) que engorda el capital del préstamo y paga intereses. |
| **Seguro de protección de pagos / desempleo** | `annual` | 0,10–0,20 pp | Casi nadie lo contrataría fuera → coste fuera 0, imputación íntegra. Coberturas con muchas exclusiones. |
| **Seguro de salud** | `annual` | 0,10–0,20 pp | Coste fuera 0 si no lo querrías; = a tu póliza actual si ya la tienes. |
| **Seguro de coche** | `annual` | 0,05–0,15 pp | Frecuentemente **neto negativo**: si el del banco es más barato que el tuyo, ahorras. |
| **Alarma / seguridad** | `annual` | 0,05–0,10 pp | Cuota mensual 30–45 €, más alta de mercado. Coste fuera 0 salvo que ya tengas alarma. |
| **Plan de pensiones** | `investment` | 0,10–0,25 pp | La aportación **no es gasto, es ahorro tuyo**. El coste real son las comisiones del plan del banco frente a la alternativa que contratarías, más la iliquidez. Ojo: desgravación fiscal a favor. |
| **Fondos de inversión / cartera gestionada** | `investment` | 0,10–0,30 pp | Igual que el anterior pero sin ventaja fiscal y con permanencia mínima frecuente. Comisión típica del banco 1,2–1,9 % vs. indexado 0,2–0,4 %. |
| **Cuenta de valores / bróker del banco** | `annual` | 0,05–0,10 pp | Custodia y comisiones de compraventa frente a tu bróker actual. |
| **Aportación periódica a producto con permanencia** | `investment` | — | Penalización por salida anticipada: campo `exitPenaltyPct`. |
| **Otro** | cualquiera | — | Libre, para lo que se invente cada banco. |

### 2.2.3 Modo `investment` (fondos y planes de pensiones)

Es el caso peliagudo: el dinero **no se pierde**, pero se gestiona peor y más caro que si lo invirtieras por tu cuenta. El coste imputable es el **lastre de comisiones y de peor rentabilidad**, no la aportación.

Se edita en un **diálogo de ayuda dedicado** (`InvestmentBindingDialog.vue`), con dos columnas: *Contratándolo con el banco* vs. *Haciéndolo por mi cuenta*.

Entradas:
- `initialContribution` — aportación inicial exigida.
- `annualContribution` — aportación anual exigida para mantener la bonificación.
- `bankFeePct` — comisión de gestión total del producto del banco (gestión + depósito + éxito).
- `alternativeFeePct` — comisión del producto que contratarías fuera (indexado, 0,2–0,4 %).
- `expectedReturnPct` — rentabilidad bruta esperada, la misma para las dos carteras (lo que cambia entre ellas son las comisiones, no el mercado). **Hereda por defecto de `common.expectedReturnPct`** y se puede sobrescribir aquí: son conceptos distintos —uno es tu cartera, otro el fondo del banco— pero el usuario los lee como lo mismo, así que el valor heredado se muestra como *placeholder* con la etiqueta "heredado de los datos comunes".
- `bankReturnGapPct` — rentabilidad que se espera perder por peor gestión, aparte de comisiones (por defecto 0).
- `wouldInvestAnyway` — si el usuario iba a invertir ese dinero de todas formas. Si es `false`, además de comisiones hay **inmovilización** de capital.
- `exitPenaltyPct` + `minYears` — penalización por salir antes de la permanencia.
- `taxDeductionPct` — solo planes de pensiones: deducción en el IRPF al marginal del usuario, resta coste los primeros años (y se avisa de que tributa al rescate).

Cálculo: se simulan **dos carteras en paralelo** año a año con las mismas aportaciones —una con `bankFeePct` (y `bankReturnGapPct`) y otra con `alternativeFeePct`— y el coste imputable del año *n* es la diferencia entre los saldos finales de ambas ese año:

```
bankBalanceₙ = (bankBalanceₙ₋₁ + contribution) × (1 + r − bankFee − bankGap)
altBalanceₙ  = (altBalanceₙ₋₁  + contribution) × (1 + r − altFee)
costₙ        = (altBalanceₙ − bankBalanceₙ) − (altBalanceₙ₋₁ − bankBalanceₙ₋₁)
```

Si `wouldInvestAnyway = false`, la aportación se trata además como salida de caja y su recuperación (el saldo final) como entrada al terminar la permanencia, de modo que la TAE recoja el coste de tener el dinero inmovilizado.

El diálogo muestra el resultado en claro: *"Contratar el fondo del banco te cuesta 4.180 € en 30 años; la bonificación de 0,20 pp te ahorra 6.940 € → **compensa**"*.

### 2.3 Gastos de constitución

Desde la Ley 5/2019 (LCCI) el banco asume notaría, gestoría, registro y AJD; el cliente paga **tasación** y **copia de escritura**. Aun así se modelan todos los campos para poder reflejar ofertas antiguas, subrogaciones o casos especiales, cada uno con su indicador de quién paga (`paidBy: 'client' | 'bank'`).

Campos: `appraisal` (tasación), `notary`, `registry`, `agency` (gestoría), `ajd`, `brokerFee`, `other`, más `openingFeePct` (comisión de apertura, % sobre capital), que va aparte porque es un porcentaje y siempre lo paga el cliente.

Valores por defecto al crear una hipoteca: `appraisal` a cargo del **cliente**; notaría, registro, gestoría y AJD a cargo del **banco** (régimen LCCI vigente).

### 2.4 Coste de oportunidad del capital no aportado

Capital y plazo son **comunes con override por hipoteca**, porque cada banco concede un LTV distinto. Pero comparar una oferta de 200.000 € contra una de 220.000 € es tramposo si no se cuenta qué pasa con el dinero que **no** metes de entrada: con la segunda pones 20.000 € menos, y ese dinero no desaparece, lo inviertes.

Modelo: el usuario declara en los datos comunes el **precio de la vivienda** y el **ahorro disponible**. Por cada hipoteca:

```
downPayment  = propertyPrice − principal
freeCapital  = availableCash − downPayment − clientUpfrontCosts
```

Ese `freeCapital` se invierte en renta variable **de una sola vez al inicio** (aportación única en `t=0`, sin aportaciones periódicas) y se deja crecer toda la vida del préstamo.

La **rentabilidad esperada**, el **impuesto sobre plusvalías** (porcentaje único, 19 % por defecto) y el interruptor de la simulación son **comunes a toda la comparativa**, no editables por hipoteca: son propiedades del usuario y del mercado, no de la oferta, y permitirlos por hipoteca invitaría a sesgar la comparación. La sección que aparece en cada pestaña es de **solo lectura**: muestra la entrada, el capital libre y la cartera final de esa oferta, con un acceso a los ajustes comunes.

Al vencimiento:

```
finalPortfolio  = freeCapital × (1+r)^years
netPortfolio    = finalPortfolio − capitalGainsTax
netWorth        = netPortfolio − totalMortgageCost
```

**No** se simula invertir el sobrante de cuota mensual entre ofertas: la única simulación de coste de oportunidad es la del dinero que no va a la entrada.

`netWorth` es la **métrica secundaria de ranking** (la principal es la TAE real): responde a "con cuál de estas ofertas acabo teniendo más dinero", que no siempre coincide con "cuál tiene la TAE más baja".

Avisos:
- `freeCapital < 0` → el ahorro no llega para esa oferta; se marca la hipoteca como inviable.
- La rentabilidad esperada es una hipótesis, no una promesa: se avisa en la UI y se puede poner a 0 para desactivar el efecto.
- La TAE real **no** incorpora estos flujos: la TAE mide el coste del préstamo, no la estrategia patrimonial. Van en métricas separadas.

### 2.5 Comisiones durante la vida del préstamo

- Comisión por amortización anticipada **parcial** y por **cancelación total**, modeladas cada una como **lista de tramos** `{ fromYear, toYear, pct }`, porque los topes legales de la LCCI cambian por periodo y por tipo de préstamo:

| Tipo | Amortización parcial y total |
|------|------------------------------|
| Variable | 0,25 % los 3 primeros años **o** 0,15 % los 5 primeros (el banco elige una de las dos al firmar); 0 % después. |
| Fija | 2 % los 10 primeros años; 1,5 % el resto. |

  Los valores por defecto se cargan según `rateType` y son editables (una oferta antigua o extranjera puede salirse de los topes). El límite legal solo genera **aviso**, no bloquea: ver [11.2](#112-cálculo).

- Comisión por cambio a tipo fijo (novación).
- Comisión de subrogación.

---

## 3. Modelo de cálculo

### 3.1 Cuadro de amortización (sistema francés)

Cuota mensual para un tramo con tipo nominal anual `TIN`:

```
i           = nominalRate / 12
installment = outstandingPrincipal × i / (1 − (1 + i)^(−remainingMonths))
```

En cada revisión de tipo se recalcula la cuota sobre el capital pendiente y los meses restantes.

Tipo aplicado en el mes `m`:

```
baseRate(m)    = fixedRate | initialRate (periodo inicial) | index(m) + spread
appliedRate(m) = clamp(baseRate(m) − Σ activeBonuses(m), floor, cap)
```

Con un **tope máximo de bonificación total** configurable por hipoteca (muchos bancos limitan la suma).

### 3.2 Proyección del índice (Euríbor)

Escenario de índice **global y compartido** por todas las hipotecas de la comparativa (para que la comparación sea justa), definido por puntos `(año, valor %)` con interpolación lineal entre ellos y valor constante tras el último punto.

Escenarios predefinidos: `Actual (constante)`, `Optimista`, `Pesimista`, `Personalizado`.
La comparativa se puede recalcular en cada escenario y mostrar la TAE real de cada hipoteca en los 3 escenarios.

**Semilla de los escenarios.** No se hardcodea ningún valor de mercado, porque envejecería sin avisar. El usuario introduce el Euríbor de hoy en `common.currentIndexPct` y los tres escenarios se derivan de él:

| Escenario | Puntos |
|-----------|--------|
| Actual | `[{ year: 0, valuePct: currentIndexPct }]` → constante toda la vida |
| Optimista | `currentIndexPct` en el año 0 → `currentIndexPct − 1` en el año 5, constante después (suelo en 0) |
| Pesimista | `currentIndexPct` en el año 0 → `currentIndexPct + 1` en el año 5, constante después |

Los tres son editables: al tocar sus puntos pasan a comportarse como `Personalizado`. El desplazamiento de ±1 pp a 5 años es una convención de sensibilidad, no una previsión, y así se etiqueta en la UI.

### 3.3 TAE real (métrica principal)

TIR mensual `r` que anula el valor actual neto de los flujos:

```
t = 0:  + principal                        (capital recibido; incluye la prima única si financed)
        − clientUpfrontCosts               (solo los conceptos con paidBy = 'client')
        − openingFee                       (openingFeePct × principal)
        − singlePremiumNetCost             (si NO está financiada: amount − marketAmount)
        − investmentInitialContribution    (solo si wouldInvestAnyway = false)

t = m:  − installment(m)
        − bindingNetCost(m)                (suma de los modos free/annual/permille/investment)
        − prepayment(m) − prepaymentFee(m)
        − investmentContribution(m)        (solo si wouldInvestAnyway = false)
        + investmentRedemption(m)          (saldo recuperado al cumplir minYears, neto de exitPenaltyPct)
        + taxDeduction(m)                  (planes de pensiones, taxDeductionPct sobre la aportación)

t = n:  − outstandingPrincipal             (si se cancela antes de vencimiento)
        − cancellationFee
        + remainingInvestmentBalance       (saldo del producto vinculado aún inmovilizado)
```

La prima única **financiada** no genera flujo propio: engorda `principal` (que entra en `t = 0`) y por tanto se paga vía cuota, que es justo el efecto que se quiere capturar. El coste imputable de los modos `investment` con `wouldInvestAnyway = true` **no** entra como aportación/rescate, solo como `bindingNetCost(m)` (el lastre de comisiones), porque ese dinero el usuario lo iba a invertir igual.

```
TAE = (1 + r)^12 − 1
```

Resolución por bisección + Newton-Raphson (robusto, sin dependencias externas).

Se calculan **tres TAE** para poder explicar la diferencia:

| Métrica | Contenido |
|---------|-----------|
| `officialApr` | Gastos + solo vinculaciones **obligatorias** a coste bruto, índice constante (criterio Circular BdE 5/2012). Sirve para contrastar con lo que publica el banco. |
| `realApr` | Todos los flujos, vinculaciones activas a **coste imputable neto** (banco − fuera), con escenario de índice seleccionado. |
| `aprWithoutBindings` | Escenario "renuncio a todo lo opcional": se mantienen las vinculaciones `required: true` (sin ellas el banco no da el préstamo, así que el escenario no existiría) y se desactivan las demás, perdiendo su bonificación y su coste. En la UI se etiqueta **"TAE sin vinculaciones opcionales"**, no "sin vinculaciones". |

### 3.4 Salidas por hipoteca

- Cuota inicial, cuota media, cuota máxima, cuota final.
- Total intereses.
- Total gastos iniciales a cargo del cliente.
- Total coste de vinculaciones (bruto y neto imputable).
- **Coste total** = intereses + gastos + coste neto vinculaciones.
- Desembolso total = capital + coste total.
- TIN medio ponderado y tipo efectivo tras bonificaciones.
- Entrada aportada, capital libre invertido, cartera neta final y **patrimonio neto** (ver [2.4](#24-coste-de-oportunidad-del-capital-no-aportado)).
- LTV = capital / valor de tasación.
- Cuadro de amortización mes a mes, en diálogo.

### 3.5 Salidas de la comparativa

- Tabla comparativa ordenable, con la mejor opción resaltada y el **sobrecoste vs. la mejor** en € y en pp de TAE.
- Gráfico 1: evolución de la cuota mensual por hipoteca.
- Gráfico 2: coste acumulado (intereses + gastos + vinculaciones) por hipoteca → muestra el **punto de cruce** entre ofertas.
- Gráfico 3: capital pendiente por hipoteca.
- Panel "¿compensan las vinculaciones?": por cada vinculación, ahorro en intereses por la bonificación vs. su coste neto acumulado → veredicto **SÍ / NO** y umbral de coste a partir del cual deja de compensar.
- Sensibilidad: TAE real de cada hipoteca en los 3 escenarios de Euríbor.

### 3.6 Convenciones de cálculo

Reglas fijadas para que la implementación no tenga que inventárselas:

- **Periodificación de las vinculaciones** — todos los costes anuales se imputan **mensualmente a doceavas partes** (`annualCost / 12`), no de golpe al inicio de la anualidad. Los flujos de la TIR son mensuales y así la TAE no depende de en qué mes cae el aniversario. El crecimiento `growthPct` se aplica por anualidad completa, no mes a mes.
- **Vigencia en años sobre un cuadro mensual** — el año `n` cubre los meses `n·12 + 1` … `(n+1)·12`. Una vinculación está vigente en el mes `m` si `yearIndex >= fromYear && (toYear === null || yearIndex < toYear)`, con `yearIndex = Math.floor((m − 1) / 12)`. `toYear` es **exclusivo**, igual que en `FinancialFreedomExpense` ([useFinancialFreedomCalculator.ts](../../app/composables/useFinancialFreedomCalculator.ts)), para no tener dos semánticas distintas en el proyecto.
- **Orden dentro del bucle mensual** — importa porque las amortizaciones anticipadas cambian el capital pendiente y con él la prima del modo `permille`:
  1. Determinar `appliedRate(m)` (revisión de tipo si toca).
  2. Recalcular la cuota si ha habido revisión o amortización el mes anterior.
  3. Devengar intereses y amortizar capital de la cuota del mes.
  4. Aplicar la amortización anticipada del mes y su comisión.
  5. Calcular el coste de las vinculaciones **con el capital pendiente ya actualizado**.
- **Convergencia de la TIR** — bisección en el rango de tipo mensual `[−0,9; 1,0]` hasta acotar el signo, luego Newton-Raphson. Tolerancia `1e-10` sobre el VAN, máximo `100` iteraciones. Si no converge o los flujos son degenerados (todos del mismo signo), se devuelve `null` y la UI muestra `n/d`.
- **Redondeo** — nada se redondea durante el cálculo; el redondeo es solo de presentación (`Intl.NumberFormat`, 2 decimales en € y en %).

---

## 4. Modelo de datos (DB)

Nueva versión de esquema: **`CURRENT_DB_VERSION = 3`**.

### 4.1 Ficheros

```
app/db/types/FrontDBv3.ts     # nuevo esquema
app/db/types.ts               # FrontDB = FrontDBv3, CURRENT_DB_VERSION = 3
app/db/migrations.ts          # + 'v2-v3'
```

La migración `v2-v3` es **aditiva**: copia todo tal cual y no añade `mortgageComparator` (se crea perezosamente en el composable, como hacen `sp500Calculator` y `financialFreedomCalculator`). En la práctica es la función identidad salvo por el número de versión.

`FrontDBv3.ts` **copia entero** el contenido de `FrontDBv2.ts` y le suma los tipos nuevos, en lugar de reexportar de v2. Cada versión debe quedar como una foto autocontenida del esquema en ese momento: si v3 importara de v2, editar v2 rompería la definición de v3 y con ella el sentido de las migraciones.

### 4.2 Tipos propuestos

```ts
// app/db/types/FrontDBv3.ts (extracto — el resto se copia de v2)

export type MortgageRateType = 'fixed' | 'variable' | 'mixed'

export type MortgageBindingType =
  | 'nomina' | 'recibosDomiciliados' | 'tarjetaDebito' | 'tarjetaCredito'
  | 'cuentaMantenimiento' | 'seguroHogar' | 'seguroVida'
  | 'seguroProteccionPagos' | 'seguroSalud' | 'seguroCoche' | 'alarma'
  | 'planPensiones' | 'inversionFondos' | 'cuentaValores' | 'otro'

/** Sin coste: nómina, recibos, tarjeta de débito */
export type MortgageBindingCostFree = { mode: 'free' }

/** Prima o cuota anual: seguros, alarma, tarjeta de crédito */
export type MortgageBindingCostAnnual = {
  mode: 'annual'
  bankCost: number
  /** Lo que gastarías en esto si no existiera la hipoteca (0 si no lo contratarías) */
  marketCost: number
  /** Subida anual del coste, en % */
  growthPct: number
  /** Descuento del banco el primer año, en % (promos "primer año gratis") */
  bankFirstYearDiscountPct: number
}

/** Ligado al capital pendiente: seguro de amortización */
export type MortgageBindingCostPermille = {
  mode: 'permille'
  permille: number
  marketPermille: number
}

/** Prima única, opcionalmente financiada dentro del préstamo */
export type MortgageBindingCostSinglePremium = {
  mode: 'singlePremium'
  amount: number
  marketAmount: number
  /** Se suma al capital del préstamo y genera intereses */
  financed: boolean
  /** Años cubiertos por la prima (informativo / renovación) */
  coverYears: number
}

/** Fondos, planes de pensiones, carteras gestionadas */
export type MortgageBindingCostInvestment = {
  mode: 'investment'
  initialContribution: number
  annualContribution: number
  /** Comisión total anual del producto del banco, en % */
  bankFeePct: number
  /** Comisión del producto que contratarías por tu cuenta, en % */
  alternativeFeePct: number
  /** Rentabilidad bruta esperada del producto; null = hereda common.expectedReturnPct */
  expectedReturnPct: number | null
  /** Rentabilidad extra que se espera perder por peor gestión, en % */
  bankReturnGapPct: number
  /** false = ese dinero no lo habrías invertido → además queda inmovilizado */
  wouldInvestAnyway: boolean
  minYears: number
  exitPenaltyPct: number
  /** Solo planes de pensiones: deducción en IRPF al tipo marginal, en % */
  taxDeductionPct: number
}

export type MortgageBindingCost =
  | MortgageBindingCostFree
  | MortgageBindingCostAnnual
  | MortgageBindingCostPermille
  | MortgageBindingCostSinglePremium
  | MortgageBindingCostInvestment

export type MortgageBinding = {
  id: string
  name: string
  type: MortgageBindingType
  /** Condición obligatoria para conceder el préstamo */
  required: boolean
  /** El usuario la contrata en la simulación */
  active: boolean
  /** Bonificación en puntos porcentuales sobre el TIN */
  rateReductionPp: number
  /** Modelo de coste; el coste neto imputable puede ser negativo */
  cost: MortgageBindingCost
  /** Vigencia dentro del préstamo (año 0 = firma; toYear null = toda la vida) */
  fromYear: number
  toYear: number | null
  /** Requisito para no perder la bonificación (ingreso mínimo, gasto mínimo…). Informativo */
  requirement?: string
  notes?: string
}

/** Conceptos de gasto de constitución con importe en euros */
export type MortgageUpfrontCostKey =
  | 'appraisal' | 'notary' | 'registry' | 'agency' | 'ajd' | 'brokerFee' | 'other'

export type MortgageUpfrontCosts = {
  amounts: Record<MortgageUpfrontCostKey, number>
  /** Quién paga cada concepto; solo los del cliente entran en el flujo de la TIR */
  paidBy: Record<MortgageUpfrontCostKey, 'client' | 'bank'>
  /** Comisión de apertura (% sobre capital); siempre a cargo del cliente */
  openingFeePct: number
}

/** Tramo de comisión de amortización: aplica si fromYear <= year < toYear */
export type MortgageFeeTier = {
  fromYear: number
  /** null = hasta el final del préstamo */
  toYear: number | null
  pct: number
}

export type MortgageEarlyRepaymentFees = {
  partial: MortgageFeeTier[]
  total: MortgageFeeTier[]
}

export type MortgagePrepayment = {
  id: string
  month: number                // mes desde la firma
  amount: number
  mode: 'reduceTerm' | 'reduceInstallment'
  /** Repetir cada N meses hasta el fin del préstamo (null = pago único) */
  recurringEveryMonths: number | null
}

export type Mortgage = {
  id: string
  name: string                 // "BBVA fija 2,45%"
  bankName: string
  color: string                // color en gráficos
  enabled: boolean             // incluida en la comparativa

  /** Capital y plazo: null = hereda el valor común de la comparativa */
  principal: number | null
  termMonths: number | null

  rateType: MortgageRateType
  /** Fija: TIN único. Mixta: TIN del tramo fijo */
  fixedRatePct: number
  /** Mixta: duración del tramo fijo en meses */
  mixedFixedMonths: number
  /** Variable/mixta: tipo del periodo inicial y su duración */
  initialRatePct: number
  initialRateMonths: number
  /** Variable/mixta: diferencial sobre el índice */
  spreadPct: number
  reviewEveryMonths: number    // 6 | 12
  floorPct: number | null
  capPct: number | null
  /** Tope máximo de bonificación acumulable (pp), null = sin tope */
  maxBonusPp: number | null

  bindings: MortgageBinding[]
  upfrontCosts: MortgageUpfrontCosts
  earlyRepaymentFees: MortgageEarlyRepaymentFees
  prepayments: MortgagePrepayment[]
}

export type MortgageIndexScenario = {
  id: string
  name: string
  /** Puntos (año desde la firma, valor % del índice); interpolación lineal */
  points: { year: number, valuePct: number }[]
}

export type MortgageComparator = {
  mortgages: Mortgage[]
  scenarios: MortgageIndexScenario[]
  selectedScenarioId: string
  /** Datos comunes de la comparativa; cada hipoteca puede sobrescribir capital y plazo */
  common: {
    principal: number
    termMonths: number
    /** Precio de compra de la vivienda */
    propertyPrice: number
    /** Valor de tasación, para el LTV */
    appraisalValue: number
    /** Ahorro disponible del usuario para entrada y gastos */
    availableCash: number
    /** Euríbor de hoy, en %; semilla de los tres escenarios predefinidos */
    currentIndexPct: number
    /** Simular la inversión del capital libre que deja cada oferta */
    opportunityCostEnabled: boolean
    /** Rentabilidad anual esperada del capital libre invertido, en % */
    expectedReturnPct: number
    /** Impuesto sobre plusvalías al vender, en % (19 por defecto) */
    capitalGainsTaxPct: number
  }
}
```

Y en el workspace:

```ts
export type FrontDBv3 = {
  selectedWorkspaceName?: string
  workspaces: {
    name: string
    description: string
    portfolioRebalancingHelper?: PortfolioRebalancingHelper
    sp500Calculator?: SP500CalculatorInputs
    financialFreedomCalculator?: FinancialFreedomCalculatorInputs
    mortgageComparator?: MortgageComparator   // ← nuevo
  }[]
}
```

---

## 5. Arquitectura de la implementación

```
app/lib/mortgage/
  amortization.ts        # cuadro francés, revisiones, amortizaciones anticipadas
  irr.ts                 # TIR / TAE (bisección + Newton)
  bindings.ts            # bonificación efectiva y coste imputable por mes, por modo de coste
  bindingCatalog.ts      # catálogo de vinculaciones típicas con valores por defecto
  templates.ts           # plantillas de hipoteca de ejemplo, paleta de colores, escenarios semilla
  investment.ts          # simulación de las dos carteras (banco vs. alternativa)
  opportunityCost.ts     # capital libre invertido, patrimonio neto final
  index.ts

app/composables/
  useMortgageComparator.ts   # estado + cálculo reactivo, patrón de useFinancialFreedomCalculator

app/pages/calculators/
  mortgage-comparator.vue

app/components/calculators/mortgage-comparator/
  MortgageTabs.vue            # barra de tabs: [Banco A] [Banco B] … [+]  ┃★ Comparativa┃
  GlobalSettingsDialog.vue    # botón + modal con toda la configuración global
  CommonInputsFields.vue      # vivienda, tasación, ahorro, capital, plazo, rentabilidad
                              #   esperada, impuesto plusvalías, toggle coste oportunidad
  ScenarioFields.vue          # editor del escenario de Euríbor + selector

  # --- contenido del tab de una hipoteca ---
  MortgagePanel.vue           # orquesta el tab de una hipoteca
  MortgageConditionsCard.vue  # nombre, banco, tipo, TIN/diferencial, revisiones, suelo/techo
  MortgageCostsCard.vue       # gastos de constitución + comisiones
  PrepaymentsEditor.vue       # amortizaciones anticipadas (puntuales y recurrentes)
  OpportunityCostCard.vue     # solo lectura: entrada, capital libre, cartera, patrimonio
  BindingsEditor.vue          # tabla editable de vinculaciones con toggle activo
  BindingFormDialog.vue       # alta/edición de una vinculación, campos según modo de coste
  InvestmentBindingDialog.vue # asistente de coste para fondos y planes de pensiones
  MortgageSummaryCard.vue     # resultado de ESTA hipoteca (cuota, TAE real, coste total)
  AmortizationTableDialog.vue # cuadro de amortización mes a mes

  # --- contenido del tab comparativa ---
  ComparisonPanel.vue         # orquesta el tab comparativa
  ComparisonTableCard.vue     # tabla comparativa + ranking + sobrecoste vs. la mejor
  ResultsChartCard.vue        # gráficos (cuota, coste acumulado, capital pendiente)
  BindingsWorthItCard.vue     # ¿compensa cada vinculación?
  SensitivityCard.vue         # TAE real por escenario de Euríbor
```

Adicional:
- `app/pages/routeNames.ts`: `CALCULATORS.MORTGAGE_COMPARATOR = 'CALCULATORS__MORTGAGE_COMPARATOR'`.
- `NavMain.vue`: nuevo ítem "Comparador de hipotecas" bajo *Calculadoras*.
- Componente shadcn `tabs` ya instalado. El acordeón de secciones usa `collapsible`, también disponible.
- **Gráficos con `nuxt-echarts`** y **tabla comparativa con `@tanstack/vue-table`**, ambos ya en el proyecto. Sin dependencias nuevas.
- Cálculo dentro de `requestAnimationFrame` + `isLoading`, igual que los calculadores existentes (evita bloquear el render).
- `NumberField` solo con `NumberFieldInput` dentro de `NumberFieldContent` (convención del proyecto).
- Formato `es-ES` y moneda `EUR` vía `Intl.NumberFormat`; porcentajes con dos decimales.
- **Colores de las hipotecas**: paleta fija de 8 tonos en `templates.ts`, asignados por índice de forma rotatoria al crear cada hipoteca y editables después. Se eligen con contraste suficiente en claro y oscuro, en línea con las variables OKLch del tema.

---

## 6. UX propuesta

### 6.1 Estructura general

Layout de **pestañas**: una pestaña por banco/hipoteca más una pestaña **Comparativa** destacada visualmente.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Comparador de hipotecas                                                 │
│  La TAE que publica el banco no cuenta lo que te cuestan de verdad…      │
├──────────────────────────────────────────────────────────────────────────┤
│  Vivienda 250.000 €  Ahorro 80.000 €  Capital 220.000 €  Plazo 30 años   │  ← datos comunes
│  Tasación 260.000 €  LTV 84,6 %  Rent. esperada RV 7 %                   │
│  Escenario Euríbor: [ Actual ▾ ]                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ BBVA 2,45 % │ Santander Eur+0,60 │ ING mixta │ ＋ │ ┃★ COMPARATIVA ┃    │  ← tabs
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                       (contenido de la pestaña activa)                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Pestaña Comparativa**, siempre la **última** (a la derecha del todo, tras el botón `＋`) y visualmente diferenciada:
- Fondo/borde de acento (`bg-primary/10`, `border-primary`, texto `font-semibold`) e icono (`ChartNoAxesColumn` o `Scale`) para que no parezca "una hipoteca más".
- Separador vertical entre las pestañas de bancos y ella; metáfora de "primero meto los datos, luego comparo".
- Anclada a la derecha con `ml-auto`, de modo que no se pierda cuando la lista de bancos scrollea horizontalmente.
- Es la pestaña activa por defecto al entrar si hay ≥ 2 hipotecas; con 0 o 1 se abre la del banco o el estado vacío.

**Pestañas de banco**:
- Etiqueta = nombre del banco + tipo resumido (`BBVA · 2,45 % fijo`).
- Punto de color de la hipoteca (el mismo que en los gráficos) a la izquierda.
- Badge con la posición en el ranking (`#1`, `#2`…) según TAE real; el `#1` en verde.
- Atenuada (`opacity-50`) si `enabled: false`.
- Menú contextual (`···`): renombrar, duplicar, activar/desactivar, borrar (con `AlertDialog` de confirmación).
- Botón `＋` tras la última hipoteca para añadir otra (crea la pestaña y la activa). Sin límite de hipotecas.
- Scroll horizontal con `overflow-x-auto` cuando no caben; en móvil, tabs compactas solo con el nombre del banco.

### 6.2 Contenido de la pestaña de una hipoteca

**Acordeón** de secciones colapsables (`Collapsible`, ya instalado), con **Condiciones** y **Vinculaciones** abiertas por defecto y el resto plegado, más la tarjeta de resultado **sticky** al pie. Con 5 bloques el scroll plano se hace largo y anidar pestañas dentro de pestañas desorienta.

Cada cabecera de sección muestra un resumen para poder leer la hipoteca sin desplegar nada:

| Sección | Resumen en la cabecera |
|---|---|
| Condiciones | `Fija · 2,60 % · 200.000 € · 30 años` (o `Variable · Eur+0,60 % · …`) |
| Gastos y comisiones | `1.250 € a tu cargo · apertura 0,25 %` |
| Vinculaciones | `4 activas · −0,85 pp · 310 €/año netos` |
| Amortizaciones anticipadas | `2 pagos · 15.000 € · ahorro 11.400 €` (o `Ninguna`) |
| Coste de oportunidad | `Entrada 50.000 € · libre 28.750 € → 218.900 €` (o `Desactivado`) |

1. **Condiciones** — nombre, banco, color, activa; tipo (fijo/variable/mixto) y sus campos condicionados; capital y plazo propios si difieren de los comunes (con indicador de "heredado"); suelo/techo; tope de bonificación.
2. **Gastos y comisiones** — tasación, apertura, notaría, registro, gestoría, AJD, bróker, otros, con marca de quién paga cada uno; comisiones de amortización anticipada.
3. **Vinculaciones** — tabla editable: producto, obligatoria, bonificación (pp), modo de coste, coste banco, coste fuera, coste neto calculado, vigencia, toggle activo. Botón "Añadir vinculación" con el catálogo de [2.2.2](#222-catálogo-de-vinculaciones-típicas) y valores por defecto. Las de modo `investment` abren su asistente.
4. **Amortizaciones anticipadas** — pagos puntuales y recurrentes, modo reducir cuota / reducir plazo, con la comisión aplicable y el ahorro que genera cada uno.
5. **Coste de oportunidad** (solo lectura) — entrada aportada, capital libre resultante, cartera final estimada y patrimonio neto de esta oferta, con enlace a los ajustes comunes (rentabilidad esperada e impuesto).
6. **Resultado de esta hipoteca** — tarjeta **sticky** al pie, siempre visible mientras se edita: cuota inicial, cuota máxima, TIN efectivo, TAE real, coste total, patrimonio neto, y botón "Ver cuadro de amortización". Por debajo de `sm` se reduce a **una línea** (`cuota · TAE real`) pulsable que despliega el resto, para no comerse media pantalla en móvil.

Todo se recalcula en vivo al editar (mismo patrón reactivo que los calculadores actuales).

### 6.3 Contenido de la pestaña Comparativa

1. **Podio / ranking**: la **ganadora se decide por TAE real**, que es la métrica núcleo de la herramienta; el **patrimonio neto** aparece como ranking secundario al lado. Se muestra el sobrecoste de las demás en € y en pp. Si las dos ordenaciones no coinciden, se avisa y se explica (la más barata en TAE puede dejarte con menos dinero si te obliga a poner más entrada), pero el destacado no cambia: el patrimonio neto depende de una rentabilidad hipotética y no debe mandar sobre el ranking.
2. **Tabla comparativa** ordenable: cuota inicial, cuota máxima, total intereses, gastos, coste vinculaciones (bruto y neto), coste total, TAE oficial, TAE real, entrada, capital libre invertido, patrimonio neto.
3. **Gráficos**: evolución de la cuota, coste acumulado (con el punto de cruce marcado), capital pendiente, patrimonio neto en el tiempo.
4. **¿Compensan las vinculaciones?**: por hipoteca y vinculación, ahorro en intereses vs. coste neto acumulado, veredicto SÍ/NO y umbral de ruptura.
5. **Sensibilidad**: TAE real de cada hipoteca en los tres escenarios de Euríbor.

Solo entran en la comparativa las hipotecas con `enabled: true`.

### 6.4 Estados vacíos

- 0 hipotecas: **no se dibuja la barra de pestañas**; solo una tarjeta central con "Añadir hipoteca" y las dos plantillas de ejemplo. Con la Comparativa anclada a la derecha y ningún banco a su izquierda, la barra quedaría descolgada y el `＋` perdido en medio.
- 1 hipoteca: barra normal; la comparativa muestra sus resultados en solitario más un aviso "añade otra oferta para comparar".

La pestaña activa es **estado efímero de UI** (`ref` en el composable), no se persiste en la DB.

**Plantillas de ejemplo** (en `templates.ts`, con capital 200.000 € a 30 años sobre vivienda de 250.000 €):

| | Fija | Variable |
|---|---|---|
| `rateType` | `fixed` | `variable` |
| Tipo | `fixedRatePct: 2,60` | `initialRatePct: 2,20` los 12 primeros meses, luego `spreadPct: 0,60` sobre el índice, revisión cada 12 meses |
| Vinculaciones | Nómina −0,40 pp (`free`) · Seguro de hogar −0,10 pp (`annual`, 380 € banco / 180 € fuera) · Seguro de vida −0,20 pp (`annual`, 420 € banco / 0 € fuera) | Las tres anteriores + Tarjeta de crédito −0,10 pp (`annual`, 40 € con primer año gratis) + Plan de pensiones −0,15 pp (`investment`, 1.500 €/año, 1,50 % banco vs. 0,25 % alternativa) |
| Gastos | Tasación 350 € a cargo del cliente; resto a cargo del banco; sin comisión de apertura | Igual + comisión de apertura 0,25 % |

Son cifras plausibles de mercado español, pensadas para que la herramienta se entienda al abrirla; no son una oferta real ni una recomendación, y así se indica en el botón ("Cargar ejemplo").

---

## 7. Casos borde a cubrir

- Plazo o capital 0 / negativos → no calcular.
- Tipo aplicado ≤ 0 tras bonificaciones → cuota = capital / meses restantes (evitar división por cero en la fórmula francesa).
- Suelo por encima del techo → validar.
- Bonificación total > tope configurado → recortar al tope.
- Vinculación desactivada pero `required: true` → se calcula igual y **sigue en el ranking**, con aviso visible ("el banco no concedería la hipoteca sin esto") en la pestaña y en la fila de la tabla. Es un escenario hipotético legítimo —sirve para ver cuánto pesa esa exigencia— y sacarla del ranking la haría desaparecer justo cuando el usuario quiere mirarla.
- Amortización anticipada mayor que el capital pendiente → cancelar préstamo en ese mes.
- Periodo inicial más largo que el plazo total.
- Mixta con tramo fijo ≥ plazo total → equivale a fija.
- TIR sin solución (flujos degenerados) → mostrar "n/d" en vez de NaN.
- Capital concedido mayor que el precio de la vivienda → entrada negativa; avisar en vez de calcular.
- Ahorro disponible insuficiente para entrada + gastos → hipoteca marcada como inviable, fuera del ranking pero visible.
- Rentabilidad esperada 0 % → el coste de oportunidad se neutraliza sin romper el cálculo.
- Amortización recurrente cuyo importe supera lo que queda → última aportación recortada al capital pendiente.
- Prima única financiada → el capital del préstamo crece, y con él la cuota y el LTV.

---

## 8. Fuera de alcance (v1)

- Datos reales/históricos del Euríbor descargados de fuente externa.
- Subrogación y novación como escenarios completos.
- Fiscalidad (deducción por vivienda habitual, desgravación del plan de pensiones).
- Hipotecas multidivisa, de solo intereses o con sistema alemán/americano.
- Periodos de carencia (solo intereses) y redondeo al alza del índice.
- Reexpresión de importes en euros de hoy (descuento por inflación).
- Exportación a CSV o impresión de la comparativa y del cuadro de amortización.
- Simulación de invertir el sobrante de cuota mensual entre ofertas.

---

## 9. Plan de implementación

1. `FrontDBv3.ts` + migración `v2-v3` + bump de `CURRENT_DB_VERSION`.
2. `app/lib/mortgage/*` con funciones puras: amortización (con revisiones y amortizaciones anticipadas), TIR, vinculaciones por modo de coste, coste de oportunidad. Con las convenciones de [3.6](#36-convenciones-de-cálculo) como tests de referencia.
3. `useMortgageComparator.ts` (estado perezoso en el workspace + cálculo reactivo).
4. `templates.ts`: paleta de colores, escenarios semilla de Euríbor y las dos plantillas de ejemplo.
5. Página + ruta + entrada en `NavMain` + datos comunes + copy explicativo de las tres TAE.
6. Tabs y panel de hipoteca: condiciones → gastos → vinculaciones → amortizaciones anticipadas → coste de oportunidad.
7. Asistente `InvestmentBindingDialog` para fondos y planes de pensiones.
8. Panel de comparativa: tabla, ranking por TAE real y por patrimonio neto.
9. Gráficos y panel de "¿compensa cada vinculación?".
10. Cuadro de amortización.
11. `bun run lint:fix`, repaso de casos borde y contraste de `officialApr` con una FEIN real ([11.4](#114-producto)).

---

## 10. Preguntas abiertas

Todas cerradas a 2026-08-06. Se dejan con su respuesta para que quede el porqué de cada decisión.

1. ~~**Coste alternativo de mercado por vinculación**~~ — **RESUELTA (2026-08-05)**: se piden coste en el banco y coste fuera, y la TAE real usa el **neto**, que puede ser negativo. El coste fuera es "lo que gastaría en esto si no existiera la hipoteca", no un precio de mercado abstracto. Ver [2.2](#22-vinculaciones-bonificaciones).

2. ~~**Escenario de Euríbor**~~ — **RESUELTA (2026-08-06)**: global compartido por toda la comparativa, sin override por hipoteca. Tres escenarios predefinidos (actual / optimista / pesimista) más personalizado.

3. ~~**Seguro de vida — modo por defecto**~~ — **RESUELTA (2026-08-06)**: `annual` (prima anual simple), que es lo que viene en la oferta del banco. `permille` y `singlePremium` quedan a un clic en el selector de modo.

4. ~~**Prima única financiada**~~ — **RESUELTA (2026-08-05)**: modo `singlePremium` con `financed`, que suma la prima al capital y por tanto genera intereses.

5. ~~**Plan de pensiones y fondos como vinculación**~~ — **RESUELTA (2026-08-05)**: modo de coste `investment` con asistente propio (`InvestmentBindingDialog`), que simula dos carteras en paralelo (banco vs. alternativa) e imputa el lastre de comisiones y de peor gestión, más la inmovilización si el usuario no iba a invertir ese dinero. Ver [2.2.3](#223-modo-investment-fondos-y-planes-de-pensiones).

6. ~~**Amortizaciones anticipadas**~~ — **RESUELTA (2026-08-05)**: UI completa en v1, con pagos puntuales y recurrentes, modo reducir cuota / reducir plazo y su comisión.

7. ~~**Número de hipotecas**~~ — **RESUELTA (2026-08-06)**: sin límite y sin aviso.

8. ~~**Una comparativa por workspace o varias**~~ — **RESUELTA (2026-08-06)**: una por workspace, como el resto de herramientas. Para otra compra, otro workspace.

9. ~~**Valor presente / inflación**~~ — **RESUELTA (2026-08-06)**: no. Solo euros nominales; la TAE ya es una tasa comparable y la inflación añadiría otra hipótesis discutible.

10. ~~**Redondeo del índice**~~ — **RESUELTA (2026-08-06)**: no se modela.

11. ~~**Contraste con la TAE del banco**~~ — **RESUELTA (2026-08-06)**: no hay campo para la TAE del FEIN. Solo `officialApr` calculada con criterio Circular BdE 5/2012 y `realApr`. Campo `advertisedAprPct` eliminado del esquema.

12. ~~**Carencia**~~ — **RESUELTA (2026-08-06)**: no se modela.

13. ~~**Exportación**~~ — **RESUELTA (2026-08-06)**: no en v1. El workspace ya se exporta entero como JSON desde `useFrontDB`.

14. ~~**Dentro del tab de una hipoteca**~~ — **RESUELTA (2026-08-06)**: acordeón de secciones colapsables con resumen en cada cabecera, Condiciones y Vinculaciones abiertas por defecto, y tarjeta de resultado sticky al pie.

15. ~~**Posición de la pestaña Comparativa**~~ — **RESUELTA (2026-08-06)**: última, anclada a la derecha con `ml-auto` y destacada. Sigue siendo la activa por defecto cuando ya hay ≥ 2 hipotecas.

16. ~~**Capital y plazo**~~ — **RESUELTA (2026-08-05)**: comunes con override por hipoteca, y para que la comparación siga siendo justa se añade el **coste de oportunidad del capital no aportado** ([2.4](#24-coste-de-oportunidad-del-capital-no-aportado)): el ahorro que no va a la entrada se invierte en renta variable a un % configurable, y aparece un ranking secundario por patrimonio neto final.

17. ~~**Rentabilidad esperada de la renta variable**~~ — **RESUELTA (2026-08-06)**: solo común, sin override por hipoteca. Por coherencia se mueven también a los datos comunes el impuesto sobre plusvalías y el interruptor de la simulación, y el tipo `MortgageOpportunityCost` desaparece: todo lo que se muestra por hipoteca es derivado.

18. ~~**Sobrante de cuota mensual**~~ — **RESUELTA (2026-08-06)**: no se simula. La única simulación de coste de oportunidad es el capital que no va a la entrada, invertido de una sola vez en `t=0`. Campo `investMonthlyDifference` eliminado del esquema.

19. ~~**Métrica que decide la ganadora**~~ — **RESUELTA (2026-08-06)**: la **TAE real**. El patrimonio neto va como ranking secundario, con aviso cuando las dos ordenaciones discrepan.

20. ~~**Impuesto sobre plusvalías**~~ — **RESUELTA (2026-08-06)**: porcentaje único configurable, 19 % por defecto, en los datos comunes. Sin tramos del IRPF del ahorro.

---

## 11. Decisiones de detalle

Los flecos que quedaban abiertos, ya cerrados a 2026-08-07. Cada uno indica dónde ha quedado incorporado al cuerpo de la spec.

### 11.1 Modelo de datos

| Fleco | Decisión | Dónde |
|---|---|---|
| `paidByBank` como array autorreferente | Se sustituye por `amounts: Record<Key, number>` + `paidBy: Record<Key, 'client' \| 'bank'>`, con `openingFeePct` fuera del registro porque siempre lo paga el cliente | [2.3](#23-gastos-de-constitución), [4.2](#42-tipos-propuestos) |
| `earlyRepaymentFees` aplanado a tres campos | Listas de tramos `MortgageFeeTier[]` separadas para parcial y cancelación total, precargadas según `rateType` | [2.5](#25-comisiones-durante-la-vida-del-préstamo), [4.2](#42-tipos-propuestos) |
| Valores de las plantillas de ejemplo | Fijados: una fija al 2,60 % y una variable Eur+0,60 con cinco vinculaciones, sobre 200.000 € a 30 años | [6.4](#64-estados-vacíos) |
| Semilla de los escenarios de Euríbor | Derivados de `common.currentIndexPct` (±1 pp a 5 años). Ningún valor de mercado hardcodeado: no envejece | [3.2](#32-proyección-del-índice-euríbor) |
| Origen de `Mortgage.color` | Paleta fija de 8 colores en `templates.ts`, asignada por índice de forma rotatoria y editable. Se eligen tonos con contraste suficiente en claro y oscuro (las mismas variables OKLch del tema) | [5](#5-arquitectura-de-la-implementación) |
| Forma de la migración `v2-v3` | Fichero `FrontDBv3.ts` completo copiando los tipos de v2, y `'v2-v3'` como función identidad que solo cambia la versión. Se mantiene el patrón del proyecto: cada versión es un fichero autocontenido, sin reexportar del anterior | [4.1](#41-ficheros) |

### 11.2 Cálculo

| Fleco | Decisión | Dónde |
|---|---|---|
| Periodificación del coste de las vinculaciones | Doceavas partes mensuales; el crecimiento se aplica por anualidad | [3.6](#36-convenciones-de-cálculo) |
| Vigencia en años sobre cuadro mensual | Año `n` = meses `n·12+1 … (n+1)·12`; `toYear` exclusivo, igual que `FinancialFreedomExpense` | [3.6](#36-convenciones-de-cálculo) |
| `expectedReturnPct` duplicado | El del modo `investment` es `number \| null` y hereda de `common.expectedReturnPct` cuando es `null`, mostrándolo como valor heredado | [2.2.3](#223-modo-investment-fondos-y-planes-de-pensiones), [4.2](#42-tipos-propuestos) |
| `growthPct` compartido en modo `annual` | **No** se añade `marketGrowthPct`. Un único IPC para ambos lados es suficiente: la diferencia de ritmo entre la póliza del banco y la de mercado es una hipótesis sobre una hipótesis, y el usuario ya puede reflejarla ajustando `bankCost` | — |
| Definición de `aprWithoutBindings` | Se mantienen las obligatorias y se quitan las opcionales; en la UI se llama "TAE sin vinculaciones opcionales" | [3.3](#33-tae-real-métrica-principal) |
| Flujos incompletos en 3.3 | Lista de flujos reescrita con prima única financiada, aportaciones y rescate del modo `investment`, comisiones de amortización y deducción fiscal | [3.3](#33-tae-real-métrica-principal) |
| Renovación de `singlePremium` | Se **renueva automáticamente** al mismo importe cuando `coverYears` < plazo, con aviso en la UI ("la prima cubre 10 de los 30 años; se asume renovación al mismo precio"). Dejar de pagar infravaloraría el coste, que es el error que la herramienta existe para evitar | [2.2.1](#221-modelos-de-coste) |
| Amortizaciones anticipadas × `permille` | Orden del bucle mensual fijado: el coste de las vinculaciones se calcula con el capital pendiente ya actualizado | [3.6](#36-convenciones-de-cálculo) |
| Tope legal de la comisión de amortización | **Aviso suave**, sin bloquear. Hay ofertas anteriores a la LCCI legítimamente por encima, y la herramienta compara lo que hay, no lo que debería haber | [2.5](#25-comisiones-durante-la-vida-del-préstamo) |
| Convergencia de la TIR | Bisección en `[−0,9; 1,0]` + Newton, tolerancia `1e-10`, 100 iteraciones, `null` → `n/d` | [3.6](#36-convenciones-de-cálculo) |

### 11.3 UI

| Fleco | Decisión | Dónde |
|---|---|---|
| Rendimiento del recálculo | Se empieza sin debounce, con el patrón `requestAnimationFrame` + `isLoading` de los calculadores existentes. Si con 4–5 ofertas se nota al teclear, `refDebounced` de VueUse a 150 ms; el worker solo si eso tampoco basta. **Medir antes de optimizar** | [5](#5-arquitectura-de-la-implementación) |
| Estado vacío con 0 hipotecas | No se dibuja la barra de pestañas; tarjeta central con "Añadir hipoteca" y las plantillas | [6.4](#64-estados-vacíos) |
| Resumen de cada cabecera del acordeón | Definido para las cinco secciones | [6.2](#62-contenido-de-la-pestaña-de-una-hipoteca) |
| Tarjeta sticky en móvil | Versión de una línea por debajo de `sm`, desplegable al pulsar | [6.2](#62-contenido-de-la-pestaña-de-una-hipoteca) |
| Persistencia de la pestaña activa | Efímera, confirmado. Si molesta en uso, mover a `common` es un cambio de una línea | [6.4](#64-estados-vacíos) |
| Vinculación obligatoria desactivada | Sigue en el ranking, con aviso en la pestaña y en su fila de la tabla | [7](#7-casos-borde-a-cubrir) |

### 11.4 Producto

Lo único que no se puede cerrar sobre el papel:

- **Textos explicativos** — la herramienta enseña un concepto poco conocido (TAE oficial vs. real) y sin copy cuidado los números no se entienden. Se escriben durante la implementación, con tooltip en cada métrica y un párrafo de cabecera que explique la diferencia entre las tres TAE. Es parte del paso 4 del plan, no un extra.
- **Validación con una FEIN real** — criterio de aceptación de la v1: la `officialApr` calculada debe quedar a menos de **0,05 pp** de la TAE del documento para la misma oferta. Requiere una FEIN de verdad; si no cuadra, el fallo está en el modelo, no en el documento.
