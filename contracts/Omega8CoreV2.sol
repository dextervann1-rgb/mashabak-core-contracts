// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Omega8Core.sol";

contract Omega8CoreV2 is Omega8Core {
    uint256 public maxTxAmount;
    mapping(address => bool) public isBlacklisted;

    event MaxTxAmountUpdated(uint256 newAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initializeV2(uint256 _maxTxAmount) public reinitializer(2) {
        maxTxAmount = _maxTxAmount;
    }

    function setMaxTxAmount(uint256 _maxTxAmount) external onlyOwner {
        maxTxAmount = _maxTxAmount;
        emit MaxTxAmountUpdated(_maxTxAmount);
    }

    function setBlacklistStatus(address account, bool status) external onlyOwner {
        isBlacklisted[account] = status;
    }
}
