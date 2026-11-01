# 🎓 SkillStamp

### Verifiable academic credentials on Polkadot

**SkillStamp** is a decentralized credential registry for universities, courses, hackathons, student organizations and learning communities.

It allows authorized issuers to create **verifiable, non-transferable and revocable academic credentials** directly on Polkadot.

> **From a credential you have to trust to a credential anyone can verify.**

---

## 🚩 The problem

Academic achievements are still commonly represented by:

- PDF certificates
- screenshots
- emails
- printed diplomas
- records stored in private institutional databases

These formats are useful for presentation, but they are poor sources of truth.

A recruiter, university, scholarship committee or external organization often has no independent way to answer:

> **Was this credential really issued by an authorized organization, to this person, and is it still valid?**

A PDF can be copied or modified.

A verification website can disappear.

An institutional database is controlled by the same organization that issues the credential.

The real value is not the certificate file itself.

The important information is the **claim behind it**.

---

# 💡 The solution

SkillStamp separates the credential from its visual representation.

Instead of considering a PDF the source of truth, SkillStamp registers the credential directly in a smart contract.

An authorized issuer can:

1. select a student blockchain address;
2. define the credential;
3. specify the issuing organization;
4. optionally reference evidence through a CID;
5. sign the issuance through Polkadot App;
6. register the credential on-chain.

Anyone can later verify:

- the credential ID;
- the student address;
- the issuer address;
- the organization;
- the issuance date;
- whether the credential is valid;
- whether it has been revoked.

The frontend does not decide whether a credential is authentic.

**The smart contract does.**

---

# ⛓️ Why blockchain?

SkillStamp does not use blockchain simply as a database.

Blockchain is useful because the same credential may need to be verified by parties that **do not share the same private database**.

For example:

```text
University
    │
    │ issues
    ▼
Student
    │
    │ presents credential
    ▼
Employer / Scholarship / Institution
```

In a traditional system, the verifier must trust a database controlled by the issuer.

With SkillStamp:

```text
Authorized issuer
       │
       │ signed transaction
       ▼
   Smart Contract
       ▲
       │ independent verification
       │
    Verifier
```

The issuer still has authority to make the academic claim.

What changes is that the verifier no longer needs to trust a PDF or a private API to know what was registered.

### Traditional credential

```text
Verifier
   ↓
Institution website
   ↓
Institution database
```

### SkillStamp credential

```text
Verifier
   ↓
SkillStamp
   ↓
Polkadot
   ↓
Smart contract
```

---

# 🟣 Why Polkadot?

SkillStamp uses several native parts of the Polkadot application ecosystem.

## Product Accounts

SkillStamp interacts through a Product Account.

The application does not need to store the user's private key.

Signing remains controlled through **Polkadot App**.

---

## Product SDK

The frontend uses `@parity/product-sdk` for:

- Product context
- `SignerManager`
- Product Account access
- `SmartContractAllowance`
- Asset Hub connection
- contract queries
- signed transactions

---

## Asset Hub smart contract

Credential rules and state are enforced by `SkillStamp.sol`.

Current hackathon deployment:

```text
0xc3e391bc6fa3fbbb486f51bc1a7b81964cb430be
```

---

## DotNS / Polkadot App

SkillStamp is designed to be distributed as a Polkadot Product with:

- `.dot` identity
- application metadata
- icon
- description
- content-addressed frontend deployment

This creates an application experience where identity, signing, contract execution and distribution belong to the same ecosystem.

---

# 🧠 Core system logic

Every credential contains:

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

The contract maintains three fundamental relationships:

```solidity
mapping(address => bool) public authorizedIssuers;

mapping(uint256 => Credential) private credentials;

mapping(address => uint256[]) private credentialsOf;
```

---

# 🔐 Security rules

## Only authorized issuers can issue credentials

Authorization is enforced by the smart contract:

```solidity
if (!authorizedIssuers[msg.sender]) {
    revert NotAuthorizedIssuer();
}
```

Hiding the **Issue** button in the frontend is not considered security.

Even someone calling the contract directly must satisfy the same rule.

---

## Credentials are non-transferable

SkillStamp is intentionally **not a transferable NFT system**.

An academic achievement belongs to the student who earned it.

Every credential permanently contains:

```solidity
address student;
```

There is no:

```text
transfer()
approve()
transferFrom()
```

A SkillStamp cannot be sold or transferred to another account.

---

## Credential contents cannot be silently edited

After issuance there is no function for modifying:

- student
- issuer
- title
- organization
- timestamp

If an error occurs, the correct flow is:

```text
old credential
      ↓
   revoke
      ↓
new credential
```

This preserves a much clearer history than silently replacing database values.

---

# ♻️ Revocation instead of deletion

Real credentials sometimes need to become invalid.

SkillStamp models this explicitly.

```text
VALID
  │
  │ revokeCredential()
  ▼
REVOKED
```

The credential is not erased.

Its existence remains visible while its validity changes.

This allows a verifier to distinguish:

```text
credential never existed
```

from:

```text
credential existed but was revoked
```

---

# ✅ Verification

Given a credential ID, SkillStamp reads:

```solidity
getCredential(id)
```

and:

```solidity
isValid(id)
```

Validity is defined by the contract as:

```solidity
credential.id != 0 &&
!credential.revoked
```

The frontend only presents this result.

---

# 🛡️ Defensive transaction flow

SkillStamp does not immediately ask the user to sign.

Every state-changing action follows:

```text
simulate
   ↓
validate
   ↓
request signature
   ↓
submit transaction
   ↓
wait for finalization
   ↓
read state again
```

