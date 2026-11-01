import {
  describe,
  expect,
  it
} from 'vitest';

import {
  asHex,
  decodeCredential,
  decodeIds,
  toBigInt
} from './contract';


describe(
  'SkillStamp contract helpers',
  () => {

    it(
      'accepts a valid H160 address',
      () => {

        const address =
          '0x1111111111111111111111111111111111111111';

        expect(
          asHex(address)
        ).toBe(
          address
        );
      }
    );


    it(
      'rejects an invalid H160 address',
      () => {

        expect(
          () =>
            asHex(
              '0x1234'
            )
        ).toThrow();
      }
    );


    it(
      'normalizes numeric values to bigint',
      () => {

        expect(
          toBigInt(7)
        ).toBe(
          7n
        );

        expect(
          toBigInt('8')
        ).toBe(
          8n
        );
      }
    );


    it(
      'decodes credential ID arrays',
      () => {

        expect(
          decodeIds(
            [
              1n,
              '2',
              3
            ]
          )
        ).toEqual(
          [
            1n,
            2n,
            3n
          ]
        );
      }
    );


    it(
      'decodes ABI tuple credentials',
      () => {

        const credential =
          decodeCredential([
            1n,
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222',
            'Polkadot Builder',
            'SkillStamp University',
            'bafy-test',
            1_700_000_000n,
            false
          ]);


        expect(
          credential.id
        ).toBe(
          1n
        );


        expect(
          credential.title
        ).toBe(
          'Polkadot Builder'
        );


        expect(
          credential.revoked
        ).toBe(
          false
        );
      }
    );


    it(
      'decodes named ABI credential objects',
      () => {

        const credential =
          decodeCredential({
            id:
              9n,

            student:
              '0x1111111111111111111111111111111111111111',

            issuer:
              '0x2222222222222222222222222222222222222222',

            title:
              'Hackathon Finalist',

            organization:
              'SkillStamp',

            metadataCid:
              '',

            issuedAt:
              1_700_000_000n,

            revoked:
              true
          });


        expect(
          credential.id
        ).toBe(
          9n
        );


        expect(
          credential.revoked
        ).toBe(
          true
        );
      }
    );
  }
);
