import type * as WalletSdk from '@parity/product-sdk/wallet';

import {
  devnet_asset_hub
} from '@parity/product-sdk-descriptors/devnet-asset-hub';

import {
  CONTRACT_ADDRESS,
  DERIVATION_INDEX,
  READ_RETRIES,
  READ_RETRY_MS,
  SIGN_TIMEOUT_MS
} from './config';

import {
  asHex,
  decodeCredential,
  decodeIds,
  skillStampAbi,
  toBigInt,
  type Credential,
  type Hex,
  type QueryResult,
  type SkillStampContract
} from './contract';


let signerManager:
  WalletSdk.SignerManager | null =
    null;

let account:
  WalletSdk.SignerAccount | null =
    null;

let contract:
  SkillStampContract | null =
    null;

let destroyChain:
  (() => void) | null =
    null;

let busy =
  false;

let issuer =
  false;


export interface ConnectedAccount {
  productId: string;
  ss58: string;
  h160: Hex;
  isIssuer: boolean;
  nextCredentialId: bigint;
}


export interface IssueInput {
  student: string;
  title: string;
  organization: string;
  metadataCid: string;
}


function describeError(
  error: unknown
): string {

  return error instanceof Error
    ? error.message
    : String(error);
}


function unwrap<T>(
  result: QueryResult<T>,
  label: string
): T {

  if (!result.success) {

    throw new Error(
      `${label}: ${
        describeError(
          result.value
        )
      }`
    );
  }

  return result.value;
}


