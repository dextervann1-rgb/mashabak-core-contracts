// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VFV_Treasury
 * @author Dexter Vann - Vann Family Ventures LLC
 * @notice Treasury contract for Vann Family Ventures LLC on Base Mainnet (Chain ID: 8453)
 * @dev Mashabak Gold Tree Seal embedded as immutable on-chain metadata
 *
 * ████████████████████████████████████████
 * █   MASHABAK GOLD TREE SEAL            █
 * █   Owner: Dexter Vann                 █
 * █   Entity: Vann Family Ventures LLC   █
 * █   Chain: Base Mainnet 8453           █
 * █   Seal: MASHABAK_GOLD_TREE_v1.0      █
 * ████████████████████████████████████████
 */
contract VFV_Treasury is Ownable, ReentrancyGuard {

    // ─── Mashabak Identity Seal (immutable on-chain) ──────────────────────────
    string  public constant MASHABAK_SEAL   = "Mashabak_DexterVann_VFV_v1.0";
    string  public constant OWNER_ENTITY    = "Vann Family Ventures LLC";
    string  public constant OWNER_NAME      = "Dexter Vann";
    bytes   public constant SEAL_HASH       = hex"4D6173686162616B5F44657874657256616E6E5F564656";
    uint256 public constant CHAIN_ID        = 8453; // Base Mainnet

    // ─── Treasury State ───────────────────────────────────────────────────────
    address public immutable vaultWallet;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    mapping(address => uint256) public deposits;
    mapping(address => bool)    public authorizedSpenders;

    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed from, uint256 amount, uint256 timestamp);
    event Withdrawal(address indexed to, uint256 amount, string reason, uint256 timestamp);
    event SpenderAuthorized(address indexed spender, bool status);
    event VaultTransfer(address indexed vault, uint256 amount, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _owner, address _vault) Ownable(_owner) {
        require(_vault != address(0), "VFV_Treasury: invalid vault");
        vaultWallet = _vault;
    }

    // ─── Deposit ──────────────────────────────────────────────────────────────
    receive() external payable {
        _deposit(msg.sender, msg.value);
    }

    function deposit() external payable {
        _deposit(msg.sender, msg.value);
    }

    // ─── Withdraw ─────────────────────────────────────────────────────────────
    function withdraw(address payable to, uint256 amount, string calldata reason)
        external onlyOwner nonReentrant
    {
        require(amount <= address(this).balance, "VFV_Treasury: insufficient balance");
        totalWithdrawn += amount;
        emit Withdrawal(to, amount, reason, block.timestamp);
        (bool ok,) = to.call{value: amount}("");
        require(ok, "VFV_Treasury: transfer failed");
    }

    // ─── Vault Transfer (5% of balance) ──────────────────────────────────────
    function transferToVault() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance * 5 / 100;
        require(amount > 0, "VFV_Treasury: nothing to transfer");
        emit VaultTransfer(vaultWallet, amount, block.timestamp);
        (bool ok,) = payable(vaultWallet).call{value: amount}("");
        require(ok, "VFV_Treasury: vault transfer failed");
    }

    // ─── Spender Authorization ────────────────────────────────────────────────
    function setSpender(address spender, bool status) external onlyOwner {
        authorizedSpenders[spender] = status;
        emit SpenderAuthorized(spender, status);
    }

    // ─── View Functions ───────────────────────────────────────────────────────
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function getSeal() external pure returns (string memory) {
        return MASHABAK_SEAL;
    }

    function getIdentity() external pure returns (
        string memory seal,
        string memory entity,
        string memory ownerName,
        uint256 chainId
    ) {
        return (MASHABAK_SEAL, OWNER_ENTITY, OWNER_NAME, CHAIN_ID);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _deposit(address from, uint256 amount) internal {
        require(amount > 0, "VFV_Treasury: zero deposit");
        deposits[from] += amount;
        totalDeposited += amount;
        emit Deposit(from, amount, block.timestamp);
    }
}
