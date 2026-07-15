// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Samndex
 * @author Dexter Vann - Vann Family Ventures LLC
 * @notice Index / Creator Token for Sam Ecosystem - Base Mainnet (Chain ID: 8453)
 * @dev 100,000,000 total supply. Base Creator Token standard.
 *
 * ████████████████████████████████████████
 * █   MASHABAK GOLD TREE SEAL            █
 * █   Token: Samndex ($SAMNDEX)          █
 * █   Type: Index / Creator Token        █
 * █   Owner: Dexter Vann / VFV LLC       █
 * █   Chain: Base Mainnet 8453           █
 * ████████████████████████████████████████
 */
contract Samndex is ERC20, ERC20Burnable, Ownable {

    // ─── Mashabak Identity Seal ───────────────────────────────────────────────
    string  public constant MASHABAK_SEAL  = "Mashabak_DexterVann_VFV_SAMNDEX_v1.0";
    string  public constant OWNER_ENTITY   = "Vann Family Ventures LLC";
    string  public constant TOKEN_TYPE     = "Index / Creator Token - Sam Ecosystem";

    // ─── Token Config ─────────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY   = 100_000_000 * 10**18; // 100 Million

    // ─── Index Basket State ───────────────────────────────────────────────────
    struct IndexAsset {
        string  name;
        address tokenAddress;
        uint256 weight; // basis points (10000 = 100%)
        bool    active;
    }

    IndexAsset[] public indexBasket;
    uint256 public totalWeight;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AssetAdded(string name, address indexed tokenAddress, uint256 weight);
    event AssetUpdated(uint256 indexed index, uint256 newWeight);
    event IndexRebalanced(uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _owner)
        ERC20("Samndex", "SAMNDEX")
        Ownable(_owner)
    {
        _mint(_owner, TOTAL_SUPPLY);
    }

    // ─── Index Management ─────────────────────────────────────────────────────
    function addAsset(string calldata name, address tokenAddress, uint256 weight)
        external onlyOwner
    {
        require(tokenAddress != address(0), "SAMNDEX: invalid token");
        require(weight > 0, "SAMNDEX: zero weight");
        indexBasket.push(IndexAsset({ name: name, tokenAddress: tokenAddress, weight: weight, active: true }));
        totalWeight += weight;
        emit AssetAdded(name, tokenAddress, weight);
    }

    function rebalance(uint256[] calldata newWeights) external onlyOwner {
        require(newWeights.length == indexBasket.length, "SAMNDEX: length mismatch");
        uint256 newTotal = 0;
        for (uint256 i = 0; i < newWeights.length; i++) {
            indexBasket[i].weight = newWeights[i];
            newTotal += newWeights[i];
            emit AssetUpdated(i, newWeights[i]);
        }
        totalWeight = newTotal;
        emit IndexRebalanced(block.timestamp);
    }

    function getBasket() external view returns (IndexAsset[] memory) {
        return indexBasket;
    }

    // ─── View ─────────────────────────────────────────────────────────────────
    function getSeal() external pure returns (string memory) {
        return MASHABAK_SEAL;
    }

    function getTokenInfo() external pure returns (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        string memory tokenType,
        string memory seal
    ) {
        return ("Samndex", "SAMNDEX", TOTAL_SUPPLY, TOKEN_TYPE, MASHABAK_SEAL);
    }
}
