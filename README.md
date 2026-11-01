# 🎓 SkillStamp

### Credenciales académicas verificables en Polkadot

**SkillStamp** es un registro descentralizado de credenciales diseñado para universidades, cursos, hackathones, organizaciones estudiantiles y comunidades de aprendizaje.

Permite que emisores autorizados creen **credenciales académicas verificables, no transferibles y revocables** directamente sobre Polkadot.

> **De una credencial que tienes que creer, a una credencial que cualquiera puede verificar.**

---

## 🚩 El problema

Actualmente muchos logros académicos siguen representándose mediante:

- certificados PDF;
- capturas de pantalla;
- correos electrónicos;
- diplomas impresos;
- registros dentro de bases de datos privadas.

Estos formatos son útiles para presentar información, pero no son una buena fuente de verdad.

Cuando un empleador, universidad, comité de becas u otra organización recibe una credencial, necesita responder:

> **¿Esta credencial realmente fue emitida por una organización autorizada, para este estudiante y continúa siendo válida?**

Un PDF puede modificarse o copiarse.

Una página de verificación puede desaparecer.

Una base de datos institucional depende completamente de la organización que la administra.

El verdadero valor no está en el archivo del certificado.

Está en la **afirmación verificable detrás de ese certificado**.

---

# 💡 La solución

SkillStamp separa la credencial de su representación visual.

En lugar de considerar un PDF como la fuente de verdad, SkillStamp registra la credencial directamente en un smart contract.

Un emisor autorizado puede:

1. seleccionar la dirección blockchain del estudiante;
2. definir la credencial;
3. indicar la organización emisora;
4. opcionalmente asociar evidencia mediante un CID;
5. firmar la emisión desde Polkadot App;
6. registrar la credencial on-chain.

Después, cualquier usuario puede verificar:

- el ID de la credencial;
- la dirección del estudiante;
- la dirección del emisor;
- la organización;
- la fecha de emisión;
- si la credencial continúa siendo válida;
- si fue revocada.

La interfaz no decide si una credencial es auténtica.

**El smart contract lo decide.**

---

# ⛓️ ¿Por qué blockchain?

SkillStamp no utiliza blockchain simplemente para almacenar datos.

Blockchain aporta valor porque una misma credencial debe poder ser verificada por diferentes participantes que **no comparten una misma base de datos privada**.

Por ejemplo:

```text
Universidad
    │
    │ emite
    ▼
Estudiante
    │
    │ presenta credencial
    ▼
Empresa / Universidad / Comité de becas
```

En un sistema tradicional, el verificador depende de la infraestructura controlada por el emisor.

Con SkillStamp:

```text
Emisor autorizado
       │
       │ transacción firmada
       ▼
   Smart Contract
       ▲
       │ verificación independiente
       │
   Verificador
```

El emisor continúa teniendo la autoridad para realizar la afirmación académica.

Lo que cambia es que el verificador ya no necesita confiar en un PDF o en una API privada para comprobar qué fue registrado.

### Sistema tradicional

```text
Verificador
    ↓
Portal institucional
    ↓
Base de datos institucional
```

### SkillStamp

```text
Verificador
    ↓
SkillStamp
    ↓
Polkadot
    ↓
Smart Contract
```

---

# 🟣 ¿Por qué Polkadot?

SkillStamp utiliza varias partes del ecosistema de aplicaciones de Polkadot.

## Product Accounts

SkillStamp interactúa mediante una **Product Account**.

La aplicación no necesita almacenar la clave privada del usuario.

Las firmas permanecen bajo el control de **Polkadot App**.

---

## Product SDK

El frontend utiliza `@parity/product-sdk` para:

- obtener el contexto del Product;
- utilizar `SignerManager`;
- acceder a la Product Account;
- solicitar `SmartContractAllowance`;
- conectarse con Asset Hub;
- consultar el contrato;
- ejecutar transacciones firmadas.

---

## Smart contract en Asset Hub

Las reglas y el estado de las credenciales son gestionados por `SkillStamp.sol`.

