// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RichDiamondRegistry
 * @author Dexter Vann - Vann Family Ventures LLC
 * @notice Tokenized Diamond Asset Registry - ERC721 NFT on Base Mainnet (Chain ID: 8453)
 * @dev Each diamond is uniquely identified by tokenId and carries GIA certification data.
 *      Mashabak Gold Tree Seal embedded as immutable metadata.
 *
 * ████████████████████████████████████████
 * █   MASHABAK GOLD TREE SEAL            █
 * █   Registry: RichDiamondRegistry      █
 * █   Standard: ERC721                   █
 * █   Owner: Dexter Vann / VFV LLC       █
 * █   Chain: Base Mainnet 8453           █
 * ████████████████████████████████████████
 */
contract RichDiamondRegistry is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {

    // ─── Mashabak Identity Seal ───────────────────────────────────────────────
    string  public constant MASHABAK_SEAL  = "Mashabak_DexterVann_VFV_RDR_v1.0";
    string  public constant OWNER_ENTITY   = "Vann Family Ventures LLC";

    // ─── Diamond Asset Schema ─────────────────────────────────────────────────
    enum VerificationStatus { Pending, Verified, Rejected }

    struct Diamond {
        string  tokenId;          // e.g., "RD-001"
        string  giaSerialNumber;  // e.g., "GIA-987654321"
        uint256 caratWeightX100;  // carat * 100 (e.g., 150 = 1.50 ct)
        string  cut;              // e.g., "Round Brilliant"
        string  clarity;          // e.g., "VVS1"
        address ownerWallet;
        VerificationStatus status;
        uint256 registeredAt;
        string  metadataURI;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 private _nextTokenId;
    mapping(uint256 => Diamond) public diamonds;
    mapping(string => uint256)  public giaToTokenId;

    // ─── Events ───────────────────────────────────────────────────────────────
    event DiamondRegistered(uint256 indexed tokenId, string giaSerial, address indexed owner);
    event DiamondVerified(uint256 indexed tokenId, VerificationStatus status);
    event DiamondTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _owner)
        ERC721("RichDiamond", "RD")
        Ownable(_owner)
    {}

    // ─── Register Diamond ─────────────────────────────────────────────────────
    function registerDiamond(
        string calldata giaSerial,
        uint256 caratWeightX100,
        string calldata cut,
        string calldata clarity,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        require(bytes(giaSerial).length > 0, "RDR: empty GIA serial");
        require(giaToTokenId[giaSerial] == 0, "RDR: already registered");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        diamonds[tokenId] = Diamond({
            tokenId: string(abi.encodePacked("RD-", _toString(tokenId))),
            giaSerialNumber: giaSerial,
            caratWeightX100: caratWeightX100,
            cut: cut,
            clarity: clarity,
            ownerWallet: msg.sender,
            status: VerificationStatus.Pending,
            registeredAt: block.timestamp,
            metadataURI: metadataURI
        });

        giaToTokenId[giaSerial] = tokenId;
        emit DiamondRegistered(tokenId, giaSerial, msg.sender);
        return tokenId;
    }

    // ─── Verify Diamond ───────────────────────────────────────────────────────
    function verifyDiamond(uint256 tokenId, VerificationStatus status) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "RDR: nonexistent token");
        diamonds[tokenId].status = status;
        emit DiamondVerified(tokenId, status);
    }

    // ─── Transfer Diamond ─────────────────────────────────────────────────────
    function transferDiamond(uint256 tokenId, address to) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "RDR: not owner");
        require(diamonds[tokenId].status == VerificationStatus.Verified, "RDR: not verified");
        diamonds[tokenId].ownerWallet = to;
        safeTransferFrom(msg.sender, to, tokenId);
        emit DiamondTransferred(tokenId, msg.sender, to);
    }

    // ─── View ─────────────────────────────────────────────────────────────────
    function getDiamond(uint256 tokenId) external view returns (Diamond memory) {
        return diamonds[tokenId];
    }

    function totalRegistered() external view returns (uint256) {
        return _nextTokenId;
    }

    function getSeal() external pure returns (string memory) {
        return MASHABAK_SEAL;
    }

    // ─── Overrides ────────────────────────────────────────────────────────────
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
