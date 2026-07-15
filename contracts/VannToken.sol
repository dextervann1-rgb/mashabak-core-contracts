// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VannToken ($VANN)
 * @author Dexter Vann - Vann Family Ventures LLC
 * @notice VFV Flagship Token - Base Creator Coin on Base Mainnet (Chain ID: 8453)
 * @dev 1,000,000,000 total supply. 5% allocated to VFV vault on deploy.
 *      Mashabak Gold Tree Seal embedded as immutable metadata.
 *
 * ████████████████████████████████████████
 * █   MASHABAK GOLD TREE SEAL            █
 * █   Token: $VANN                       █
 * █   Owner: Dexter Vann / VFV LLC       █
 * █   Chain: Base Mainnet 8453           █
 * ████████████████████████████████████████
 */
contract VannToken is ERC20, ERC20Burnable, Ownable {

    // ─── Mashabak Identity Seal ───────────────────────────────────────────────
    string  public constant MASHABAK_SEAL  = "Mashabak_DexterVann_VFV_VANN_v1.0";
    string  public constant OWNER_ENTITY   = "Vann Family Ventures LLC";
    string  public constant OWNER_NAME     = "Dexter Vann";
    bytes   public constant SEAL_HASH      = hex"4D6173686162616B5F44657874657256616E6E5F564656";

    // ─── Token Config ─────────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY   = 1_000_000_000 * 10**18; // 1 Billion
    uint256 public constant VAULT_PERCENT  = 5;                       // 5% to vault
    address public immutable vaultWallet;

    // ─── Events ───────────────────────────────────────────────────────────────
    event VaultAllocation(address indexed vault, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _owner, address _vault)
        ERC20("Vann Token", "VANN")
        Ownable(_owner)
    {
        require(_vault != address(0), "VANN: invalid vault");
        vaultWallet = _vault;

        uint256 vaultAmount = TOTAL_SUPPLY * VAULT_PERCENT / 100;
        uint256 ownerAmount = TOTAL_SUPPLY - vaultAmount;

        _mint(_owner, ownerAmount);
        _mint(_vault, vaultAmount);

        emit VaultAllocation(_vault, vaultAmount);
    }

    // ─── View ─────────────────────────────────────────────────────────────────
    function getSeal() external pure returns (string memory) {
        return MASHABAK_SEAL;
    }

    function getTokenInfo() external pure returns (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        string memory entity,
        string memory seal
    ) {
        return ("Vann Token", "VANN", TOTAL_SUPPLY, OWNER_ENTITY, MASHABAK_SEAL);
    }
}
