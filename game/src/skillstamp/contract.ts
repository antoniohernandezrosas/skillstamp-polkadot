import type {
  AbiEntry
} from '@parity/product-sdk/contracts';

import abiJson from './abi.json';

export const skillStampAbi =
  abiJson as AbiEntry[];

export type Hex =
  `0x${string}`;

type Num =
  number |
  bigint |
  string;

export type QueryResult<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      value: unknown;
    };

export type ReadOptions = {
  origin?: string;
  from?: string;
  at?: 'best' | 'finalized';
};

export type TxOptions = {
  waitFor?:
    | 'best-block'
    | 'finalized';

  timeoutMs?: number;
};

type Read<
  Args extends unknown[],
  T
> = {
  query:
    (
      ...args: [
        ...Args,
        ReadOptions?
      ]
    ) =>
      Promise<QueryResult<T>>;
};

type Write<
  Args extends unknown[]
> =
  Read<Args, unknown> & {
    tx:
      (
        ...args: [
          ...Args,
          TxOptions?
        ]
      ) =>
        Promise<
          | {
              ok: true;
              value: unknown;
            }
          | {
              ok: false;
              error: unknown;
            }
        >;
  };

export interface SkillStampContract {
  authorizedIssuers:
    Read<[Hex], boolean>;

  nextCredentialId:
    Read<[], Num>;

  issueCredential:
    Write<
      [
        Hex,
        string,
        string,
        string
      ]
    >;

  revokeCredential:
    Write<[bigint]>;

  getCredential:
    Read<[bigint], unknown>;

  getCredentialsOf:
    Read<[Hex], unknown>;

  isValid:
    Read<[bigint], boolean>;
}

export interface Credential {
  id: bigint;
  student: Hex;
  issuer: Hex;
  title: string;
  organization: string;
  metadataCid: string;
  issuedAt: bigint;
  revoked: boolean;
  valid: boolean;
}

export function asHex(
  value: string
): Hex {

  if (
    !/^0x[a-fA-F0-9]{40}$/.test(
      value
    )
  ) {
    throw new Error(
      'La dirección H160 no es válida.'
    );
  }

  return value as Hex;
}

export function toBigInt(
  value: unknown
): bigint {

  if (
    typeof value === 'bigint'
  ) {
    return value;
  }

  if (
    typeof value === 'number'
  ) {
    return BigInt(value);
  }

  if (
    typeof value === 'string' &&
    value !== ''
  ) {
    return BigInt(value);
  }

  throw new Error(
    'Valor numérico inválido.'
  );
}

export function decodeIds(
  value: unknown
): bigint[] {

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    toBigInt
  );
}

function boolValue(
  value: unknown
): boolean {

  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true'
  );
}

export function decodeCredential(
  value: unknown
): Omit<
  Credential,
  'valid'
> {

  const tuple =
    Array.isArray(value)
      ? value
      : null;

  const object =
    typeof value === 'object' &&
    value !== null
      ? value as Record<
          string,
          unknown
        >
      : {};

  const get =
    (
      name: string,
      index: number
    ): unknown => {

      if (tuple) {
        return tuple[index];
      }

      return (
        object[name] ??
        object[String(index)]
      );
    };

  return {
    id:
      toBigInt(
        get('id', 0)
      ),

    student:
      asHex(
        String(
          get('student', 1)
        )
      ),

    issuer:
      asHex(
        String(
          get('issuer', 2)
        )
      ),

    title:
      String(
        get('title', 3) ?? ''
      ),

    organization:
      String(
        get('organization', 4) ?? ''
      ),

    metadataCid:
      String(
        get('metadataCid', 5) ?? ''
      ),

    issuedAt:
      toBigInt(
        get('issuedAt', 6)
      ),

    revoked:
      boolValue(
        get('revoked', 7)
      )
  };
}