For example:

```text
issueCredential.query(...)
          │
          ▼
       success?
       /      \
     no        yes
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

This prevents predictable contract failures from becoming unnecessary signing requests.

---

# 🏗️ Architecture

```text
┌─────────────────────────────┐
│      Student / Issuer       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Polkadot App         │
│   Signing / Product Host    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         SkillStamp          │
│     TypeScript + Vite       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Product SDK           │
│ SignerManager / Allowance   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Products Devnet Asset Hub   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       SkillStamp.sol        │
│ Credential Registry        │
└─────────────────────────────┘
```

---

# 🔄 Credential lifecycle

```text
              Authorized issuer
                      │
                      ▼
                ┌──────────┐
                │  ISSUE   │
                └────┬─────┘
                     │
                     ▼
             ┌───────────────┐
             │   VERIFIED    │
             │  CREDENTIAL   │
             └───────┬───────┘
                     │
              issuer / admin
                     │
                     ▼
                ┌──────────┐
                │  REVOKE  │
                └────┬─────┘
                     │
                     ▼
             ┌───────────────┐
             │    REVOKED    │
             └───────────────┘
```

There is intentionally no reverse transition from `REVOKED` to `VERIFIED`.

A replacement requires a new credential.

---

# 🔏 Trust model

SkillStamp does **not** claim that blockchain removes every form of trust.

An educational credential necessarily depends on an issuer making a legitimate claim.

SkillStamp therefore makes the trust boundary explicit.

### The verifier still trusts

- the authorized issuer;
- the smart contract rules;
- the underlying Polkadot network.

### The verifier does not need to trust

- the PDF;
- a screenshot;
- the frontend for authorization;
- a private verification database;
- the application with the user's private key.

This distinction is central to SkillStamp.

---

# 🔒 Privacy

Blockchain data should be considered public.

SkillStamp should therefore **not** store sensitive personal information such as:

- legal names
- student IDs
- email addresses
- government identifiers
- private documents
- grades
- medical information

The MVP primarily identifies students through blockchain addresses.

The optional:

```solidity
string metadataCid;
```

provides a future path for content-addressed evidence without storing large documents directly inside the smart contract.

---

# 🧰 Technology

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

# 📁 Repository structure

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

# 🚀 Run locally

Install dependencies:

```bash
pnpm install
```

Type check:

```bash
pnpm typecheck
```

Run tests:

```bash
pnpm test
```

Build:

```bash
pnpm build
```

Preview:

```bash
pnpm preview
```

The frontend can be previewed in a conventional browser.

Signing and Product Account functionality require the Polkadot Product Host.

---

# 🎬 Demo flow

The complete SkillStamp lifecycle can be demonstrated in a few steps:

```text
1. Open SkillStamp
        ↓
2. Connect Polkadot App
        ↓
3. Show authorized issuer
        ↓
4. Issue "Polkadot Builder"
        ↓
5. Sign transaction
        ↓
6. Show VERIFIED credential
        ↓
7. Verify credential ID
        ↓
8. Revoke credential
        ↓
9. Verify same ID again
        ↓
10. Show REVOKED
```

This makes the blockchain contribution visible during the demo instead of requiring a theoretical explanation.

---

# 🏆 Hackathon justification

SkillStamp targets the **Digital Credentials & Records** problem.

### Problem & Utility

Academic credentials are easy to display but unnecessarily difficult for independent third parties to verify.

### Polkadot Integration

Polkadot is part of the trust model, not just a storage layer.

SkillStamp uses Product Accounts, Product SDK, Asset Hub contracts, SmartContractAllowance and DotNS-compatible application deployment.

### Technical Implementation

The MVP implements:

- issuer authorization;
- unique credential IDs;
- non-transferability;
- immutable credential contents;
- verification;
- explicit revocation;
- pre-transaction simulation;
- finalized transactions;
- TypeScript validation and tests.

### User Experience

The main blockchain lifecycle is reduced to four understandable actions:

```text
Connect
Issue
Verify
Revoke
```

### Product Potential

The same infrastructure can support:

- university certificates;
- course completion;
- hackathon participation;
- workshops;
- student organizations;
- memberships;
- professional training;
- volunteer recognition;
- microcredentials.

---

# 🗺️ Roadmap

High-value future improvements include:

- Bulletin evidence storage
- QR verification
- public read-only verification pages
- institutional issuer registry
- multisig issuer governance
- batch credential issuance
- encrypted evidence
- interoperable Verifiable Credential export
- selective disclosure

See [`ROADMAP.md`](ROADMAP.md).

---

# ⚠️ Current limitations

SkillStamp is a hackathon MVP.

Current limitations include:

- issuer administration is centralized in the contract administrator;
- evidence upload is not yet automated;
- on-chain metadata is public;
- there is no batch issuance;
- institutional identity is currently represented by blockchain addresses.

These are explicit product limitations rather than hidden assumptions.

---

# 📜 Contract

Current Products Devnet deployment:

```text
0xc3e391bc6fa3fbbb486f51bc1a7b81964cb430be
```

---

# ⚖️ Disclaimer

SkillStamp is an independent hackathon prototype.

The UANL context and blue-and-gold visual identity are used as inspiration for the academic demonstration.

**SkillStamp is not an official product or service of Universidad Autónoma de Nuevo León.**

---

# 📄 License

MIT

---

## SkillStamp in one sentence

> **SkillStamp uses Polkadot because academic credentials should be independently verifiable by parties that do not share the issuer's private database, while issuance and revocation remain cryptographically restricted to authorized accounts.**
