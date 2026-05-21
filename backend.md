# Prueba Técnica – Backend Developer

## Contexto

Estás desarrollando una API que administra estructuras jerárquicas como organizaciones, carpetas o categorías. La información llega desde integraciones externas, por lo que no siempre es consistente: puede venir incompleta, con nodos repetidos, ramas inactivas o incluso referencias circulares.

Tu objetivo es implementar una pequeña capa de dominio que permita analizar, consultar y modificar estas estructuras de forma segura.

## Tiempo estimado

90 a 120 minutos.

La prueba está pensada por fases. No esperamos que todas las personas lleguen al mismo punto. Nos importa tanto la calidad como la última fase estable que cada candidato logre completar.

## Dinámica de resolución

- Las fases son acumulativas.
- Priorizá cerrar bien una fase antes de pasar a la siguiente.
- Si no llegás a completar todas, entregá hasta donde hayas dejado una solución sólida.
- En la revisión técnica vamos a tomar como base la última fase estable que hayas entregado.

## Stack esperado

La resolución debe hacerse en Node.js, usando JavaScript o TypeScript.

No hace falta montar una API HTTP completa, pero la solución debe estar organizada como si fuera a integrarse a un backend real: código modular, errores claros, tests y documentación breve.

## Estructura base

Cada categoría tiene el siguiente formato:

```js
{
  id: 1,
  name: "Electrónica",
  active: true,
  subcategories: [
    {
      id: 2,
      name: "Computadoras",
      active: true,
      subcategories: [
        { id: 5, name: "Laptops", active: true, subcategories: [] },
        { id: 6, name: "Desktops", active: false, subcategories: [] }
      ]
    },
    { id: 3, name: "Celulares", active: true, subcategories: [] },
    { id: 4, name: "Accesorios", active: true, subcategories: [] }
  ]
}
```

## Datos y progresión de dificultad

Para `Fase 1` y `Fase 2` podés asumir una estructura válida.

A partir de `Fase 3`, los tests pueden incluir:

- `subcategories` faltante o con un valor inválido
- nodos `null` o `undefined`
- IDs duplicados
- nombres vacíos o con espacios extra
- ramas inactivas
- referencias circulares por reutilización de objetos en memoria
- estructuras grandes, con mucha profundidad

No hace falta micro-optimizar desde el minuto uno, pero si avanzás a las fases más altas vamos a mirar si el enfoque elegido resiste datos reales de backend.

## Fases

### Fase 1: Obtener rutas completas

Implementá una operación que devuelva todas las rutas completas de las categorías hoja activas.

Ejemplo:

```js
getActiveLeafPaths(structure)[
  // ->
  ("Electrónica/Accesorios", "Electrónica/Celulares", "Electrónica/Computadoras/Laptops")
];
```

Reglas:

- Sólo deben aparecer nodos hoja activos.
- Si un nodo o alguno de sus ancestros está inactivo, esa rama no debe aparecer.
- Las rutas deben devolverse ordenadas alfabéticamente.

### Fase 2: Buscar una categoría por ID

Implementá una operación para buscar una categoría por ID sin importar el nivel de profundidad.

La respuesta debe devolver:

- el nodo encontrado
- su path completo
- su profundidad
- el `parentId`
- si es hoja o no

Ejemplo:

```js
findCategoryById(structure, 5)

// ->
{
  node: { id: 5, name: "Laptops", active: true, subcategories: [] },
  path: "Electrónica/Computadoras/Laptops",
  depth: 2,
  parentId: 2,
  isLeaf: true
}
```

Si no encontrás el ID, definí un comportamiento claro y consistente.

### Fase 3: Analizar la estructura y reportar anomalías

Implementá una operación que reciba la estructura y devuelva un reporte con:

- todas las rutas completas de las categorías hoja activas
- cantidad total de nodos válidos procesados
- cantidad de nodos activos e inactivos
- profundidad máxima encontrada
- lista de anomalías detectadas

Reglas:

- Si detectás ciclos, no debés entrar en loop infinito.
- Si detectás nodos inválidos, debés reportarlos sin romper el procesamiento completo.
- Las anomalías deben informar, como mínimo:
  - código de error
  - `id` si existe
  - path parcial si se pudo reconstruir
  - detalle breve

Algunos códigos de error esperables:

- `INVALID_NODE`
- `INVALID_ID`
- `DUPLICATE_ID`
- `INVALID_NAME`
- `INVALID_SUBCATEGORIES`
- `NULL_CHILD`
- `CYCLE_DETECTED`

### Fase 4: Mover una categoría dentro del árbol

Implementá una operación para mover una categoría a otro padre.

Ejemplo:

```js
moveCategory(structure, 4, 2);
```

Reglas:

- No se puede mover la raíz.
- No se puede mover un nodo debajo de sí mismo ni debajo de uno de sus descendientes.
- No se puede mover a un padre inexistente.
- Si la estructura está en un estado inválido que impide la operación, debés rechazarla con un error claro.
- La operación debe ser inmutable: no debe mutar el árbol original.
- El nodo movido debe quedar al final de `subcategories` del nuevo padre.

## Requisitos técnicos

- Separá validación, recorrido y reglas de negocio de forma razonable.
- No entregues una única función monolítica.
- Agregá tests automatizados para cada fase que completes.
- No uses base de datos para resolver el ejercicio.
- Si completás `Fase 3` o `Fase 4`, documentá brevemente la complejidad temporal y espacial de las operaciones principales.
- Si completás `Fase 3` o `Fase 4`, explicá cómo evitás o mitigás problemas con árboles muy profundos.

## Entregables obligatorios

Tu entrega debe incluir:

- código fuente
- `README.md` con:
  - instrucciones de ejecución
  - supuestos tomados
  - fases completadas
  - decisiones principales
- `AI_USAGE.md`:
  - si usaste IA, indicá qué herramienta usaste, para qué y qué partes corregiste manualmente
  - si no usaste IA, indicá explícitamente que no la usaste
- tests de las fases que hayas completado

GIT: Preferimos ver al menos 2 commits significativos en lugar de un único commit final.
IA: El uso de IA no invalida la entrega. Lo que sí penaliza es ocultarlo o no poder explicar con precisión las decisiones tomadas sobre el código entregado.

## Cobertura mínima sugerida por fase

- `Fase 1`: caso base y una rama inactiva
- `Fase 2`: búsqueda exitosa y búsqueda sin resultado
- `Fase 3`: un caso con dato inválido y un caso con ciclo o duplicado
- `Fase 4`: un movimiento válido y un movimiento inválido

## Qué vamos a evaluar

- la última fase estable que alcanzaste
- la calidad de implementación dentro de esa fase
- claridad del modelado y de la API interna
- tests, supuestos y manejo de errores
- robustez frente a datos no ideales en fases avanzadas
- coherencia entre código, documentación y explicación técnica

## Revisión técnica

Después de la entrega va a haber una revisión corta donde te vamos a pedir una o más de estas cosas:

- explicar decisiones sobre la fase más alta que completaste
- extender una regla de negocio sobre la marcha
- corregir un bug chico
- agregar o ajustar un test

La revisión pesa tanto como la entrega. No evaluamos sólo que el resultado “parezca correcto”, sino que puedas sostenerlo técnicamente.

## Bonus

No es obligatorio, pero suma:

- usar TypeScript con tipos de dominio claros
- exponer alguna operación como endpoint HTTP
- incluir un pequeño script o benchmark para probar volumen