Contrato utilizado en el prototipo:

```text
0xc3e391bc6fa3fbbb486f51bc1a7b81964cb430be
```

---

## DotNS y Polkadot App

SkillStamp está diseñado para distribuirse como un Product dentro del ecosistema Polkadot mediante:

- identidad `.dot`;
- nombre del Product;
- descripción;
- icono;
- frontend distribuido mediante contenido direccionado por hash.

De esta manera, identidad, firma, ejecución del contrato y distribución de la aplicación forman parte del mismo ecosistema.

---

# 🧠 Lógica principal del sistema

Cada credencial contiene:

```solidity
struct Credential {
    uint256 id;
    address student;
    address issuer;
    string title;
    string organization;
    string metadataCid;
    uint64 issuedAt;
    bool revoked;
}
```

El contrato mantiene tres relaciones principales:

```solidity
mapping(address => bool) public authorizedIssuers;

mapping(uint256 => Credential) private credentials;

mapping(address => uint256[]) private credentialsOf;
```

Esto permite controlar quién puede emitir, buscar una credencial por ID y consultar todas las credenciales pertenecientes a un estudiante.

---

# 🔐 Reglas de seguridad

## Sólo emisores autorizados pueden crear credenciales

La autorización se valida directamente en el smart contract:

```solidity
if (!authorizedIssuers[msg.sender]) {
    revert NotAuthorizedIssuer();
}
```

Ocultar el botón **Emitir** en la interfaz no se considera una medida de seguridad.

Incluso si alguien intenta llamar directamente al contrato, debe cumplir la misma regla.

---

## Las credenciales no son transferibles

SkillStamp intencionalmente **no funciona como un NFT transferible**.

Un logro académico pertenece a la persona que lo obtuvo.

Cada credencial queda vinculada a:

```solidity
address student;
```

No existe:

```text
transfer()
approve()
transferFrom()
```

Una credencial SkillStamp no puede venderse ni transferirse a otra cuenta.

---

## Las credenciales no pueden editarse silenciosamente

Después de emitirse no existe una función que permita modificar:

- estudiante;
- emisor;
- título;
- organización;
- fecha de emisión.

Si existe un error, el flujo correcto es:

```text
Credencial incorrecta
        ↓
     Revocar
        ↓
Emitir nueva credencial
```

Esto mantiene un historial mucho más claro que modificar silenciosamente información dentro de una base de datos.

---

# ♻️ Revocación en lugar de eliminación

Existen situaciones reales en las que una credencial debe dejar de ser válida.

SkillStamp representa este proceso explícitamente:

```text
VÁLIDA
  │
  │ revokeCredential()
  ▼
REVOCADA
```

La credencial no desaparece.

Su existencia continúa siendo verificable, pero su estado cambia.

Esto permite diferenciar entre:

```text
La credencial nunca existió
```

y:

```text
La credencial existió pero fue revocada
```

---

# ✅ Verificación

Utilizando el ID de una credencial, SkillStamp consulta:

```solidity
getCredential(id)
```

y:

```solidity
isValid(id)
```

La validez se determina dentro del contrato:

```solidity
credential.id != 0 &&
!credential.revoked
```

El frontend únicamente muestra el resultado obtenido on-chain.

---

# 🛡️ Flujo defensivo de transacciones

SkillStamp no solicita inmediatamente una firma al usuario.

Cada operación que modifica el estado sigue este flujo:

```text
Simular
   ↓
Validar
   ↓
Solicitar firma
   ↓
Enviar transacción
   ↓
Esperar finalización
   ↓
Consultar nuevamente
```

Por ejemplo:

```text
issueCredential.query(...)
          │
          ▼
       ¿válida?
       /      \
     no        sí
     │          │
   error        ▼
          issueCredential.tx(...)
                   │
                   ▼
              finalized
                   │
                   ▼
          getCredential(...)
```

Esto evita solicitar firmas para operaciones que el contrato ya sabe que van a fallar.

---