function sleep(
  ms: number
): Promise<void> {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


function requireConnection(): {
  account: WalletSdk.SignerAccount;
  contract: SkillStampContract;
} {

  if (
    !account ||
    !contract
  ) {

    throw new Error(
      'Primero conecta Polkadot App.'
    );
  }

  return {
    account,
    contract
  };
}


function readOptions(
  currentAccount:
    WalletSdk.SignerAccount
) {

  return {
    origin:
      currentAccount.address,

    from:
      currentAccount.h160Address,

    at:
      'best' as const
  };
}


// =====================================================
// CONEXION
// =====================================================

export async function connect():
  Promise<ConnectedAccount> {

  if (busy) {

    throw new Error(
      'Hay otra operación en curso.'
    );
  }

  busy =
    true;

  try {

    const host =
      await import(
        '@parity/product-sdk/host'
      );


    if (
      !(await host.isInsideContainer())
    ) {

      throw new Error(
        'Abre SkillStamp dentro de Polkadot App.'
      );
    }


    const truApi =
      await host.getTruApi();


    if (!truApi) {

      throw new Error(
        'Polkadot App no expone TrUAPI.'
      );
    }


    const context =
      await truApi.system
        .getProductContext()
        .match(

          value =>
            value,

          error => {

            throw new Error(
              describeError(
                error
              )
            );
          }
        );


    const productId =
      context.productId;


    // Limpiar sesión anterior.

    destroyChain?.();

    destroyChain =
      null;


    signerManager?.destroy();

    signerManager =
      null;


    account =
      null;

    contract =
      null;

    issuer =
      false;


    const [
      chainSdk,
      contractsSdk,
      walletSdk
    ] =
      await Promise.all([

        import(
          '@parity/product-sdk/chain'
        ),

        import(
          '@parity/product-sdk/contracts'
        ),

        import(
          '@parity/product-sdk/wallet'
        )
      ]);


    // =================================================
    // PRODUCTS DEVNET ASSET HUB
    // =================================================

    const client =
      await chainSdk
        .createChainClient({
          chains: {
            assetHub:
              devnet_asset_hub
          }
        });


    destroyChain =
      () => {

        client.destroy();
      };


    const runtime =
      contractsSdk
        .createContractRuntimeFromClient(

          client.raw.assetHub,

          devnet_asset_hub,

          {
            at:
              'best'
          }
        );


    // =================================================
    // PRODUCT SIGNER
    // =================================================

    signerManager =
      new walletSdk
        .SignerManager({

          dappName:
            productId,

          ss58Prefix:
            42,

          hostTimeout:
            30_000,

          maxRetries:
            1,

          persistence:
            null
        });


    const connected =
      await signerManager
        .connect();


    if (
      typeof connected ===
        'object' &&
      connected !== null &&
      (
        connected as {
          ok?: unknown;
        }
      ).ok === false
    ) {

      throw (
        (
          connected as {
            error?: unknown;
          }
        ).error ??
        new Error(
          'Polkadot App rechazó la conexión.'
        )
      );
    }


    // =================================================
    // PRODUCT ACCOUNT
    // =================================================

    const accountResult =
      await signerManager
        .getProductAccount(
          productId,
          DERIVATION_INDEX
        );


    if (!accountResult.ok) {

      throw accountResult.error;
    }


    const currentAccount =
      accountResult.value;


    account =
      currentAccount;


    const accountH160 =
      asHex(
        currentAccount.h160Address
      );


    // =================================================
    // SMART CONTRACT ALLOWANCE
    // =================================================

    const allocation =
      await host
        .requestResourceAllocation([
          {
            tag:
              'SmartContractAllowance',

            value: {
              tag:
                'Index',

              value:
                DERIVATION_INDEX
            }
          }
        ]);


    if (!allocation.ok) {

      throw new Error(
        'No se pudo solicitar SmartContractAllowance: ' +
        describeError(
          allocation.error
        )
      );
    }


    if (
      allocation.value[0] ===
        'Rejected'
    ) {

      throw new Error(
        'Rechazaste el permiso de gas.'
      );
    }


    // =================================================
    // CONTRATO
    //
    // IMPORTANTE:
    // "as unknown as SkillStampContract"
    // queda EN LA MISMA LINEA del cierre ).
    // =================================================

    const createdContract =
      contractsSdk.createContract(
        runtime,
        asHex(
          CONTRACT_ADDRESS
        ),
        skillStampAbi,
        {
          defaultOrigin:
            currentAccount.address,

          defaultSigner:
            currentAccount.getSigner()
        }
      ) as unknown as SkillStampContract;


    contract =
      createdContract;


    // =================================================
    // EMISOR AUTORIZADO
    // =================================================

    const issuerResult =
      await createdContract
        .authorizedIssuers
        .query(

          accountH160,

          readOptions(
            currentAccount
          )
        );


    issuer =
      Boolean(
        unwrap(
          issuerResult,
          'authorizedIssuers'
        )
      );


    // =================================================
    // NEXT ID
    // =================================================

    const nextResult =
      await createdContract
        .nextCredentialId
        .query(

          readOptions(
            currentAccount
          )
        );


    const nextCredentialId =
      toBigInt(
        unwrap(
          nextResult,
          'nextCredentialId'
        )
      );


    return {

      productId,

      ss58:
        currentAccount.address,

      h160:
        accountH160,

      isIssuer:
        issuer,

      nextCredentialId
    };

  } finally {

    busy =
      false;
  }
}


// =====================================================
// LEER UNA CREDENCIAL
// =====================================================

export async function readCredential(
  id: bigint
): Promise<Credential> {

  const current =
    requireConnection();


  const options =
    readOptions(
      current.account
    );


  const [
    credentialResult,
    validResult
  ] =
    await Promise.all([

      current.contract
        .getCredential
        .query(
          id,
          options
        ),

      current.contract
        .isValid
        .query(
          id,
          options
        )
    ]);


  const decoded =
    decodeCredential(
      unwrap(
        credentialResult,
        'getCredential'
      )
    );


  const valid =
    Boolean(
      unwrap(
        validResult,
        'isValid'
      )
    );


  return {
    ...decoded,
    valid
  };
}


// =====================================================
// CREDENCIALES DE UNA CUENTA
// =====================================================

export async function readCredentialsOf(
  address: string
): Promise<Credential[]> {

  const current =
    requireConnection();


  const student =
    asHex(
      address.trim()
    );


  const result =
    await current.contract
      .getCredentialsOf
      .query(

        student,

        readOptions(
          current.account
        )
      );


  const ids =
    decodeIds(
      unwrap(
        result,
        'getCredentialsOf'
      )
    );


  ids.sort(
    (
      a,
      b
    ) => {

      if (a > b) {
        return -1;
      }

      if (a < b) {
        return 1;
      }

      return 0;
    }
  );


  const limited =
    ids.slice(
      0,
      30
    );


  return Promise.all(

    limited.map(
      id =>
        readCredential(
          id
        )
    )
  );
}


// =====================================================
// MIS CREDENCIALES
// =====================================================

export async function readMyCredentials():
  Promise<Credential[]> {

  const current =
    requireConnection();


  return readCredentialsOf(
    current.account
      .h160Address
  );
}


// =====================================================
// VALIDACION DE EMISION
// =====================================================

function validateIssue(
  input: IssueInput
): void {

  asHex(
    input.student.trim()
  );


  const title =
    input.title.trim();


  const organization =
    input.organization
      .trim();


  const metadataCid =
    input.metadataCid
      .trim();


  if (
    title.length < 2 ||
    title.length > 80
  ) {

    throw new Error(
      'La credencial debe tener entre 2 y 80 caracteres.'
    );
  }


  if (
    organization.length < 2 ||
    organization.length > 100
  ) {

    throw new Error(
      'La organización debe tener entre 2 y 100 caracteres.'
    );
  }


  if (
    metadataCid.length > 180
  ) {

    throw new Error(
      'El CID es demasiado largo.'
    );
  }
}


// =====================================================
// EMITIR
// =====================================================

export async function issueCredential(
  input: IssueInput
): Promise<Credential> {

  if (busy) {

    throw new Error(
      'Hay una firma en curso.'
    );
  }


  const current =
    requireConnection();


  if (!issuer) {

    throw new Error(
      'Esta Product Account no está autorizada como emisor.'
    );
  }


  validateIssue(
    input
  );


  const student =
    asHex(
      input.student.trim()
    );


  const title =
    input.title.trim();


  const organization =
    input.organization
      .trim();


  const metadataCid =
    input.metadataCid
      .trim();


  busy =
    true;


  try {

    const options =
      readOptions(
        current.account
      );


    // Leer ID antes de escribir.

    const nextResult =
      await current.contract
        .nextCredentialId
        .query(
          options
        );


    const predictedId =
      toBigInt(
        unwrap(
          nextResult,
          'nextCredentialId'
        )
      );


    // =================================================
    // 1. SIMULAR
    // =================================================

    const preview =
      await current.contract
        .issueCredential
        .query(

          student,

          title,

          organization,

          metadataCid,

          options
        );


    if (!preview.success) {

      throw new Error(
        'El contrato rechazó la emisión: ' +
        describeError(
          preview.value
        )
      );
    }


    // =================================================
    // 2. FIRMAR / TX
    // =================================================

    const result =
      await current.contract
        .issueCredential
        .tx(

          student,

          title,

          organization,

          metadataCid,

          {
            waitFor:
              'finalized',

            timeoutMs:
              SIGN_TIMEOUT_MS
          }
        );


    if (!result.ok) {

      throw new Error(
        describeError(
          result.error
        )
      );
    }


    // =================================================
    // 3. RELEER
    // =================================================

    for (
      let attempt = 0;
      attempt < READ_RETRIES;
      attempt += 1
    ) {

      if (
        attempt > 0
      ) {

        await sleep(
          READ_RETRY_MS
        );
      }


      try {

        const saved =
          await readCredential(
            predictedId
          );


        if (
          saved.student
            .toLowerCase() ===
          student
            .toLowerCase()
        ) {

          return saved;
        }

      } catch {

        // El RPC/Host puede ir
        // uno o dos bloques detrás.
      }
    }


    return readCredential(
      predictedId
    );

  } finally {

    busy =
      false;
  }
}


// =====================================================
// REVOCAR
// =====================================================

export async function revokeCredential(
  id: bigint
): Promise<Credential> {

  if (busy) {

    throw new Error(
      'Hay una firma en curso.'
    );
  }


  const current =
    requireConnection();


  busy =
    true;


  try {

    const options =
      readOptions(
        current.account
      );


    // =================================================
    // 1. SIMULAR
    // =================================================

    const preview =
      await current.contract
        .revokeCredential
        .query(
          id,
          options
        );


    if (!preview.success) {

      throw new Error(
        'El contrato rechazó la revocación: ' +
        describeError(
          preview.value
        )
      );
    }


    // =================================================
    // 2. FIRMAR / TX
    // =================================================

    const result =
      await current.contract
        .revokeCredential
        .tx(

          id,

          {
            waitFor:
              'finalized',

            timeoutMs:
              SIGN_TIMEOUT_MS
          }
        );


    if (!result.ok) {

      throw new Error(
        describeError(
          result.error
        )
      );
    }


    // =================================================
    // 3. RELEER
    // =================================================

    for (
      let attempt = 0;
      attempt < READ_RETRIES;
      attempt += 1
    ) {

      if (
        attempt > 0
      ) {

        await sleep(
          READ_RETRY_MS
        );
      }


      const updated =
        await readCredential(
          id
        );


      if (
        updated.revoked
      ) {

        return updated;
      }
    }


    return readCredential(
      id
    );

  } finally {

    busy =
      false;
  }
}
