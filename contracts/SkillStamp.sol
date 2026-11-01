// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title SkillStamp
/// @notice Registry of verifiable and revocable academic credentials.
/// @dev Credentials are records bound to a student address.
///      They are intentionally non-transferable.
contract SkillStamp {

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

    address public immutable admin;

    uint256 public nextCredentialId = 1;

    mapping(address => bool)
        public authorizedIssuers;

    mapping(uint256 => Credential)
        private credentials;

    mapping(address => uint256[])
        private credentialsOf;


    error NotAdmin();

    error NotAuthorizedIssuer();

    error ZeroAddress();

    error EmptyTitle();

    error CredentialNotFound();

    error NotCredentialIssuer();

    error CredentialAlreadyRevoked();


    event IssuerUpdated(
        address indexed issuer,
        bool authorized
    );

    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed student,
        address indexed issuer,
        string title,
        string organization,
        string metadataCid
    );

    event CredentialRevoked(
        uint256 indexed credentialId,
        address indexed issuer
    );


    constructor(
        address initialIssuer
    ) {

        if (
            initialIssuer ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        admin =
            msg.sender;

        authorizedIssuers[
            initialIssuer
        ] = true;

        emit IssuerUpdated(
            initialIssuer,
            true
        );
    }


    function setIssuer(
        address issuer,
        bool authorized
    ) external {

        if (
            msg.sender != admin
        ) {
            revert NotAdmin();
        }

        if (
            issuer ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        authorizedIssuers[
            issuer
        ] = authorized;

        emit IssuerUpdated(
            issuer,
            authorized
        );
    }


    function issueCredential(
        address student,
        string calldata title,
        string calldata organization,
        string calldata metadataCid
    )
        external
        returns (
            uint256 credentialId
        )
    {

        if (
            !authorizedIssuers[
                msg.sender
            ]
        ) {
            revert NotAuthorizedIssuer();
        }

        if (
            student ==
            address(0)
        ) {
            revert ZeroAddress();
        }

        if (
            bytes(title).length ==
            0
        ) {
            revert EmptyTitle();
        }


        credentialId =
            nextCredentialId;


        nextCredentialId =
            credentialId + 1;


        credentials[
            credentialId
        ] = Credential({
            id:
                credentialId,

            student:
                student,

            issuer:
                msg.sender,

            title:
                title,

            organization:
                organization,

            metadataCid:
                metadataCid,

            issuedAt:
                uint64(
                    block.timestamp
                ),

            revoked:
                false
        });


        credentialsOf[
            student
        ].push(
            credentialId
        );


        emit CredentialIssued(
            credentialId,
            student,
            msg.sender,
            title,
            organization,
            metadataCid
        );
    }


    function revokeCredential(
        uint256 credentialId
    ) external {

        Credential storage credential =
            credentials[
                credentialId
            ];


        if (
            credential.id == 0
        ) {
            revert CredentialNotFound();
        }


        if (
            msg.sender !=
                credential.issuer &&
            msg.sender != admin
        ) {
            revert NotCredentialIssuer();
        }


        if (
            credential.revoked
        ) {
            revert CredentialAlreadyRevoked();
        }


        credential.revoked =
            true;


        emit CredentialRevoked(
            credentialId,
            msg.sender
        );
    }


    function getCredential(
        uint256 credentialId
    )
        external
        view
        returns (
            Credential memory
        )
    {

        Credential memory credential =
            credentials[
                credentialId
            ];


        if (
            credential.id == 0
        ) {
            revert CredentialNotFound();
        }


        return credential;
    }


    function getCredentialsOf(
        address student
    )
        external
        view
        returns (
            uint256[] memory
        )
    {

        return credentialsOf[
            student
        ];
    }


    function isValid(
        uint256 credentialId
    )
        external
        view
        returns (
            bool
        )
    {

        Credential memory credential =
            credentials[
                credentialId
            ];


        return
            credential.id != 0 &&
            !credential.revoked;
    }
}
