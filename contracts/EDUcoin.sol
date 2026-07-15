// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EDUcoin
 * @author Dexter Vann - Vann Family Ventures LLC
 * @notice Education Utility Token - Beulah L5 Learning Rewards + Constructor Courses
 * @dev 500,000,000 total supply. Base Mainnet (Chain ID: 8453).
 *
 * ████████████████████████████████████████
 * █   MASHABAK GOLD TREE SEAL            █
 * █   Token: EDUcoin ($EDU)              █
 * █   Utility: Beulah L5 Learning        █
 * █   Owner: Dexter Vann / VFV LLC       █
 * █   Chain: Base Mainnet 8453           █
 * ████████████████████████████████████████
 */
contract EDUcoin is ERC20, ERC20Burnable, Ownable {

    // ─── Mashabak Identity Seal ───────────────────────────────────────────────
    string  public constant MASHABAK_SEAL  = "Mashabak_DexterVann_VFV_EDU_v1.0";
    string  public constant OWNER_ENTITY   = "Vann Family Ventures LLC";
    string  public constant UTILITY        = "Beulah L5 Learning Rewards + Constructor Courses";

    // ─── Token Config ─────────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY   = 500_000_000 * 10**18; // 500 Million

    // ─── Learning Reward State ────────────────────────────────────────────────
    mapping(address => uint256) public learnerRewards;
    uint256 public totalRewardsIssued;

    // ─── Events ───────────────────────────────────────────────────────────────
    event LearnerRewarded(address indexed learner, uint256 amount, string courseId);
    event CourseCompleted(address indexed learner, string courseId, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _owner)
        ERC20("EDUcoin", "EDU")
        Ownable(_owner)
    {
        _mint(_owner, TOTAL_SUPPLY);
    }

    // ─── Reward Learner ───────────────────────────────────────────────────────
    function rewardLearner(address learner, uint256 amount, string calldata courseId)
        external onlyOwner
    {
        require(learner != address(0), "EDU: invalid learner");
        require(amount > 0, "EDU: zero reward");
        learnerRewards[learner] += amount;
        totalRewardsIssued += amount;
        _transfer(owner(), learner, amount);
        emit LearnerRewarded(learner, amount, courseId);
        emit CourseCompleted(learner, courseId, block.timestamp);
    }

    // ─── View ─────────────────────────────────────────────────────────────────
    function getSeal() external pure returns (string memory) {
        return MASHABAK_SEAL;
    }

    function getTokenInfo() external pure returns (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        string memory utility,
        string memory seal
    ) {
        return ("EDUcoin", "EDU", TOTAL_SUPPLY, UTILITY, MASHABAK_SEAL);
    }
}