# 🏗️ Arquitectura

```text
┌──────────────────────────────┐
│     Estudiante / Emisor      │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│        Polkadot App          │
│    Firma / Product Host      │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│          SkillStamp          │
│      TypeScript + Vite       │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│        Product SDK           │
│ SignerManager / Allowance    │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│ Products Devnet Asset Hub    │
└───────────────┬──────────────┘
                │
                ▼
┌──────────────────────────────┐
│       SkillStamp.sol         │
│ Registro de credenciales     │
└──────────────────────────────┘
```

---

# 🔄 Ciclo de vida de una credencial

```text
              Emisor autorizado
                     │
                     ▼
                ┌────────┐
                │ EMITIR │
                └───┬────┘
                    │
                    ▼
             ┌──────────────┐
             │  VERIFICADA  │
             └──────┬───────┘
                    │
             emisor / admin
                    │
                    ▼
               ┌─────────┐
               │ REVOCAR │
               └────┬────┘
                    │
                    ▼
             ┌──────────────┐
             │   REVOCADA   │
             └──────────────┘
```

No existe una transición inversa de `REVOCADA` a `VERIFICADA`.

Si se necesita reemplazar una credencial, debe emitirse una nueva.

---

# 🔏 Modelo de confianza

SkillStamp **no pretende eliminar toda forma de confianza**.

Una credencial educativa necesariamente depende de una institución o persona autorizada que realice una afirmación válida.

SkillStamp hace explícita esa frontera de confianza.

### El verificador continúa confiando en:

- el emisor autorizado;
- las reglas del smart contract;
- la red Polkadot.

### El verificador ya no necesita confiar en:

- un PDF;
- una captura de pantalla;
- el frontend para aplicar las reglas de autorización;
- una base de datos privada como única fuente de verdad;
- la aplicación para custodiar su clave privada.

---

# 🔒 Privacidad

La información almacenada en blockchain debe considerarse pública.

Por ese motivo SkillStamp no debería guardar directamente:

- nombres legales;
- matrículas;
- correos electrónicos;
- identificadores gubernamentales;
- documentos privados;
- calificaciones;
- información médica o sensible.

El MVP identifica principalmente a los estudiantes mediante direcciones blockchain.

El campo:

```solidity
string metadataCid;
```

permite en el futuro asociar evidencia mediante contenido direccionado por hash sin almacenar documentos grandes directamente dentro del contrato.

---

# 🧰 Tecnologías

### Frontend

- TypeScript
- Vite
- HTML/CSS
- Vitest
- Product SDK

### Polkadot

- Polkadot App
- Product Accounts
- Product SDK
- SmartContractAllowance
- Products Devnet
- Asset Hub
- DotNS

### Smart contract

- Solidity `0.8.28`

---

# 📁 Estructura del repositorio

```text
skillstamp-polkadot/
│
├── contracts/
│   └── SkillStamp.sol
│
├── game/
│   ├── assets/
│   │   └── icono.png
│   │
│   ├── src/
│   │   ├── main.ts
│   │   ├── skillstamp.css
│   │   │
│   │   └── skillstamp/
│   │       ├── abi.json
│   │       ├── app.ts
│   │       ├── config.ts
│   │       ├── contract.ts
│   │       ├── contract.test.ts
│   │       └── hub.ts
│   │
│   └── polkadot-app-deploy.config.mjs
│
├── docs/
├── README.md
├── ROADMAP.md
├── SECURITY.md
└── LICENSE
```

---

# 🚀 Ejecutar localmente

Instalar dependencias:

```bash
pnpm install
```

Comprobar TypeScript:

```bash
pnpm typecheck
```

Ejecutar pruebas:

```bash
pnpm test
```

Compilar:

```bash
pnpm build
```

Vista previa:

```bash
pnpm preview
```

La interfaz puede visualizarse desde un navegador convencional.

Las funciones de Product Account y firma requieren ejecutarse dentro del Host compatible de Polkadot.

---

# 🎬 Flujo de demostración

