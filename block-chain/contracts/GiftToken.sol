// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GiftToken {
    string public name = "TonToken";
    string public symbol = "TON";

    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;

    address public owner;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        string description
    );

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(
        address to,
        uint256 amount,
        string calldata description
    ) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Zero address");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount, description);
        return true;
    }
}