El ciclo completo de SkillStamp puede mostrarse en pocos pasos:

```text
1. Abrir SkillStamp
        ↓
2. Conectar Polkadot App
        ↓
3. Mostrar emisor autorizado
        ↓
4. Emitir "Polkadot Builder"
        ↓
5. Firmar la transacción
        ↓
6. Mostrar VERIFICADA
        ↓
7. Verificar el ID
        ↓
8. Revocar la credencial
        ↓
9. Verificar el mismo ID
        ↓
10. Mostrar REVOCADA
```

Esto permite que el valor de blockchain sea visible durante la demo y no solamente una explicación teórica.

---

# 🏆 Justificación para el hackathón

SkillStamp participa dentro del problema de **Credenciales y registros digitales**.

## Problema y utilidad

Las credenciales académicas son fáciles de mostrar, pero todavía existe mucha fricción para que terceras partes puedan verificarlas independientemente.

---

## Integración con Polkadot

Polkadot forma parte del modelo de confianza del producto, no sólo funciona como almacenamiento.

SkillStamp utiliza:

- Product Accounts;
- Product SDK;
- Asset Hub;
- smart contracts;
- SmartContractAllowance;
- DotNS;
- publicación como Product dentro de Polkadot App.

---

## Implementación técnica

El MVP implementa:

- emisores autorizados;
- IDs únicos de credenciales;
- credenciales no transferibles;
- contenido inmutable;
- verificación;
- revocación;
- simulación antes de enviar transacciones;
- espera de finalización;
- TypeScript;
- pruebas automatizadas.

---

## Experiencia de usuario

El ciclo blockchain principal se reduce a cuatro acciones comprensibles:

```text
Conectar
Emitir
Verificar
Revocar
```

La complejidad blockchain permanece debajo de la experiencia principal.

---

## Potencial de producto

La misma infraestructura puede utilizarse para:

- certificados universitarios;
- constancias de cursos;
- participación en hackathones;
- talleres;
- organizaciones estudiantiles;
- membresías;
- capacitación profesional;
- voluntariado;
- microcredenciales.

---

# 🗺️ Roadmap

Algunas mejoras futuras:

- almacenamiento de evidencia en Bulletin;
- verificación mediante QR;
- páginas públicas de verificación;
- registro institucional de emisores;
- gobernanza multisig;
- emisión masiva de credenciales;
- evidencia cifrada;
- compatibilidad con estándares de Verifiable Credentials;
- mecanismos de divulgación selectiva.

Consulta [`ROADMAP.md`](ROADMAP.md).

---

# ⚠️ Limitaciones actuales

SkillStamp es un MVP desarrollado para hackathón.

Actualmente:

- la administración de emisores depende del administrador del contrato;
- la carga de evidencia todavía no está automatizada;
- la metadata almacenada on-chain es pública;
- no existe emisión masiva;
- la identidad institucional todavía se representa mediante direcciones blockchain.

Estas limitaciones son explícitas y forman parte del roadmap del producto.

---

# 📜 Contrato

Contrato actual en Products Devnet:

```text
0xc3e391bc6fa3fbbb486f51bc1a7b81964cb430be
```

---

# ⚖️ Aviso

SkillStamp es un prototipo independiente desarrollado para un hackathón.

El contexto universitario y la identidad visual azul y oro se utilizan como inspiración para la demostración académica.

**SkillStamp no es un producto ni servicio oficial de la Universidad Autónoma de Nuevo León.**

---

# 📄 Licencia

MIT

---

## SkillStamp en una frase

> **SkillStamp utiliza Polkadot porque una credencial académica debería poder ser verificada independientemente por personas y organizaciones que no comparten la base de datos privada del emisor, mientras que la emisión y revocación permanecen restringidas criptográficamente a cuentas autorizadas.**

## SkillStamp in one sentence

> **SkillStamp uses Polkadot because academic credentials should be independently verifiable by parties that do not share the issuer's private database, while issuance and revocation remain cryptographically restricted to authorized accounts.**
